import { describe, expect, it } from "vitest";
import {
  DEFAULT_SETTINGS,
  buildSlides,
  clampSlideSeconds,
  imagesOfKind,
  isSpecialModeOn,
  nextIndex,
  previousIndex,
  resolveTimetable,
  titleFromFilename,
  validateImageFile,
  type DisplayImage,
  type DisplayNotice,
  type DisplaySettings,
  type Variant,
} from "@/lib/notice-board";

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
  sort_order: number,
  variant: Variant = "default",
): DisplayNotice => ({
  id,
  kind,
  variant,
  title: `title ${id}`,
  body: `body ${id}`,
  sort_order,
  created_at: `2026-10-13T10:00:0${sort_order}Z`,
});

const special = (until: string | null = null, label = "Annual Day"): DisplaySettings => ({
  ...DEFAULT_SETTINGS,
  timetable_mode: "special",
  special_label: label,
  special_until: until,
});

describe("notice board helpers", () => {
  it("orders slides: announcements, programmes, date sheet, timetable, each by sort order", () => {
    const slides = buildSlides(
      [
        image("t2", "timetable", 2),
        image("d2", "datesheet", 2),
        image("t1", "timetable", 1),
        image("d1", "datesheet", 1),
      ],
      [notice("a1", "announcement", 1), notice("p1", "programme", 1)],
      DEFAULT_SETTINGS,
      "2026-10-14",
    );
    expect(slides.map((s) => s.id)).toEqual([
      "notice-a1",
      "notice-p1",
      "image-d1",
      "image-d2",
      "image-t1",
      "image-t2",
    ]);
  });

  it("puts images before text inside the same section", () => {
    const slides = buildSlides(
      [image("d1", "datesheet", 1)],
      [notice("n1", "datesheet", 1)],
      DEFAULT_SETTINGS,
      "2026-10-14",
    );
    expect(slides.map((s) => s.id)).toEqual(["image-d1", "notice-n1"]);
  });

  it("filters images by kind and variant", () => {
    const all = [
      image("d1", "datesheet", 1),
      image("t1", "timetable", 1),
      image("t2", "timetable", 2, "special"),
    ];
    expect(imagesOfKind(all, "timetable").map((i) => i.id)).toEqual(["t1", "t2"]);
    expect(imagesOfKind(all, "timetable", "special").map((i) => i.id)).toEqual(["t2"]);
  });

  it("keeps slide seconds within the allowed range", () => {
    expect(clampSlideSeconds(1)).toBe(3);
    expect(clampSlideSeconds(500)).toBe(120);
    expect(clampSlideSeconds(12.4)).toBe(12);
    expect(clampSlideSeconds(Number.NaN)).toBe(10);
  });

  it("wraps slide indexes", () => {
    expect(nextIndex(2, 3)).toBe(0);
    expect(previousIndex(0, 3)).toBe(2);
    expect(nextIndex(0, 0)).toBe(0);
  });

  it("rejects non-images and oversized files", () => {
    expect(validateImageFile({ name: "a.pdf", type: "application/pdf", size: 10 })).toMatch(
      /only JPG/,
    );
    expect(
      validateImageFile({ name: "big.png", type: "image/png", size: 11 * 1024 * 1024 }),
    ).toMatch(/10 MB/);
    expect(validateImageFile({ name: "ok.jpg", type: "image/jpeg", size: 1000 })).toBeNull();
  });

  it("makes a readable title from a file name", () => {
    expect(titleFromFilename("Class_5-date_sheet.JPG")).toBe("Class 5 date sheet");
  });
});

describe("default and special occasion timetable", () => {
  const images = [
    image("t-default", "timetable", 1),
    image("t-special", "timetable", 1, "special"),
  ];
  const notices = [
    notice("n-default", "timetable", 1),
    notice("n-special", "timetable", 1, "special"),
  ];

  it("shows the default timetable when special mode is off", () => {
    const result = resolveTimetable(images, notices, DEFAULT_SETTINGS, "2026-10-14");
    expect(result.variant).toBe("default");
    expect(result.images.map((i) => i.id)).toEqual(["t-default"]);
    expect(result.notices.map((n) => n.id)).toEqual(["n-default"]);
  });

  it("shows only the special timetable while special mode is on", () => {
    const result = resolveTimetable(images, notices, special(), "2026-10-14");
    expect(result.variant).toBe("special");
    expect(result.label).toBe("Annual Day");
    expect(result.images.map((i) => i.id)).toEqual(["t-special"]);
    expect(result.notices.map((n) => n.id)).toEqual(["n-special"]);
  });

  it("goes back to the default timetable after the end date", () => {
    expect(isSpecialModeOn(special("2026-10-14"), "2026-10-14")).toBe(true);
    expect(isSpecialModeOn(special("2026-10-14"), "2026-10-15")).toBe(false);
    expect(resolveTimetable(images, notices, special("2026-10-14"), "2026-10-15").variant).toBe(
      "default",
    );
  });

  it("keeps the default timetable if special mode is on but nothing was added to it", () => {
    const onlyDefault = [image("t-default", "timetable", 1)];
    const result = resolveTimetable(onlyDefault, [], special(), "2026-10-14");
    expect(result.variant).toBe("default");
    expect(result.images.map((i) => i.id)).toEqual(["t-default"]);
  });

  it("uses the special timetable in the slideshow too", () => {
    const slides = buildSlides(images, notices, special(), "2026-10-14");
    expect(slides.map((s) => s.id)).toEqual(["image-t-special", "notice-n-special"]);
    expect(slides[0]?.label).toBe("Special timetable: Annual Day");
  });
});
