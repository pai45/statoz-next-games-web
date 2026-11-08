export type AssetRecord = {
  url: string;
  hash: string;
  bytes: number;
};

export type AssetPackSummary = {
  packId: string;
  revision: string;
  totalBytes: number;
  entryUrl: string;
  manifestUrl: string;
};

export type AssetPackIndex = {
  schemaVersion: 2;
  buildId: string;
  basePath: string;
  core: AssetPackSummary;
  games: Record<string, AssetPackSummary>;
};

export type AssetPackManifest = {
  schemaVersion: 2;
  packId: string;
  gameId?: string;
  buildId: string;
  revision: string;
  basePath: string;
  entryUrl: string;
  entryUrls?: string[];
  totalBytes: number;
  files: AssetRecord[];
};

export type GameInstallState =
  | "checking"
  | "not-installed"
  | "downloading"
  | "installed"
  | "updating"
  | "error"
  | "cancelled";

export type DownloadProgress = {
  state: GameInstallState;
  completedBytes: number;
  totalBytes: number;
  error?: string;
};
