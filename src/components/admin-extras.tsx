import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { DISPLAY_QUERY_KEY } from "@/lib/display-data";
import {
  MAX_NOTICE_BODY,
  MAX_NOTICE_TITLE,
  NOTICE_KINDS,
  NOTICE_KIND_LABEL,
  noticesOfKind,
  todayInIndia,
  type DisplayNotice,
  type DisplaySettings,
  type NoticeKind,
  type Variant,
} from "@/lib/notice-board";

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error)
    return String((error as { message: unknown }).message);
  return "Something went wrong. Please try again.";
}

/* ------------------------------------------------------------------------------------------ */
/* Default / special-occasion timetable switch                                                */
/* ------------------------------------------------------------------------------------------ */

export function TimetableModeCard({
  settings,
  hasSpecialContent,
  loading,
}: {
  settings: DisplaySettings | undefined;
  hasSpecialContent: boolean;
  loading: boolean;
}) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<Variant>("default");
  const [label, setLabel] = useState("");
  const [until, setUntil] = useState("");

  // Follow the saved settings whenever they load or change.
  useEffect(() => {
    if (!settings) return;
    setMode(settings.timetable_mode);
    setLabel(settings.special_label);
    setUntil(settings.special_until ?? "");
  }, [settings?.timetable_mode, settings?.special_label, settings?.special_until]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = useMutation({
    mutationFn: async () => {
      if (mode === "special" && until && until < todayInIndia()) {
        throw new Error("The end date is in the past. Choose today or a later date.");
      }
      const { data, error } = await supabase
        .from("display_settings")
        .update({
          timetable_mode: mode,
          special_label: label.trim().slice(0, 80),
          special_until: mode === "special" && until ? until : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", 1)
        .select();
      if (error) throw error;
      if (!data || data.length === 0) throw new Error("The settings could not be saved.");
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: DISPLAY_QUERY_KEY });
      toast.success(
        mode === "special"
          ? "Special occasion timetable is now on the display."
          : "The default timetable is now on the display.",
      );
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const option = (value: Variant, title: string, hint: string) => (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 text-sm ${mode === value ? "border-board-maroon bg-board-tint" : "border-board-line bg-card"}`}
    >
      <input
        type="radio"
        name="timetable-mode"
        className="mt-1"
        checked={mode === value}
        onChange={() => setMode(value)}
      />
      <span>
        <span className="block font-medium">{title}</span>
        <span className="block text-xs text-muted-foreground">{hint}</span>
      </span>
    </label>
  );

  return (
    <section className="board-panel p-5 sm:p-6" aria-labelledby="mode-heading">
      <h2 id="mode-heading" className="text-lg font-semibold">
        Timetable on the display
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        The default timetable is shown every day. For a special occasion, add a special timetable
        below and switch it on here; switch back when the occasion is over.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {option("default", "Default timetable", "Everyday timetable")}
        {option("special", "Special occasion timetable", "Replaces the default until switched off")}
      </div>

      {mode === "special" && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="special-label">Occasion name (optional)</Label>
            <Input
              id="special-label"
              placeholder="e.g. Annual Day"
              maxLength={80}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="special-until">Switch back automatically after (optional)</Label>
            <Input
              id="special-until"
              type="date"
              min={todayInIndia()}
              value={until}
              onChange={(e) => setUntil(e.target.value)}
            />
          </div>
          {!hasSpecialContent && (
            <p className="text-sm text-destructive sm:col-span-2">
              Nothing has been added to the special timetable yet, so the default timetable will
              keep showing. Add a special timetable image or text below.
            </p>
          )}
        </div>
      )}

      <div className="mt-4 flex items-center gap-3">
        <Button disabled={loading || save.isPending} onClick={() => save.mutate()}>
          {save.isPending && <Loader2 className="animate-spin" />}
          Save timetable choice
        </Button>
        <span className="text-xs text-muted-foreground">
          The display refreshes by itself within about 30 seconds.
        </span>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------------------------------ */
/* Text entries                                                                               */
/* ------------------------------------------------------------------------------------------ */

interface Group {
  key: string;
  kind: NoticeKind;
  variant: Variant;
  title: string;
}

const GROUPS: Group[] = [
  { key: "announcement", kind: "announcement", variant: "default", title: "Announcements" },
  {
    key: "programme",
    kind: "programme",
    variant: "default",
    title: "Kirtan & spiritual programmes",
  },
  { key: "datesheet", kind: "datesheet", variant: "default", title: "Date sheet notes" },
  {
    key: "timetable-default",
    kind: "timetable",
    variant: "default",
    title: "Default timetable text",
  },
  {
    key: "timetable-special",
    kind: "timetable",
    variant: "special",
    title: "Special occasion timetable text",
  },
];

export function TextNoticesSection({ notices }: { notices: DisplayNotice[] }) {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: DISPLAY_QUERY_KEY });

  const [kind, setKind] = useState<NoticeKind>("announcement");
  const [variant, setVariant] = useState<Variant>("default");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [toDelete, setToDelete] = useState<DisplayNotice | null>(null);

  const add = useMutation({
    mutationFn: async () => {
      const text = body.trim();
      if (!text) throw new Error("Please type the text to show on the display.");
      const effectiveVariant: Variant = kind === "timetable" ? variant : "default";
      const nextOrder =
        noticesOfKind(notices, kind, effectiveVariant).reduce(
          (max, n) => Math.max(max, n.sort_order),
          0,
        ) + 1;
      const { error } = await supabase.from("display_notices").insert({
        kind,
        variant: effectiveVariant,
        title: title.trim().slice(0, MAX_NOTICE_TITLE),
        body: text.slice(0, MAX_NOTICE_BODY),
        sort_order: nextOrder,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setTitle("");
      setBody("");
      toast.success("Text added to the display.");
      void refresh();
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const remove = useMutation({
    mutationFn: async (notice: DisplayNotice) => {
      const { data, error } = await supabase
        .from("display_notices")
        .delete()
        .eq("id", notice.id)
        .select();
      if (error) throw error;
      if (!data || data.length === 0) throw new Error("The text could not be deleted.");
    },
    onSuccess: () => {
      toast.success("Text deleted.");
      void refresh();
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const move = useMutation({
    mutationFn: async ({
      list,
      index,
      direction,
    }: {
      list: DisplayNotice[];
      index: number;
      direction: -1 | 1;
    }) => {
      const a = list[index];
      const b = list[index + direction];
      if (!a || !b) return;
      const first = Math.min(a.sort_order, b.sort_order);
      const second = first + 1;
      const results = await Promise.all([
        supabase
          .from("display_notices")
          .update({ sort_order: direction === -1 ? first : second })
          .eq("id", a.id),
        supabase
          .from("display_notices")
          .update({ sort_order: direction === -1 ? second : first })
          .eq("id", b.id),
      ]);
      const failed = results.find((r) => r.error);
      if (failed?.error) throw failed.error;
    },
    onSuccess: () => void refresh(),
    onError: (error) => toast.error(errorMessage(error)),
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    add.mutate();
  }

  return (
    <section className="board-panel p-5 sm:p-6" aria-labelledby="text-heading">
      <h2 id="text-heading" className="text-lg font-semibold">
        Text entries
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Type a notice instead of uploading an image. It appears in the chosen panel and in the
        slideshow.
      </p>

      <form onSubmit={submit} className="mt-4 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="notice-kind">Show in</Label>
            <select
              id="notice-kind"
              value={kind}
              onChange={(e) => setKind(e.target.value as NoticeKind)}
              className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm"
            >
              {NOTICE_KINDS.map((k) => (
                <option key={k} value={k}>
                  {NOTICE_KIND_LABEL[k]}
                </option>
              ))}
            </select>
          </div>
          {kind === "timetable" && (
            <div className="space-y-2">
              <Label htmlFor="notice-variant">Which timetable</Label>
              <select
                id="notice-variant"
                value={variant}
                onChange={(e) => setVariant(e.target.value as Variant)}
                className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm"
              >
                <option value="default">Default timetable</option>
                <option value="special">Special occasion timetable</option>
              </select>
            </div>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="notice-title">Heading (optional)</Label>
          <Input
            id="notice-title"
            maxLength={MAX_NOTICE_TITLE}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="notice-body">Text</Label>
          <Textarea
            id="notice-body"
            rows={5}
            maxLength={MAX_NOTICE_BODY}
            placeholder={
              "Type the text to show. Press Enter for a new line.\nExample: 9:00 – 9:40  Assembly"
            }
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            {body.length} / {MAX_NOTICE_BODY} characters
          </p>
        </div>
        <Button type="submit" disabled={add.isPending}>
          {add.isPending ? <Loader2 className="animate-spin" /> : <Plus />}
          Add text
        </Button>
      </form>

      <div className="mt-6 space-y-5">
        {GROUPS.map((group) => {
          const list = noticesOfKind(notices, group.kind, group.variant);
          if (list.length === 0) return null;
          return (
            <div key={group.key}>
              <h3 className="text-sm font-semibold text-board-maroon">{group.title}</h3>
              <ul className="mt-2 space-y-2">
                {list.map((notice, index) => (
                  <li
                    key={notice.id}
                    className="flex items-start justify-between gap-3 rounded-md border border-board-line bg-card p-3"
                  >
                    <div className="min-w-0">
                      {notice.title && <p className="text-sm font-semibold">{notice.title}</p>}
                      <p className="line-clamp-3 whitespace-pre-line text-sm text-muted-foreground">
                        {notice.body}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        aria-label="Move earlier"
                        disabled={index === 0 || move.isPending}
                        onClick={() => move.mutate({ list, index, direction: -1 })}
                      >
                        <ArrowUp className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        aria-label="Move later"
                        disabled={index === list.length - 1 || move.isPending}
                        onClick={() => move.mutate({ list, index, direction: 1 })}
                      >
                        <ArrowDown className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-destructive hover:text-destructive"
                        aria-label="Delete this text"
                        onClick={() => setToDelete(notice)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
        {notices.length === 0 && (
          <p className="text-sm text-muted-foreground">No text entries added yet.</p>
        )}
      </div>

      <AlertDialog open={toDelete !== null} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this text?</AlertDialogTitle>
            <AlertDialogDescription>
              It will be removed from the display and the slideshow. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (toDelete) remove.mutate(toDelete);
                setToDelete(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
