"use client";

import { useState } from "react";

import { CardUnpack } from "./card-unpack";
import type { PackRevealItem } from "../types";

export type PackRevealSequenceProps = {
  items: PackRevealItem[];
  onComplete: () => void;
  completeLabel?: string;
  actionLabel?: string;
};

/** The full-screen one-card-at-a-time reveal shared by shop and earned packs. */
export function PackRevealSequence({
  items,
  onComplete,
  completeLabel = "PACK COMPLETE",
  actionLabel = "CONTINUE",
}: PackRevealSequenceProps) {
  const [index, setIndex] = useState(0);
  const done = index >= items.length;

  return (
    <div className="fixed inset-0 z-[70] bg-background">
      {done ? (
        <div className="grid min-h-dvh place-items-center p-5">
          <div className="w-full max-w-xl text-center">
            <p className="font-display text-sm font-black tracking-ultra text-cyan">
              {completeLabel}
            </p>
            <h2 className="mt-3 font-display text-3xl font-black">
              {items.length} {items.length === 1 ? "CARD" : "CARDS"} ADDED
            </h2>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {items.map((item, itemIndex) => (
                <span
                  key={`${item.card.id}-${itemIndex}`}
                  className="border border-line bg-surface-elevated px-3 py-2 font-display text-2xs font-black"
                >
                  {"shortName" in item.card ? item.card.shortName : item.card.title}
                </span>
              ))}
            </div>
            <button
              type="button"
              autoFocus
              onClick={onComplete}
              className="mt-8 h-12 w-full max-w-xs bg-cyan font-display text-xs font-black text-inverse"
            >
              {actionLabel}
            </button>
          </div>
        </div>
      ) : (
        <CardUnpack
          key={index}
          item={items[index]}
          onComplete={() => setIndex((value) => value + 1)}
        />
      )}
    </div>
  );
}

