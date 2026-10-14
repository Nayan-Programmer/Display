import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  DEFAULT_SETTINGS,
  IMAGE_BUCKET,
  clampSlideSeconds,
  isImageKind,
  isNoticeKind,
  isVariant,
  sortImages,
  type DisplayImage,
  type DisplayNotice,
  type DisplaySettings,
} from "@/lib/notice-board";

export interface DisplayData {
  settings: DisplaySettings;
  images: DisplayImage[];
  notices: DisplayNotice[];
}

export const DISPLAY_QUERY_KEY = ["display-data"] as const;

export function publicImageUrl(path: string): string {
  return supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path).data.publicUrl;
}

export async function fetchDisplayData(): Promise<DisplayData> {
  const [settingsResult, imagesResult, noticesResult] = await Promise.all([
    supabase
      .from("display_settings")
      .select("slideshow_enabled, slide_seconds, timetable_mode, special_label, special_until")
      .eq("id", 1)
      .maybeSingle(),
    supabase.from("display_images").select("*"),
    supabase.from("display_notices").select("*"),
  ]);
  if (settingsResult.error) throw settingsResult.error;
  if (imagesResult.error) throw imagesResult.error;
  if (noticesResult.error) throw noticesResult.error;

  const settings: DisplaySettings = settingsResult.data
    ? {
        slideshow_enabled: settingsResult.data.slideshow_enabled,
        slide_seconds: clampSlideSeconds(settingsResult.data.slide_seconds),
        timetable_mode: isVariant(settingsResult.data.timetable_mode)
          ? settingsResult.data.timetable_mode
          : "default",
        special_label: settingsResult.data.special_label ?? "",
        special_until: settingsResult.data.special_until ?? null,
      }
    : DEFAULT_SETTINGS;

  const images: DisplayImage[] = sortImages(imagesResult.data ?? [])
    .filter((row) => isImageKind(row.kind))
    .map((row) => ({
      id: row.id,
      kind: row.kind as DisplayImage["kind"],
      title: row.title,
      image_path: row.image_path,
      sort_order: row.sort_order,
      created_at: row.created_at,
      variant: isVariant(row.variant) ? row.variant : "default",
      url: publicImageUrl(row.image_path),
    }));

  const notices: DisplayNotice[] = sortImages(noticesResult.data ?? [])
    .filter((row) => isNoticeKind(row.kind))
    .map((row) => ({
      id: row.id,
      kind: row.kind as DisplayNotice["kind"],
      variant: isVariant(row.variant) ? row.variant : "default",
      title: row.title,
      body: row.body,
      sort_order: row.sort_order,
      created_at: row.created_at,
    }));

  return { settings, images, notices };
}

/** Public display data. Refreshes every 30 s so a kiosk screen follows the admin without a reload. */
export function useDisplayData() {
  return useQuery({
    queryKey: DISPLAY_QUERY_KEY,
    queryFn: fetchDisplayData,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    retry: 1,
  });
}
