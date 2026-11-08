"use client";

import { useMemo, useState, type ReactNode } from "react";

import { FilterChips, accentVar } from "@statoz/design-system/games";
import type { PlayerCard as PlayerCardData } from "@/domain/cards";
import { sportModuleFor, type Sport } from "@/domain/sports";
import { equipCosmetic, type EconomySnapshot } from "@/features/economy";
import { allPlayerCards, portraitAssets, portraitForCard } from "@/features/packs";
import { avatarPrice, colorProducts, shopBanners, shopFrames, type ColorProduct, type ShopBanner } from "@/mocks/shop";

import type { BuyRequest } from "../../hooks/use-shop-actions";
import { BannerArt } from "../banner-art";
import { AvatarPreview, BannerPreview, cardSport, ColorPreview, FramePreview, kitCaptions } from "../shop-previews";
import { ownedCount, ShopShelf, ShopShelfDrawer } from "../shop-shelf";
import {
  AvatarTile,
  BannerTile,
  FrameTile,
  KitTile,
  ShopEmptyFilter,
  ShopFocusTarget,
  ShopRail,
  StripList,
  TileGrid,
  useScrollToItem,
} from "../shop-tiles";

export type StyleKind = "avatars" | "frames" | "banners" | "kits";

type ShopFrame = (typeof shopFrames)[number];

/** How many items a style row shows before SEE ALL. */
const RAIL_COUNT = 12;

const kitLabels: Record<ColorProduct["kind"], string> = { kit: "KITS", jersey: "JERSEYS", livery: "LIVERIES" };

export function StyleShelf({
  sport,
  economy,
  initialKind,
  focusId,
  buy,
}: {
  sport: Sport;
  economy: EconomySnapshot;
  initialKind: StyleKind | null;
  focusId: string | null;
  buy: (request: BuyRequest) => void;
}) {
  const [selected, setSelected] = useState<StyleKind>(initialKind ?? "avatars");
  const [drawerOpen, setDrawerOpen] = useState(focusId !== null);

  const avatars = useMemo(
    () => allPlayerCards.filter((card) => cardSport(card) === sport && portraitAssets[card.id]),
    [sport],
  );
  const frames = shopFrames.filter((frame) => frame.sport === sport);
  const banners = shopBanners.filter((banner) => banner.sport === sport);
  const kits = colorProducts.filter((item) => item.sport === sport);

  const kitLabel = kits.length ? kitLabels[kits[0].kind] : "KITS";
  const kinds: [StyleKind, string, number][] = (
    [["avatars", "AVATARS", avatars.length], ["frames", "FRAMES", frames.length], ["banners", "BANNERS", banners.length], ["kits", kitLabel, kits.length]] as [StyleKind, string, number][]
  ).filter(([, , count]) => count > 0);
  if (!kinds.length) return null;

  // A sport without the chosen kind falls back to the first one it has.
  const active = kinds.some(([kind]) => kind === selected) ? selected : kinds[0][0];
  const activeLabel = kinds.find(([kind]) => kind === active)![1];

  const ownedIds =
    active === "avatars" ? economy.owned.avatarIds
      : active === "frames" ? economy.owned.frameIds
        : active === "banners" ? economy.owned.bannerIds
          : [...economy.owned.kitIds, ...economy.owned.jerseyIds, ...economy.owned.liveryIds];
  const activeIds =
    active === "avatars" ? avatars.map((card) => card.id)
      : active === "frames" ? frames.map((frame) => frame.id)
        : active === "banners" ? banners.map((banner) => banner.id)
          : kits.map((item) => item.id);

  const accent = accentVar(sportModuleFor(sport).accent);
  const tiles = { economy, buy, focusId };

  return (
    <ShopShelf
      id="style"
      kicker="DRESS YOUR PROFILE"
      title="STYLE"
      meta={ownedCount(activeIds, ownedIds)}
      onSeeAll={activeIds.length > RAIL_COUNT ? () => setDrawerOpen(true) : undefined}
      controls={
        <FilterChips
          options={kinds.map(([, label]) => label)}
          selected={activeLabel}
          onSelect={(label) => setSelected(kinds.find(([, entry]) => entry === label)![0])}
          accent={accent}
          label="Style category"
          className="mb-3"
        />
      }
    >
      <ShopRail size={active === "avatars" || active === "frames" ? "portrait" : "strip"} label={activeLabel}>
        {active === "avatars" ? avatars.slice(0, RAIL_COUNT).map((card, index) => avatarTile(card, index, tiles))
          : active === "frames" ? frames.slice(0, RAIL_COUNT).map((frame, index) => frameTile(frame, index, tiles))
            : active === "banners" ? banners.slice(0, RAIL_COUNT).map((banner, index) => bannerTile(banner, index, tiles))
              : kits.slice(0, RAIL_COUNT).map((item, index) => kitTile(item, index, tiles))}
      </ShopRail>
      <ShopShelfDrawer open={drawerOpen} title={`${sportModuleFor(sport).label.toUpperCase()} ${activeLabel}`} onClose={() => setDrawerOpen(false)}>
        {drawerOpen ? (
          <StyleCatalog
            key={`${sport}-${active}`}
            kind={active}
            sport={sport}
            avatars={avatars}
            frames={frames}
            banners={banners}
            kits={kits}
            tiles={tiles}
          />
        ) : null}
      </ShopShelfDrawer>
    </ShopShelf>
  );
}

