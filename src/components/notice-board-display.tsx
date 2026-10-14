import { useEffect, useMemo, useState } from "react";
import {
  BedDouble,
  CalendarDays,
  Clock3,
  CloudSun,
  GraduationCap,
  Sparkles,
  Sun,
  Volume2,
} from "lucide-react";
import { BoardFooter, BoardHeader } from "@/components/board-chrome";
import { ImagePanel, NoticeList, Slideshow } from "@/components/display-media";
import { useDisplayData } from "@/lib/display-data";
import {
  DEFAULT_SETTINGS,
  buildSlides,
  imagesOfKind,
  noticesOfKind,
  resolveTimetable,
  todayInIndia,
} from "@/lib/notice-board";

function PanelHeading({
  icon: Icon,
  title,
  accent,
}: {
  icon: typeof CalendarDays;
  title: string;
  accent?: string;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-board-line pb-4">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-board-tint text-board-maroon">
        <Icon className="size-5" strokeWidth={1.7} />
      </span>
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {accent && <p className="mt-0.5 text-xs text-muted-foreground">{accent}</p>}
      </div>
    </div>
  );
}

function EmptyNotice({ children }: { children: string }) {
  return (
    <div className="flex min-h-32 flex-col items-center justify-center px-3 text-center">
      <span className="mb-3 flex size-9 items-center justify-center rounded-full bg-board-soft text-board-gold">
        <Sparkles className="size-4" strokeWidth={1.7} />
      </span>
      <p className="text-sm leading-relaxed text-muted-foreground">{children}</p>
    </div>
  );
}

export function NoticeBoardDisplay() {
  const [now, setNow] = useState<Date | null>(null);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    const update = () => setNow(new Date());
    update();
    const timer = window.setInterval(update, 1000);
    const onFullscreen = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFullscreen);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("fullscreenchange", onFullscreen);
    };
  }, []);

  async function toggleFullscreen() {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  }

  const { data } = useDisplayData();
  const settings = data?.settings ?? DEFAULT_SETTINGS;
  const images = useMemo(() => data?.images ?? [], [data?.images]);
  const notices = useMemo(() => data?.notices ?? [], [data?.notices]);
  const today = todayInIndia(now ?? undefined);

  const slides = useMemo(
    () => buildSlides(images, notices, settings, today),
    [images, notices, settings, today],
  );

  const time =
    now?.toLocaleTimeString("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    }) ?? "--:--:--";
  const date =
    now?.toLocaleDateString("en-IN", {
      timeZone: "Asia/Kolkata",
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }) ?? "";

  if (settings.slideshow_enabled && slides.length > 0) {
    return (
      <Slideshow
        slides={slides}
        seconds={settings.slide_seconds}
        clock={time}
        date={date}
        fullscreen={fullscreen}
        onToggleFullscreen={() => void toggleFullscreen()}
      />
    );
  }

  const announcements = noticesOfKind(notices, "announcement");
  const hostelNotices = noticesOfKind(notices, "hostel");
  const programmes = noticesOfKind(notices, "programme");
  const dateSheetImages = imagesOfKind(images, "datesheet");
  const dateSheetNotices = noticesOfKind(notices, "datesheet");
  const timetable = resolveTimetable(images, notices, settings, today);
  const hasDateSheet = dateSheetImages.length > 0 || dateSheetNotices.length > 0;
  const hasTimetable = timetable.images.length > 0 || timetable.notices.length > 0;
  const timetableAccent =
    timetable.variant === "special"
      ? `Special timetable${timetable.label ? `: ${timetable.label}` : ""}`
      : "Current & next activity";

  return (
    <main className="notice-board min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-[1600px] flex-col px-5 py-5 sm:px-8 sm:py-7 lg:px-12 lg:py-8">
        <BoardHeader
          clock={time}
          date={date}
          fullscreen={fullscreen}
          onToggleFullscreen={() => void toggleFullscreen()}
        />

        <section
          aria-label="School information"
          className="grid flex-1 grid-cols-1 gap-4 py-5 md:grid-cols-2 lg:grid-cols-12 lg:gap-5 lg:py-6"
        >
          <article className="board-panel overflow-hidden lg:col-span-7">
            <div className="flex items-center gap-3 border-b border-board-line px-5 py-4 sm:px-6 sm:py-5">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-board-tint text-board-maroon">
                <Volume2 className="size-5" strokeWidth={1.7} />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-board-gold">
                  School community
                </p>
                <h2 className="mt-0.5 text-lg font-semibold text-foreground sm:text-xl">
                  Announcements
                </h2>
              </div>
            </div>
            {announcements.length > 0 ? (
              <div className="px-5 pb-5 sm:px-6 sm:pb-6">
                <NoticeList notices={announcements} />
              </div>
            ) : (
              <div className="flex min-h-48 items-center justify-center px-6 py-7 text-center sm:min-h-56">
                <div className="max-w-md">
                  <span className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-board-soft text-board-gold">
                    <Sun className="size-6" strokeWidth={1.5} />
                  </span>
                  <p className="font-display text-lg font-medium text-board-maroon">
                    A clear day begins with a clear message.
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    No approved announcements are currently published.
                  </p>
                </div>
              </div>
            )}
          </article>

          <article className="board-panel p-5 sm:p-6 lg:col-span-5">
            <PanelHeading
              icon={Sparkles}
              title="Kirtan & spiritual programmes"
              accent="Upcoming school programmes"
            />
            {programmes.length > 0 ? (
              <NoticeList notices={programmes} />
            ) : (
              <EmptyNotice>No programmes have been added yet.</EmptyNotice>
            )}
          </article>

          <article className="board-panel p-5 sm:p-6 lg:col-span-5">
            <PanelHeading
              icon={GraduationCap}
              title="Examinations"
              accent="Date sheet & next exam"
            />
            {hasDateSheet ? (
              <>
                {dateSheetImages.length > 0 && (
                  <ImagePanel images={dateSheetImages} label="Date sheet" />
                )}
                <NoticeList notices={dateSheetNotices} />
              </>
            ) : (
              <EmptyNotice>No upcoming examinations have been configured.</EmptyNotice>
            )}
          </article>

          <article className="board-panel p-5 sm:p-6 lg:col-span-7">
            <PanelHeading icon={Clock3} title="Today's timetable" accent={timetableAccent} />
            {hasTimetable ? (
              <>
                {timetable.images.length > 0 && (
                  <ImagePanel images={timetable.images} label="Timetable" />
                )}
                <NoticeList notices={timetable.notices} />
              </>
            ) : (
              <EmptyNotice>No activities are scheduled for display.</EmptyNotice>
            )}
          </article>

          <article className="board-panel p-5 sm:p-6 lg:col-span-7">
            <PanelHeading
              icon={BedDouble}
              title="Hostel announcements"
              accent="Notices for hostel students"
            />
            {hostelNotices.length > 0 ? (
              <NoticeList notices={hostelNotices} />
            ) : (
              <EmptyNotice>No hostel announcements have been added yet.</EmptyNotice>
            )}
          </article>

          <article className="board-panel p-5 sm:p-6 lg:col-span-5">
            <PanelHeading icon={CloudSun} title="Weather" accent="Gurugram" />
            <div className="flex min-h-32 flex-col items-center justify-center px-2 text-center">
              <CloudSun className="mb-2 size-8 text-board-gold" strokeWidth={1.35} />
              <p className="text-sm font-medium text-foreground">Weather unavailable</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Weather information has not been configured.
              </p>
            </div>
          </article>
        </section>

        <BoardFooter />
      </div>
    </main>
  );
}
