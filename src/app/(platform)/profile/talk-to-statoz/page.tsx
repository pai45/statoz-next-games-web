import type { Metadata } from "next";

import { TalkToStatoz } from "@/features/profile";

export const metadata: Metadata = {
  title: "Talk to StatOz | StatOz",
  description:
    "The 1:1 direct line: report a bug, request a feature, flag a data mismatch, or send a shoutout.",
};

export default function TalkToStatozPage() {
  return <TalkToStatoz />;
}
