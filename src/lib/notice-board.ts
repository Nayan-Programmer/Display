// Browser-safe types and helpers shared by the public display (/ and /display)
// and the staff administration page (/admin).

export const IMAGE_BUCKET = "display-images";

export type ImageKind = "datesheet" | "timetable";

/** Timetable content is either the everyday ("default") one or a "special" occasion one. */
export type Variant = "default" | "special";

/** Text entries can go to any panel of the board. */
export type NoticeKind = "announcement" | "hostel" | "programme" | "datesheet" | "timetable";

export const NOTICE_KINDS: NoticeKind[] = [
  "announcement",
  "hostel",
  "programme",
  "datesheet",
  "timetable",
];

export const NOTICE_KIND_LABEL: Record<NoticeKind, string> = {
  announcement: "Announcement",
  hostel: "Hostel announcement",
  programme: "Kirtan & spiritual programme",
  datesheet: "Date sheet",
  timetable: "Timetable",
};

export const MAX_NOTICE_TITLE = 120;
export const MAX_NOTICE_BODY = 1500;

export const IMAGE_KINDS: ImageKind[] = ["datesheet", "timetable"];

export const KIND_LABEL: Record<ImageKind, string> = {
  datesheet: "Date sheet",
  timetable: "Timetable",
};

export interface DisplayImage {
  id: string;
  kind: ImageKind;
  title: string;
  image_path: string;
  sort_order: number;
  created_at: string;
  variant: Variant;
  url: string;
}

export interface DisplayNotice {
  id: string;
  kind: NoticeKind;
  variant: Variant;
  title: string;
  body: string;
  sort_order: number;
  created_at: string;
}

export interface DisplaySettings {
  slideshow_enabled: boolean;
  slide_seconds: number;
  /** "special" shows the special-occasion timetable instead of the default one. */
  timetable_mode: Variant;
  /** Optional name of the occasion, e.g. "Annual Day". */
  special_label: string;
  /** Last day (YYYY-MM-DD, India time) the special timetable is shown; null = until switched off. */
  special_until: string | null;
}

export const MIN_SLIDE_SECONDS = 3;
export const MAX_SLIDE_SECONDS = 120;
export const DEFAULT_SETTINGS: DisplaySettings = {
  slideshow_enabled: false,
  slide_seconds: 10,
  timetable_mode: "default",
  special_label: "",
  special_until: null,
};

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export function clampSlideSeconds(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_SETTINGS.slide_seconds;
  return Math.min(MAX_SLIDE_SECONDS, Math.max(MIN_SLIDE_SECONDS, Math.round(value)));
}

export function isImageKind(value: string): value is ImageKind {
  return (IMAGE_KINDS as string[]).includes(value);
}

/** Stable display order: sort_order first, then upload time. */
export function sortImages<T extends { sort_order: number; created_at: string }>(images: T[]): T[] {
  return [...images].sort(
    (a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at),
  );
}

export function imagesOfKind(
  images: DisplayImage[],
  kind: ImageKind,
  variant?: Variant,
): DisplayImage[] {
  return sortImages(
    images.filter((image) => image.kind === kind && (!variant || image.variant === variant)),
  );
}

export function noticesOfKind(
  notices: DisplayNotice[],
  kind: NoticeKind,
  variant?: Variant,
): DisplayNotice[] {
  return sortImages(
    notices.filter((notice) => notice.kind === kind && (!variant || notice.variant === variant)),
  );
}

export function isVariant(value: string): value is Variant {
  return value === "default" || value === "special";
}

export function isNoticeKind(value: string): value is NoticeKind {
  return (NOTICE_KINDS as string[]).includes(value);
}

