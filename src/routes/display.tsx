import { createFileRoute } from "@tanstack/react-router";
import { NoticeBoardDisplay } from "@/components/notice-board-display";

export const Route = createFileRoute("/display")({
  head: () => ({
    meta: [
      { title: "School Display | Gurukul Digital Notice Board" },
      { name: "description", content: "Public information display for Shree Swaminarayan Gurukul International School, Gurugram." },
      { property: "og:title", content: "School Display | Gurukul Digital Notice Board" },
      { property: "og:description", content: "School announcements, programmes and schedules for the Gurukul community." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NoticeBoardDisplay,
});