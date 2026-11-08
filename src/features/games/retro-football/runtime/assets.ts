import type { AssetManifest } from './contracts';
export async function loadAssets(url: URL, signal: AbortSignal) {
    const response = await fetch(url, { signal });
    if (!response.ok)
        throw new Error('Asset manifest could not load.');
    const manifest = await response.json() as AssetManifest;
    if (manifest.schemaVersion !== 1 || manifest.version !== 'football-chance-atlas-v2' || manifest.approval !== 'reference' || manifest.records.length !== 95)
        throw new Error('Unsupported football asset manifest.');
    const atlasUrl = new URL(manifest.atlasUrl, url);
    if (atlasUrl.origin !== url.origin)
        throw new Error('Unexpected atlas origin.');
    const atlasResponse = await fetch(atlasUrl, { signal });
    if (!atlasResponse.ok)
        throw new Error('Team atlas could not load.');
    const bytes = await atlasResponse.arrayBuffer();
    const digest = await crypto.subtle.digest('SHA-256', bytes), hash = Array.from(new Uint8Array(digest), n => n.toString(16).padStart(2, '0')).join('');
    if (hash !== manifest.atlasSha256)
        throw new Error('Team atlas integrity check failed.');
    if (signal.aborted)
        throw new DOMException('Aborted', 'AbortError');
    const blobUrl = URL.createObjectURL(new Blob([bytes], { type: 'image/png' }));
    try {
        const image = new Image();
        image.src = blobUrl;
        await image.decode();
        if (signal.aborted)
            throw new DOMException('Aborted', 'AbortError');
        if (image.naturalWidth !== manifest.atlasSize[0] || image.naturalHeight !== manifest.atlasSize[1])
            throw new Error('Team atlas dimensions changed.');
        return { manifest, image };
    }
    finally {
        URL.revokeObjectURL(blobUrl);
    }
}
