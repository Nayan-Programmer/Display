import { CalendarDays, Expand, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { schoolLogo } from "@/lib/branding";

export const schoolName = "Shree Swaminarayan Gurukul International School, Gurugram";

/**
 * Header shared by the normal notice board and the slideshow, so the background, colours and
 * branding stay exactly the same when the slideshow starts or stops.
 */
export function BoardHeader({
  clock,
  date,
  fullscreen,
  onToggleFullscreen,
  compact = false,
}: {
  clock: string;
  date: string;
  fullscreen: boolean;
  onToggleFullscreen: () => void;
  compact?: boolean;
}) {
  return (
    <header
      className={`relative flex flex-col border-b border-board-line sm:flex-row sm:items-center sm:justify-between ${compact ? "gap-3 pb-3 sm:pb-4" : "gap-6 pb-6 sm:pb-7"}`}
    >
      <div className="flex min-w-0 items-center gap-4 sm:gap-5">
        <img
          src={schoolLogo}
          alt="Shree Swaminarayan Gurukul logo"
          className={`shrink-0 object-contain ${compact ? "size-12 sm:size-14" : "size-16 sm:size-20"}`}
        />
        <div className="min-w-0">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-board-gold sm:text-xs">
            Gurukul Digital Notice Board
          </p>
          <h1
            className={`max-w-3xl font-display font-semibold leading-snug text-board-maroon ${compact ? "text-lg sm:text-xl" : "text-xl sm:text-2xl lg:text-[1.75rem]"}`}
          >
            {schoolName}
          </h1>
          {!compact && (
            <p className="mt-1.5 text-sm text-muted-foreground">
              Technology in Service of Education, Discipline and Seva
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between gap-5 sm:justify-end">
        <div className="sm:text-right">
          <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground sm:justify-end">
            <CalendarDays className="size-3.5 text-board-gold" />
            {date || "India Standard Time"}
          </p>
          <p
            className={`mt-1 font-display font-semibold tabular-nums text-board-maroon ${compact ? "text-xl sm:text-2xl" : "text-2xl sm:text-3xl"}`}
          >
            {clock}
          </p>
        </div>
        <Button
          variant="outline"
          size="icon"
          className="size-10 shrink-0 border-board-line bg-card text-board-maroon"
          aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          title={fullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          onClick={onToggleFullscreen}
        >
          <Expand className="size-4" />
        </Button>
      </div>
    </header>
  );
}

export function BoardFooter() {
  return (
    <footer className="mt-auto flex flex-col gap-2 border-t border-board-line pt-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:pt-5">
      <p className="flex items-center gap-2">
        <MapPin className="size-3.5 text-board-gold" />
        Gurugram, Haryana <span className="text-board-line">|</span> India Standard Time
      </p>
      <p className="font-medium text-board-maroon">Jai Swaminarayan</p>
    </footer>
  );
}