type TileContext = { economy: EconomySnapshot; buy: (request: BuyRequest) => void; focusId: string | null };

function StyleCatalog({
  kind,
  sport,
  avatars,
  frames,
  banners,
  kits,
  tiles,
}: {
  kind: StyleKind;
  sport: Sport;
  avatars: PlayerCardData[];
  frames: ShopFrame[];
  banners: ShopBanner[];
  kits: ColorProduct[];
  tiles: TileContext;
}) {
  const [country, setCountry] = useState("ALL");
  useScrollToItem(tiles.focusId);
  const focusable = { ...tiles, focusable: true };

  if (kind === "avatars") {
    const countries = ["ALL", ...[...new Set(avatars.map((card) => card.countryCode))].sort()];
    const shown = country === "ALL" ? avatars : avatars.filter((card) => card.countryCode === country);
    return (
      <>
        <FilterChips
          options={countries}
          selected={country}
          onSelect={setCountry}
          accent={accentVar(sportModuleFor(sport).accent)}
          label="Filter avatars by country"
          className="mb-4"
        />
        {shown.length ? (
          <TileGrid>{shown.map((card, index) => avatarTile(card, index, focusable))}</TileGrid>
        ) : (
          <ShopEmptyFilter sport={sport} label="NO AVATARS MATCH THIS FILTER" />
        )}
      </>
    );
  }
  if (kind === "frames") return <TileGrid>{frames.map((frame, index) => frameTile(frame, index, focusable))}</TileGrid>;
  if (kind === "banners") return <StripList>{banners.map((banner, index) => bannerTile(banner, index, focusable))}</StripList>;
  return <StripList>{kits.map((item, index) => kitTile(item, index, focusable))}</StripList>;
}

/* ---- Tiles ----------------------------------------------------------------- */

type TileOptions = TileContext & { focusable?: boolean };

/** Only the SEE ALL grid carries the deep-link target, so its id stays unique. */
function withFocus(id: string, options: TileOptions, tile: ReactNode) {
  return options.focusable ? (
    <ShopFocusTarget key={id} id={id} focused={options.focusId === id}>
      {tile}
    </ShopFocusTarget>
  ) : tile;
}

function avatarTile(card: PlayerCardData, index: number, options: TileOptions) {
  const cyan = accentVar("cyan");
  return withFocus(
    card.id,
    options,
    <AvatarTile
      key={card.id}
      index={index}
      name={card.shortName}
      portraitSrc={portraitForCard(card)}
      price={avatarPrice}
      accent={cyan}
      owned={options.economy.owned.avatarIds.includes(card.id)}
      onBuy={() =>
        options.buy({ kind: "avatar", id: card.id, price: avatarPrice, label: card.name, accent: cyan, preview: <AvatarPreview card={card} /> })
      }
    />,
  );
}

function frameTile(frame: ShopFrame, index: number, options: TileOptions) {
  return withFocus(
    frame.id,
    options,
    <FrameTile
      key={frame.id}
      index={index}
      label={frame.label}
      color={frame.color}
      price={frame.price}
      owned={options.economy.owned.frameIds.includes(frame.id)}
      equipped={options.economy.equipped.frameId === frame.id}
      onEquip={() => equipCosmetic("frame", frame.id)}
      onBuy={() =>
        options.buy({ kind: "frame", id: frame.id, price: frame.price, label: frame.label, accent: frame.color, preview: <FramePreview color={frame.color} /> })
      }
    />,
  );
}

function bannerTile(banner: ShopBanner, index: number, options: TileOptions) {
  return withFocus(
    banner.id,
    options,
    <BannerTile
      key={banner.id}
      index={index}
      label={banner.label}
      sportCode={sportModuleFor(banner.sport).shortLabel}
      accent={banner.accent}
      art={<BannerArt banner={banner} />}
      price={banner.price}
      owned={options.economy.owned.bannerIds.includes(banner.id)}
      onBuy={() =>
        options.buy({ kind: "banner", id: banner.id, price: banner.price, label: banner.label, accent: banner.accent, preview: <BannerPreview banner={banner} /> })
      }
    />,
  );
}

function kitTile(item: ColorProduct, index: number, options: TileOptions) {
  const ownedKey = `${item.kind}Ids` as "kitIds" | "jerseyIds" | "liveryIds";
  const equippedKey = `${item.kind}Id` as "kitId" | "jerseyId" | "liveryId";
  return withFocus(
    item.id,
    options,
    <KitTile
      key={item.id}
      index={index}
      label={item.label}
      caption={kitCaptions[item.kind]}
      primary={item.primary}
      secondary={item.secondary}
      accent={item.accent}
      kind={item.kind}
      price={item.price}
      owned={options.economy.owned[ownedKey].includes(item.id)}
      equipped={options.economy.equipped[equippedKey] === item.id}
      onEquip={() => equipCosmetic(item.kind, item.id)}
      onBuy={() =>
        options.buy({ kind: item.kind, id: item.id, price: item.price, label: item.label, accent: item.accent, preview: <ColorPreview item={item} /> })
      }
    />,
  );
}
