import { equipCosmetic, owns } from "@/features/economy";
import { saveAvatar, saveBanner } from "@/features/profile/identity";

import type { ShopKind } from "./shop-catalog";

/** The identity and locker stores must agree when a cosmetic is equipped from the shop. */
export function equipShopItem(kind: ShopKind, id: string) {
  if (!owns(kind, id)) return false;
  equipCosmetic(kind, id);
  if (kind === "avatar") saveAvatar(id);
  if (kind === "banner") saveBanner(id);
  return true;
}
