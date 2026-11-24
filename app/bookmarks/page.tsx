import type { Metadata } from "next";
import { BookmarksView } from "@/components/bookmarks/bookmarks-view";
import { PageShell } from "@/components/page-shell";

export const metadata: Metadata = {
  title: "My Clocks & moments",
  description:
    "Your bookmarked city clocks and saved moments — plan a time in one city and see it across all your time zones.",
  alternates: { canonical: "/bookmarks/" },
};

export default function BookmarksPage() {
  return (
    <PageShell>
      <BookmarksView />
    </PageShell>
  );
}
