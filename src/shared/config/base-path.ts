const rawBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const basePath = rawBasePath.endsWith("/")
  ? rawBasePath.slice(0, -1)
  : rawBasePath;

export function publicAsset(path: string) {
  if (!path.startsWith("/")) return path;
  return `${basePath}${path}`;
}
