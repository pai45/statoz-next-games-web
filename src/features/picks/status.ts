import type {
  PickMarketStatus,
  PickMarketType,
  PickPositionStatus,
} from "@/domain/predictions";

/**
 * The single source for a pick's status language, so the market cards, the
 * market detail and the portfolio strip all say the same thing in the same
 * colour.
 */

export function pickMarketTypeLabel(type: PickMarketType = "event"): string {
  return type.toUpperCase();
}

export function pickMarketTypeColor(type: PickMarketType = "event"): string {
  if (type === "match") return "var(--ds-color-accent-cyan)";
  if (type === "future") return "var(--ds-color-accent-violet)";
  return "var(--ds-color-accent-gold)";
}

export function pickMarketStatusLabel(status: PickMarketStatus = "upcoming"): string {
  if (status === "upcoming") return "OPEN";
  if (status === "voided") return "VOID";
  return status.toUpperCase();
}

export function pickMarketStatusColor(status: PickMarketStatus = "upcoming"): string {
  switch (status) {
    case "upcoming":
      return "var(--ds-color-accent-gold)";
    case "live":
      return "var(--ds-color-danger)";
    case "unresolved":
      return "var(--ds-color-accent-orange)";
    case "settled":
      return "var(--ds-color-success)";
    default:
      return "var(--ds-color-text-muted)";
  }
}

export function pickPositionLabel(status: PickPositionStatus): string {
  if (status === "settleable") return "CLAIM";
  if (status === "voided") return "REFUNDED";
  return status.toUpperCase();
}

export function pickPositionColor(status: PickPositionStatus): string {
  switch (status) {
    case "pending":
      return "var(--ds-color-accent-cyan)";
    case "live":
      return "var(--ds-color-danger)";
    case "unresolved":
      return "var(--ds-color-accent-orange)";
    case "settleable":
      return "var(--ds-color-accent-gold)";
    case "won":
      return "var(--ds-color-success)";
    case "lost":
      return "var(--ds-color-danger)";
    default:
      return "var(--ds-color-text-muted)";
  }
}

/**
 * The short code a filled outcome badge carries, in the team-badge style the
 * platform uses everywhere else. Known sides keep their conventional code;
 * anything else falls back to initials, or the first three letters.
 */
const outcomeCodes: Record<string, string> = {
  punjab: "PJB",
  bangalore: "BLR",
  liverpool: "LIV",
  "man city": "MCI",
  "manchester city": "MCI",
  "man utd": "MUN",
  "manchester united": "MUN",
  mumbai: "MUM",
  chennai: "CHE",
  "aston villa": "AVL",
  "brighton or draw": "BHA",
  brighton: "BHA",
  newcastle: "NEW",
  chelsea: "CHE",
  arsenal: "ARS",
  argentina: "ARG",
  portugal: "POR",
  draw: "DRW",
  field: "FLD",
  yes: "YES",
  no: "NO",
};

export function pickOutcomeCode(label: string): string {
  const trimmed = label.trim();
  const known = outcomeCodes[trimmed.toLowerCase()];
  if (known) return known;
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return words.slice(0, 3).map((word) => word[0]).join("").toUpperCase();
  }
  const word = words[0] ?? trimmed;
  return word.slice(0, 3).toUpperCase();
}

/** The league mark's three-letter code. */
export function pickLeagueCode(label: string): string {
  const compact = label.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (compact === "") return "LGE";
  return compact.slice(0, 3);
}

/**
 * The countdown a still-open market carries in its notch: `SOON`, then minutes,
 * hours or days as the close approaches.
 */
export function pickClosesLabel(closesAt: string, now: number): string {
  const remaining = Date.parse(closesAt) - now;
  if (!Number.isFinite(remaining) || remaining <= 0) return "SOON";
  const minutes = Math.floor(remaining / 60000);
  if (minutes < 60) return `${minutes}M`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}H`;
  return `${Math.floor(hours / 24)}D`;
}
