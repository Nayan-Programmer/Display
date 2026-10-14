import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { NoticeBoardDisplay } from "@/components/notice-board-display";
import type { DisplayData } from "@/lib/display-data";
import {
  DEFAULT_SETTINGS,
  type DisplayImage,
  type DisplayNotice,
  type DisplaySettings,
  type Variant,
} from "@/lib/notice-board";

let mockData: DisplayData | undefined;
vi.mock("@/lib/display-data", () => ({ useDisplayData: () => ({ data: mockData }) }));

const image = (
  id: string,
  kind: DisplayImage["kind"],
  sort_order: number,
  variant: Variant = "default",
): DisplayImage => ({
  id,
  kind,
  variant,
  title: id,
  image_path: `${kind}/${id}.jpg`,
  sort_order,
  created_at: `2026-10-13T10:00:0${sort_order}Z`,
  url: `https://example.test/${id}.jpg`,
});

const notice = (
  id: string,
  kind: DisplayNotice["kind"],
  body: string,
  variant: Variant = "default",
): DisplayNotice => ({
  id,
  kind,
  variant,
  title: "",
  body,
  sort_order: 1,
  created_at: "2026-10-13T10:00:01Z",
});

const images = [image("datesheet-1", "datesheet", 1), image("timetable-1", "timetable", 1)];
const settings = (patch: Partial<DisplaySettings>): DisplaySettings => ({
  ...DEFAULT_SETTINGS,
  ...patch,
});

describe("NoticeBoardDisplay", () => {
  beforeEach(() => {
    mockData = undefined;
  });
  afterEach(() => vi.useRealTimers());

  it("shows the school logo and empty states when nothing is uploaded", () => {
    render(<NoticeBoardDisplay />);
    expect(screen.getByAltText(/gurukul logo/i)).toBeInTheDocument();
    expect(screen.getByText("No upcoming examinations have been configured.")).toBeInTheDocument();
    expect(screen.getByText("No activities are scheduled for display.")).toBeInTheDocument();
  });

  it("shows uploaded date sheet and timetable images in their panels", () => {
    mockData = { settings: DEFAULT_SETTINGS, images, notices: [] };
    render(<NoticeBoardDisplay />);
    expect(screen.getByAltText("datesheet-1")).toHaveAttribute(
      "src",
      "https://example.test/datesheet-1.jpg",
    );
    expect(screen.getByAltText("timetable-1")).toHaveAttribute(
      "src",
      "https://example.test/timetable-1.jpg",
    );
    expect(
      screen.queryByText("No upcoming examinations have been configured."),
    ).not.toBeInTheDocument();
  });

  it("shows typed announcements and programmes", () => {
    mockData = {
      settings: DEFAULT_SETTINGS,
      images: [],
      notices: [
        notice("a", "announcement", "School closed on Friday"),
        notice("p", "programme", "Kirtan at 4 pm"),
      ],
    };
    render(<NoticeBoardDisplay />);
    expect(screen.getByText("School closed on Friday")).toBeInTheDocument();
    expect(screen.getByText("Kirtan at 4 pm")).toBeInTheDocument();
    expect(screen.queryByText("No programmes have been added yet.")).not.toBeInTheDocument();
  });

  it("shows hostel announcements in their own panel and in the slideshow", () => {
    mockData = {
      settings: DEFAULT_SETTINGS,
      images: [],
      notices: [notice("h", "hostel", "Hostel curfew moved to 9 pm")],
    };
    const { unmount } = render(<NoticeBoardDisplay />);
    expect(screen.getByText("Hostel announcements")).toBeInTheDocument();
    expect(screen.getByText("Hostel curfew moved to 9 pm")).toBeInTheDocument();
    unmount();

    mockData = {
      settings: settings({ slideshow_enabled: true, slide_seconds: 5 }),
      images: [],
      notices: [notice("h", "hostel", "Hostel curfew moved to 9 pm")],
    };
    render(<NoticeBoardDisplay />);
    expect(screen.getByText("Hostel curfew moved to 9 pm")).toBeInTheDocument();
    expect(screen.getByText("Hostel announcement")).toBeInTheDocument();
  });

  it("shows the default timetable normally and the special one when switched on", () => {
    const all = [
      image("tt-default", "timetable", 1),
      image("tt-special", "timetable", 1, "special"),
    ];
    mockData = { settings: DEFAULT_SETTINGS, images: all, notices: [] };
    const { unmount } = render(<NoticeBoardDisplay />);
    expect(screen.getByAltText("tt-default")).toBeInTheDocument();
    expect(screen.queryByAltText("tt-special")).not.toBeInTheDocument();
    unmount();

    mockData = {
      settings: settings({ timetable_mode: "special", special_label: "Annual Day" }),
      images: all,
      notices: [],
    };
    render(<NoticeBoardDisplay />);
    expect(screen.getByAltText("tt-special")).toBeInTheDocument();
    expect(screen.queryByAltText("tt-default")).not.toBeInTheDocument();
    expect(screen.getByText("Special timetable: Annual Day")).toBeInTheDocument();
  });

  it("plays a slideshow with the same school header and theme as the board", () => {
    vi.useFakeTimers();
    mockData = {
      settings: settings({ slideshow_enabled: true, slide_seconds: 5 }),
      images,
      notices: [],
    };
    const { container } = render(<NoticeBoardDisplay />);
    // Same branding + same themed page background as the normal board.
    expect(screen.getByAltText(/gurukul logo/i)).toBeInTheDocument();
    expect(screen.getByText("Gurukul Digital Notice Board")).toBeInTheDocument();
    const main = container.querySelector("main");
    expect(main).toHaveClass("notice-board", "bg-background");
    expect(main).not.toHaveClass("bg-neutral-950");

    expect(screen.getByAltText("datesheet-1")).toBeInTheDocument();
    expect(screen.getByText("1 / 2")).toBeInTheDocument();
    expect(screen.queryByText("Announcements")).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByAltText("timetable-1")).toBeInTheDocument();
    expect(screen.getByText("2 / 2")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByAltText("datesheet-1")).toBeInTheDocument();
  });

  it("includes text entries as slides", () => {
    vi.useFakeTimers();
    mockData = {
      settings: settings({ slideshow_enabled: true, slide_seconds: 5 }),
      images: [],
      notices: [notice("a", "announcement", "Parents meeting tomorrow")],
    };
    render(<NoticeBoardDisplay />);
    expect(screen.getByText("Parents meeting tomorrow")).toBeInTheDocument();
    expect(screen.getByText("1 / 1")).toBeInTheDocument();
  });

  it("falls back to the normal board when the slideshow is on but there is nothing to show", () => {
    mockData = {
      settings: settings({ slideshow_enabled: true, slide_seconds: 5 }),
      images: [],
      notices: [],
    };
    render(<NoticeBoardDisplay />);
    expect(screen.getByText("Announcements")).toBeInTheDocument();
  });
});
