"use client";

import Image from "next/image";
import type { CSSProperties } from "react";

import { BrandIcon, Button, ShieldIcon } from "@statoz/design-system/games";
import { coinBundles, type CoinBundle } from "@/mocks/shop";
import { publicAsset } from "@/shared/config";
import { formatInt } from "@/shared/utils";

import vault from "../coin-vault.module.css";

/** The Oz Coin vault. Bundles are the same in every sport; rupee prices are a local simulation. */
export function CoinsShelf({onBuy, query = "", onClear}: {onBuy: (bundle: CoinBundle) => void; query?: string; onClear?: () => void}) {
  const search = query.trim().toLocaleLowerCase();
  const bundles = coinBundles.filter(bundle => `${bundle.label} ${bundle.coins} ${formatInt(bundle.coins)} ${bundle.inr}`.toLocaleLowerCase().includes(search));
  return (
    <section id="coins" className={vault.vault} aria-label="Coin bundles">
      <header className={vault.header}>
        <span className={vault.demo}><ShieldIcon size={13} />Demo top-ups · no real payment</span>
      </header>
      <div className={vault.grid}>
        {bundles.map((bundle, index) => <CoinBundleCard key={bundle.id} bundle={bundle} index={index}
          topTier={bundle.id === coinBundles.at(-1)?.id} onBuy={() => onBuy(bundle)} />)}
      </div>
      {bundles.length === 0 && <div className="grid justify-items-center gap-4 py-8 text-center"><p role="status" className="text-muted">No coin bundles found. Try another name or amount.</p><Button variant="surface" onClick={onClear}>Clear search</Button></div>}
    </section>
  );
}

function CoinBundleCard({bundle, index, topTier, onBuy}: {bundle: CoinBundle; index: number; topTier: boolean; onBuy: () => void}) {
  return (
    <article className={vault.card} style={{"--tier": bundle.accent, "--i": index} as CSSProperties} data-coin-bundle={bundle.id}
      data-tagged={bundle.tag ? "" : undefined} data-top-tier={topTier || undefined}>
      <div className={vault.edge}>
        <div className={vault.plate}>
          <div className={vault.stage}>
            <span className={vault.rays} aria-hidden="true" />
            <Image src={publicAsset(`/assets/shop/coins/${bundle.id}.png`)} alt="" fill sizes="(max-width: 600px) 180px, 260px" className={vault.pile} />
            <span className={vault.sparkles} aria-hidden="true"><span /><span /><span /><span /></span>
            <span className={vault.sheen} aria-hidden="true" />
            {bundle.bonus > 0 && <span className={vault.burst}><b>+{bundle.bonus}%</b><small>Bonus</small></span>}
          </div>
          <div className={vault.info}>
            <span className={vault.name}>{bundle.label}</span>
            <strong className={vault.amount}><BrandIcon name="ozCoins" size={20} alt="" /><span>{formatInt(bundle.coins)}</span></strong>
          </div>
          <Button className={vault.buy} accent="var(--ds-color-accent-gold)" onClick={onBuy}
            label={`Add ${formatInt(bundle.coins)} coins with the ${bundle.label} bundle for ₹${formatInt(bundle.inr)}, demo`}>
            ₹{formatInt(bundle.inr)}
          </Button>
        </div>
      </div>
    </article>
  );
}
