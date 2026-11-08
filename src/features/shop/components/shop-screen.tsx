"use client";

import { useSearchParams } from "next/navigation";
import { useId, useMemo, useRef, useState } from "react";

import { Button, ExpandableSearchField, FilterChips, PageSearchHeader, SearchIcon } from "@statoz/design-system/games";
import { useEconomy } from "@/features/economy";
import { allPlayerCards, portraitForCard } from "@/features/packs";

import { useShopActions } from "../hooks/use-shop-actions";
import {
  buildStorefrontCatalog, categoryFromTab, filterShopCatalog, shopAvatarSource, storefrontCategories,
  type ShopProduct, type StorefrontCategory,
} from "../lib/shop-catalog";
import { ShopProductArt, ShopProductCard, ShopProductPreview } from "./shop-products";
import { CoinsShelf } from "./shelves/coins-shelf";
import styles from "./shop-screen.module.css";

const labels: Record<StorefrontCategory, string> = {coins: "Coins", avatars: "Avatars", frames: "Borders", banners: "Banners"};

export function ShopScreen({searchMode = false}: {searchMode?: boolean}) {
  const params = useSearchParams(), economy = useEconomy(), panelId = useId();
  const scope = params.toString();
  const [input, setInput] = useState({scope, value: params.get("q") ?? ""});
  if (input.scope !== scope) setInput({scope, value: params.get("q") ?? ""});
  const query = input.scope === scope ? input.value : params.get("q") ?? "";
  const [preview, setPreview] = useState<ShopProduct | null>(null);
  const search = useRef<HTMLInputElement>(null);
  const avatars = useMemo(() => allPlayerCards.flatMap(card => {
    const src = portraitForCard(card);
    return src ? [{card, src}] : [];
  }), []);
  const products = useMemo(() => buildStorefrontCatalog(avatars), [avatars]);
  const focus = params.get("focus");
  const focusedProduct = focus ? products.find(product => product.id === focus) ?? null : null;
  const category = (focusedProduct?.category as StorefrontCategory | undefined) ?? categoryFromTab(params.get("tab"));
  const selected = preview ?? focusedProduct;
  const avatarSrc = shopAvatarSource(economy.equipped.avatarId, avatars);
  const shown = useMemo(() => filterShopCatalog(products, economy, {
    category, query, ownedOnly: false, sort: "recommended",
  }), [products, economy, category, query]);

  function updateRoute(values: Record<string, string | null>) {
    const url = new URL(window.location.href);
    url.searchParams.delete("sport");
    for (const [key, value] of Object.entries(values)) if (value) url.searchParams.set(key, value); else url.searchParams.delete(key);
    window.history.replaceState(null, "", `${url.pathname}${url.search}`);
  }
  function changeQuery(value: string) {
    setInput({scope, value});
    updateRoute({q: value.trim() ? value : null});
  }
  function selectCategory(next: StorefrontCategory) {
    setPreview(null); setInput({scope, value: ""});
    updateRoute({tab: next === "avatars" ? null : next, focus: null, q: null});
    window.scrollTo({top: 0, behavior: "auto"});
  }
  function closePreview() {
    setPreview(null);
    if (focus) updateRoute({focus: null, tab: category === "avatars" ? null : category});
  }
  // The legacy sport argument only applies to pack actions, which this storefront does not expose.
  const {buy, buyCoins, equip, lastEquipped, overlays} = useShopActions("football", {onGetCoins: () => selectCategory("coins")});
  function buyProduct(product: ShopProduct) {
    closePreview();
    buy({kind: product.kind, id: product.id, price: product.price, label: product.name, accent: product.accent, tier: product.tier,
      preview: <ShopProductArt product={product} avatarSrc={avatarSrc} large />});
  }
  function equipProduct(product: ShopProduct) {
    closePreview();
    equip({kind: product.kind, id: product.id, label: product.name, accent: product.accent, tier: product.tier,
      preview: <ShopProductArt product={product} avatarSrc={avatarSrc} large />});
  }

  return (
    <section className={styles.shell} data-shop-screen>
      <div className={styles.storefront}>
        <PageSearchHeader title="Shop">
          <ExpandableSearchField ref={search} label="Search shop items" placeholder={`Search ${labels[category].toLowerCase()}…`}
            value={query} onChange={event => changeQuery(event.target.value)}
            onClear={() => {changeQuery(""); search.current?.focus();}} autoFocus={searchMode} enterKeyHint="search" />
        </PageSearchHeader>
        <FilterChips options={storefrontCategories.map(kind => labels[kind])} selected={labels[category]}
          onSelect={label => selectCategory(storefrontCategories.find(kind => labels[kind] === label)!)}
          label="Shop category" className={styles.categoryTabs} panelId={panelId} />
        <div id={panelId} role="tabpanel" aria-label={labels[category]} tabIndex={0} className={styles.tabPanel}>
          {category === "coins" ? <CoinsShelf onBuy={buyCoins} query={query} onClear={() => {changeQuery(""); search.current?.focus();}} /> : (
            <section className={styles.catalog} aria-label={`${labels[category]} catalog`} data-shop-catalog>
              <div className={styles.searchRow}>
                <span className={styles.resultCount} role="status">{shown.length} {shown.length === 1 ? "item" : "items"}</span>
              </div>
              {shown.length ? <ProductGrid key={`${category}-${query}`} products={shown} economy={economy} avatarSrc={avatarSrc}
                lastEquipped={lastEquipped} onBuy={buyProduct} onEquip={equipProduct} onPreview={setPreview} /> : <div className={styles.emptyState}>
                <SearchIcon size={30} />
                <h2>No items found</h2>
                <p>Try a different name, team or country.</p>
                <Button className={styles.primaryButton} onClick={() => {changeQuery(""); search.current?.focus();}}>Clear search</Button>
              </div>}
            </section>
          )}
        </div>
      </div>
      {selected && <ShopProductPreview key={`${selected.kind}-${selected.id}`} product={selected} economy={economy} avatarSrc={avatarSrc}
        onBuy={() => buyProduct(selected)} onEquip={() => equipProduct(selected)} onClose={closePreview} />}
      {overlays}
    </section>
  );
}

function ProductGrid({products, economy, avatarSrc, lastEquipped, onBuy, onEquip, onPreview}: {
  products: ShopProduct[]; economy: ReturnType<typeof useEconomy>; avatarSrc?: string; lastEquipped: {kind: string; id: string} | null;
  onBuy: (product: ShopProduct) => void; onEquip: (product: ShopProduct) => void; onPreview: (product: ShopProduct) => void;
}) {
  const [count, setCount] = useState(24);
  return <><div className={styles.productGrid}>
    {products.slice(0, count).map(product => <ShopProductCard key={`${product.kind}-${product.id}`} product={product} economy={economy}
      justEquipped={lastEquipped?.kind === product.kind && lastEquipped.id === product.id}
      avatarSrc={avatarSrc} onBuy={() => onBuy(product)} onEquip={() => onEquip(product)} onPreview={() => onPreview(product)} />)}
  </div>{count < products.length && <Button variant="surface" className={styles.showMore} onClick={() => setCount(count+24)}
    trailingIcon={<span>{Math.min(count, products.length)}/{products.length}</span>}>Show more items</Button>}</>;
}
