"use client";
import { typography } from "@statoz/design-system/games/tokens/typography";

import { useEffect, useRef } from "react";

import { accentVar, hudChamferPath, withAlpha } from "@statoz/design-system/games";

import {
  grandPrixLiveries,
  grandPrixLiverySpec,
  isGrandPrixLiveryFree,
  isGrandPrixLiveryOwned,
  type GrandPrixLiverySpec,
} from "../data/liveries";
import type { GrandPrixLivery } from "../types";

import { carStyle, paintCarPreview } from "./renderer/car";
import { readRacePalette } from "./renderer/palette";

/**
 * The livery locker — the web port of `GrandPrixLiverySelector`.
 *
 * Flutter files this behind a Pit Deck screen; the web already has both halves
 * of that screen elsewhere — the driver in the loadout editor, the liveries in
 * the Shop — so what is left is the part with nowhere else to live: choosing
 * which of the ones you own the car actually wears, with the car drawn on the
 * tile by the same painter that draws it on track.
 *
 * Equipping writes through the economy rather than into this mode's own record,
 * so the livery the Shop shows equipped and the livery that lines up on the
 * grid are one value and cannot drift apart.
 */

const racing = accentVar("racing");
const tileClip = hudChamferPath(9, 2);

export type LiveryLockerProps = {
  selected: GrandPrixLivery;
  ownedLiveryIds: readonly string[];
  onSelect: (livery: GrandPrixLivery) => void;
};

export function LiveryLocker({
  selected,
  ownedLiveryIds,
  onSelect,
}: LiveryLockerProps) {
  const selectedSpec = grandPrixLiverySpec(selected);
  const free = grandPrixLiveries.filter((spec) => isGrandPrixLiveryFree(spec.livery));
  const ownedPaid = grandPrixLiveries.filter(
    (spec) =>
      !isGrandPrixLiveryFree(spec.livery) &&
      isGrandPrixLiveryOwned(spec.livery, ownedLiveryIds),
  );

  return (
    <div
      className="p-3.5"
      style={{
        background: "var(--ds-color-background-elevated)",
        border: `1px solid ${withAlpha(racing, 0.3)}`,
      }}
    >
      <div className="flex items-center gap-2">
        <span
          className="font-display font-black leading-none text-muted"
          style={{ fontSize: typography.sizeRem.p9, letterSpacing: "2px" }}
        >
          TEAM LIVERY
        </span>
        <span className="flex-1" />
        <span aria-hidden className="size-1.25" style={{ background: racing }} />
        <span
          className="truncate font-display font-black leading-none"
          style={{ fontSize: typography.sizeRem.p7_5, letterSpacing: "1.1px", color: racing }}
        >
          {`${selectedSpec.name} // EQUIPPED`}
        </span>
      </div>

      <LiveryRow
        heading="FREE LIVERIES"
        specs={free}
        selected={selected}
        onSelect={onSelect}
      />

      {ownedPaid.length > 0 ? (
        <LiveryRow
          heading="YOUR LIVERIES"
          specs={ownedPaid}
          selected={selected}
          onSelect={onSelect}
        />
      ) : (
        <p
          className="mt-3 font-display font-black leading-none"
          style={{ fontSize: typography.sizeRem.p8, letterSpacing: "1.2px", color: racing }}
        >
          BROWSE MORE LIVERIES IN THE SHOP
        </p>
      )}
    </div>
  );
}

function LiveryRow({
  heading,
  specs,
  selected,
  onSelect,
}: {
  heading: string;
  specs: GrandPrixLiverySpec[];
  selected: GrandPrixLivery;
  onSelect: (livery: GrandPrixLivery) => void;
}) {
  return (
    <>
      <p
        className="mt-3 font-display font-black leading-none text-muted"
        style={{ fontSize: typography.sizeRem.p8, letterSpacing: "1.6px" }}
      >
        {heading}
      </p>
      <div className="mt-2 grid grid-cols-4 gap-2">
        {specs.map((spec, index) => (
          <LiveryTile
            key={spec.livery}
            spec={spec}
            index={index}
            selected={spec.livery === selected}
            onSelect={onSelect}
          />
        ))}
      </div>
    </>
  );
}

function LiveryTile({
  spec,
  index,
  selected,
  onSelect,
}: {
  spec: GrandPrixLiverySpec;
  index: number;
  selected: boolean;
  onSelect: (livery: GrandPrixLivery) => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={`${spec.name} livery`}
      onClick={() => onSelect(spec.livery)}
      className="relative h-23.5 cursor-pointer transition-colors duration-180"
      style={{
        clipPath: tileClip,
        background: selected
          ? `color-mix(in srgb, ${spec.primary} 16%, var(--ds-color-background-elevated))`
          : "var(--ds-color-background-elevated)",
        border: `${selected ? 1.6 : 1}px solid ${
          selected ? racing : withAlpha("#314158", 0.72)
        }`,
        boxShadow: selected ? `0 0 14px -4px ${withAlpha(racing, 0.85)}` : undefined,
      }}
    >
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-0.5"
        style={{ background: selected ? racing : spec.primary }}
      />
      <span
        aria-hidden
        className="absolute top-1.5 left-1.75 font-display font-black leading-none tabular-nums"
        style={{
          fontSize: typography.sizeRem.p6_5,
          letterSpacing: "0.8px",
          color: selected ? racing : "var(--ds-color-text-muted)",
        }}
      >
        {String(index + 1).padStart(2, "0")}
      </span>
      <CarPreview spec={spec} />
      <span
        aria-hidden
        className="absolute inset-x-1.5 bottom-1 truncate text-center font-display font-black leading-none"
        style={{
          fontSize: typography.sizeRem.p6,
          letterSpacing: "0.4px",
          color: selected ? "var(--ds-color-text-default)" : "var(--ds-color-text-muted)",
        }}
      >
        {spec.name}
      </span>
    </button>
  );
}

/**
 * The car on the tile: the same procedural drawing the arena uses, so the paint
 * you pick here is exactly the paint that lines up on the grid.
 */
function CarPreview({ spec }: { spec: GrandPrixLiverySpec }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    if (canvas == null || parent == null) return;
    const ctx = canvas.getContext("2d");
    if (ctx == null) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = parent.clientWidth;
    const height = parent.clientHeight;
    if (width === 0 || height === 0) return;

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    paintCarPreview(ctx, width, height, carStyle(spec, readRacePalette()));
  }, [spec]);

  return (
    <span aria-hidden className="absolute inset-x-1 top-2.5 bottom-4 block">
      <canvas ref={canvasRef} className="block size-full" />
    </span>
  );
}
