/** Fictional racing roster contract. No connection to player cards or economy. */
export type RacingTeam = {
    id: string;
    name: string;
    color: string;
    accent: string;
    drivers: readonly [
        string,
        string
    ];
};
