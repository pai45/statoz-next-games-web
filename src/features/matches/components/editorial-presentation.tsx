"use client";
import { FootballIcon, CricketIcon, BasketballIcon, MotorsportIcon, TennisIcon } from "@statoz/design-system/games/icons";
import { colors } from "@statoz/design-system/games";
import { type CSSProperties } from "react";
import styles from "./editorial-discovery.module.css";
import { DiscoveryStatus, discoveryPlateClass } from '@statoz/design-system/games/components/data-display/discovery-card';
export function editorialSportStyle(sport?: string): CSSProperties { return { "--sport-accent": sport === "cricket" ? colors.accent.white : sport === "basketball" ? colors.accent.gold : sport === "motorsport" ? colors.accent.racing : colors.accent.cyan } as CSSProperties; }
export function EditorialStatus({ sport, ...props }: {
    label: string;
    status?: string;
    timing?: string;
    liveContext?: string;
    sport?: string;
    showMarker?: boolean;
}) {
    const Mark = sport === 'football' ? FootballIcon : sport === 'cricket' ? CricketIcon : sport === 'basketball' ? BasketballIcon : sport === 'motorsport' ? MotorsportIcon : sport === 'tennis' ? TennisIcon : undefined;
    return <DiscoveryStatus {...props} style={editorialSportStyle(sport)} marker={Mark ? <Mark size={16} aria-hidden/> : undefined}/>;
}
export const editorialPlateClass = discoveryPlateClass + ' ' + styles.plate;
