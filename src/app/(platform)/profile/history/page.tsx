import { redirect } from "next/navigation";

/** The top-bar streak target opens the career-oriented games archive. */
export default function ProfileHistoryIndexPage() {
  redirect("/profile/history/games");
}