/** Today's date in India as YYYY-MM-DD. */
export function todayInIndia(now: Date = new Date()): string {
  return now.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

/** True when the special-occasion timetable has been switched on and has not expired. */
export function isSpecialModeOn(settings: DisplaySettings, today: string): boolean {
  if (settings.timetable_mode !== "special") return false;
  return !settings.special_until || today <= settings.special_until;
}

export interface ResolvedTimetable {
  variant: Variant;
  images: DisplayImage[];
  notices: DisplayNotice[];
  /** Name of the occasion when the special timetable is showing, otherwise "". */
  label: string;
}

/**
 * Chooses which timetable to show. The special one is used only while it is switched on (and not
 * past its end date) AND something has actually been added to it; otherwise the default timetable
 * is shown, so the board never ends up with an empty timetable by mistake.
 */
export function resolveTimetable(
  images: DisplayImage[],
  notices: DisplayNotice[],
  settings: DisplaySettings,
  today: string,
): ResolvedTimetable {
  const specialImages = imagesOfKind(images, "timetable", "special");
  const specialNotices = noticesOfKind(notices, "timetable", "special");
  const useSpecial =
    isSpecialModeOn(settings, today) && (specialImages.length > 0 || specialNotices.length > 0);
  if (useSpecial) {
    return {
      variant: "special",
      images: specialImages,
      notices: specialNotices,
      label: settings.special_label.trim(),
    };
  }
  return {
    variant: "default",
    images: imagesOfKind(images, "timetable", "default"),
    notices: noticesOfKind(notices, "timetable", "default"),
    label: "",
  };
}

export type Slide =
  | { type: "image"; id: string; label: string; title: string; url: string }
  | { type: "text"; id: string; label: string; title: string; body: string };

/**
 * Slideshow order: announcements, hostel announcements, programmes, date sheet, then the timetable that is currently in
 * force. Within a section, images come first and text entries after, each by sort order.
 */
export function buildSlides(
  images: DisplayImage[],
  notices: DisplayNotice[] = [],
  settings: DisplaySettings = DEFAULT_SETTINGS,
  today: string = todayInIndia(),
): Slide[] {
  const textSlide = (notice: DisplayNotice, label: string): Slide => ({
    type: "text",
    id: `notice-${notice.id}`,
    label,
    title: notice.title,
    body: notice.body,
  });
  const imageSlide = (image: DisplayImage, label: string): Slide => ({
    type: "image",
    id: `image-${image.id}`,
    label,
    title: image.title,
    url: image.url,
  });

  const timetable = resolveTimetable(images, notices, settings, today);
  const timetableLabel =
    timetable.variant === "special"
      ? timetable.label
        ? `Special timetable: ${timetable.label}`
        : "Special timetable"
      : KIND_LABEL.timetable;

  return [
    ...noticesOfKind(notices, "announcement").map((n) =>
      textSlide(n, NOTICE_KIND_LABEL.announcement),
    ),
    ...noticesOfKind(notices, "hostel").map((n) => textSlide(n, NOTICE_KIND_LABEL.hostel)),
    ...noticesOfKind(notices, "programme").map((n) => textSlide(n, NOTICE_KIND_LABEL.programme)),
    ...imagesOfKind(images, "datesheet").map((i) => imageSlide(i, KIND_LABEL.datesheet)),
    ...noticesOfKind(notices, "datesheet").map((n) => textSlide(n, KIND_LABEL.datesheet)),
    ...timetable.images.map((i) => imageSlide(i, timetableLabel)),
    ...timetable.notices.map((n) => textSlide(n, timetableLabel)),
  ];
}

export function nextIndex(current: number, length: number): number {
  return length <= 0 ? 0 : (current + 1) % length;
}

export function previousIndex(current: number, length: number): number {
  return length <= 0 ? 0 : (current - 1 + length) % length;
}

/** Returns an error message for an unusable file, or null when it can be uploaded. */
export function validateImageFile(file: {
  name: string;
  type: string;
  size: number;
}): string | null {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return `${file.name}: only JPG, PNG, WebP or GIF images can be uploaded.`;
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return `${file.name}: the image is larger than 10 MB.`;
  }
  return null;
}

export function titleFromFilename(name: string): string {
  return name
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .trim()
    .slice(0, 120);
}
