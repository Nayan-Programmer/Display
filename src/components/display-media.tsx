import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { BoardFooter, BoardHeader } from "@/components/board-chrome";
import {
  nextIndex,
  previousIndex,
  type DisplayImage,
  type DisplayNotice,
  type Slide,
} from "@/lib/notice-board";

/** Text entries (announcements, programmes, notes) shown inside a board panel. */
export function NoticeList({ notices }: { notices: DisplayNotice[] }) {
  if (notices.length === 0) return null;
  return (
    <ul className="mt-4 max-h-[26rem] space-y-3 overflow-y-auto">
      {notices.map((notice) => (
        <li key={notice.id} className="rounded-md border border-board-line bg-board-soft px-4 py-3">
          {notice.title && (
            <p className="font-display text-base font-semibold text-board-maroon">{notice.title}</p>
          )}
          <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">
            {notice.body}
          </p>
        </li>
      ))}
    </ul>
  );
}

/** Date sheet / timetable image shown inside a board panel. Several images rotate automatically. */
export function ImagePanel({ images, label }: { images: DisplayImage[]; label: string }) {
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const count = images.length;

  useEffect(() => {
    if (count < 2 || open) return;
    const timer = window.setInterval(() => setIndex((i) => nextIndex(i, count)), 8000);
    return () => window.clearInterval(timer);
  }, [count, open]);

  const current = images[Math.min(index, count - 1)];
  if (!current) return null;

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group relative block w-full overflow-hidden rounded-md border border-board-line bg-board-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        aria-label={`Enlarge ${label}`}
      >
        <img
          key={current.id}
          src={current.url}
          alt={current.title || label}
          className="mx-auto max-h-[26rem] w-full object-contain animate-in fade-in duration-500"
          loading="lazy"
        />
        <span className="absolute right-2 top-2 flex size-8 items-center justify-center rounded-full bg-card/90 text-board-maroon opacity-0 shadow transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
          <ZoomIn className="size-4" />
        </span>
      </button>

      {count > 1 && (
        <div
          className="mt-3 flex items-center justify-center gap-2"
          role="tablist"
          aria-label={`${label} pages`}
        >
          {images.map((image, i) => (
            <button
              key={image.id}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`${label} ${i + 1} of ${count}`}
              onClick={() => setIndex(i)}
              className={`h-2 rounded-full transition-all ${i === index ? "w-6 bg-board-maroon" : "w-2 bg-board-line hover:bg-board-gold"}`}
            />
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[96vw] border-0 bg-transparent p-0 shadow-none sm:max-w-[96vw] [&>button]:text-white">
          <DialogTitle className="sr-only">{current.title || label}</DialogTitle>
          <img
            src={current.url}
            alt={current.title || label}
            className="mx-auto max-h-[92vh] w-auto max-w-full rounded-md bg-white object-contain"
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * Slideshow of announcements, programmes, date sheet and timetable.
 * It deliberately uses the SAME background, header, footer and colours as the normal notice
 * board; only the middle panel changes, so starting the slideshow never changes the theme.
 */
export function Slideshow({
  slides,
  seconds,
  clock,
  date,
  fullscreen,
  onToggleFullscreen,
}: {
  slides: Slide[];
  seconds: number;
  clock: string;
  date: string;
  fullscreen: boolean;
  onToggleFullscreen: () => void;
}) {
  const count = slides.length;
  const [index, setIndex] = useState(0);
  const [cycle, setCycle] = useState(0);

  // Advance on a timer; restart it whenever the person (or an update) changes the slide.
  useEffect(() => {
    if (count < 2) return;
    const timer = window.setTimeout(() => setIndex((i) => nextIndex(i, count)), seconds * 1000);
    return () => window.clearTimeout(timer);
  }, [index, count, seconds, cycle]);

  useEffect(() => {
    if (index >= count) setIndex(0);
  }, [count, index]);

  // Warm the cache for the next image so changes are instant.
  useEffect(() => {
    if (count < 2) return;
    const upcoming = slides[nextIndex(index, count)];
    if (!upcoming || upcoming.type !== "image") return;
    const preload = new Image();
    preload.src = upcoming.url;
  }, [index, count, slides]);

  const position = Math.min(index, count - 1);
  const slide = slides[position];
  if (!slide) return null;

  const go = (next: number) => {
    setIndex(next);
    setCycle((c) => c + 1);
  };

  return (
    <main className="notice-board flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <div className="mx-auto flex min-h-0 w-full max-w-[1600px] flex-1 flex-col px-5 py-4 sm:px-8 sm:py-5 lg:px-12">
        <BoardHeader
          compact
          clock={clock}
          date={date}
          fullscreen={fullscreen}
          onToggleFullscreen={onToggleFullscreen}
        />

        <section aria-label="Slideshow" className="flex min-h-0 flex-1 py-4">
          <article className="board-panel relative flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-board-line px-5 py-3 sm:px-6">
              <h2 className="truncate text-base font-semibold text-board-maroon sm:text-lg">
                {slide.label}
              </h2>
              <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                {position + 1} / {count}
              </span>
            </div>

            <div className="group relative flex min-h-0 flex-1 items-center justify-center p-3 sm:p-5">
              {slide.type === "image" ? (
                <img
                  key={slide.id}
                  src={slide.url}
                  alt={slide.title || slide.label}
                  className="max-h-full max-w-full rounded object-contain animate-in fade-in duration-700"
                />
              ) : (
                <div
                  key={slide.id}
                  className="flex max-h-full w-full max-w-5xl flex-col items-center justify-center overflow-y-auto px-4 text-center animate-in fade-in duration-700"
                >
                  {slide.title && (
                    <h3 className="mb-5 font-display text-3xl font-semibold leading-tight text-board-maroon sm:text-5xl">
                      {slide.title}
                    </h3>
                  )}
                  <p className="whitespace-pre-line text-xl leading-relaxed text-foreground sm:text-3xl sm:leading-relaxed">
                    {slide.body}
                  </p>
                </div>
              )}
              {count > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => go(previousIndex(index, count))}
                    aria-label="Previous slide"
                    className="absolute left-2 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-card/90 text-board-maroon opacity-0 shadow transition-opacity hover:opacity-100 focus-visible:opacity-100 group-hover:opacity-60"
                  >
                    <ChevronLeft className="size-6" />
                  </button>
                  <button
                    type="button"
                    onClick={() => go(nextIndex(index, count))}
                    aria-label="Next slide"
                    className="absolute right-2 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-card/90 text-board-maroon opacity-0 shadow transition-opacity hover:opacity-100 focus-visible:opacity-100 group-hover:opacity-60"
                  >
                    <ChevronRight className="size-6" />
                  </button>
                </>
              )}
            </div>

            {count > 1 && (
              <div className="h-1 bg-board-line" aria-hidden="true">
                <div
                  key={`${slide.id}-${cycle}`}
                  className="h-full origin-left bg-board-gold"
                  style={{ animation: `slide-progress ${seconds}s linear forwards` }}
                />
              </div>
            )}
          </article>
        </section>

        <BoardFooter />
      </div>
    </main>
  );
}
