import { createFileRoute } from "@tanstack/react-router";
import { NoticeBoardDisplay } from "@/components/notice-board-display";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Gurukul Digital Notice Board | Shree Swaminarayan Gurukul" },
      { name: "description", content: "The public digital notice board for Shree Swaminarayan Gurukul International School, Gurugram." },
      { property: "og:title", content: "Gurukul Digital Notice Board | Shree Swaminarayan Gurukul" },
      { property: "og:description", content: "School announcements, programmes and schedules for the Gurukul community." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NoticeBoardDisplay,
});
