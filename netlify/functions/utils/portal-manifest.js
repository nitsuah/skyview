/**
 * Client file manifests for the client-portal gallery.
 *
 * A real per-client manifest keyed by clientId (backed by Netlify Blobs,
 * S3, or similar — see docs/CLIENT_PORTAL.md) is future work. Until that
 * storage backend exists, every verified session receives the same demo
 * manifest, built from real static assets already shipped under
 * /assets/gallery — not the placeholder filenames the old client-side
 * prototype referenced (e.g. `assets/gallery/event-1.jpg`, which never
 * existed) — so the file-delivery flow (session verify -> manifest ->
 * signed download link -> file) is genuinely exercised end-to-end rather
 * than being purely cosmetic.
 *
 * `clientId` is accepted by both functions below so callers don't need to
 * change once a real per-client store is wired in.
 */

const DEMO_MANIFEST = {
    projectName: 'Aerial Media Sample Delivery',
    deliveredAt: '2025-12-10',
    files: [
        {
            id: 'aerial-waterfront',
            title: 'Aerial Waterfront Overview',
            type: 'photo',
            meta: 'Photo · JPG',
            path: '/assets/gallery/aerial-waterfront.jpg',
        },
        {
            id: 'dji-example-1',
            title: 'DJI Capture 1',
            type: 'photo',
            meta: 'Photo · JPG',
            path: '/assets/gallery/dji-example-1.jpg',
        },
        {
            id: 'dji-example-2',
            title: 'DJI Capture 2',
            type: 'photo',
            meta: 'Photo · JPG',
            path: '/assets/gallery/dji-example-2.jpg',
        },
        {
            id: 'dji-example-3',
            title: 'DJI Capture 3 (RAW-quality)',
            type: 'raw',
            meta: 'RAW-quality · JPG',
            path: '/assets/gallery/dji-example-3.jpg',
        },
        {
            id: 'sunset-marina',
            title: 'Sunset Marina',
            type: 'video',
            meta: 'Video · MP4',
            path: '/assets/gallery/sunset-marina.mp4',
        },
    ],
};

/**
 * @param {string} clientId
 * @returns {{ projectName: string, deliveredAt: string, files: Array<{id:string,title:string,type:string,meta:string,path:string}> }}
 */
export function getManifestForClient(clientId) {
    void clientId; // placeholder single manifest until a real per-client store exists
    return DEMO_MANIFEST;
}

/**
 * @param {string} clientId
 * @param {string} fileId
 * @returns {{id:string,title:string,type:string,meta:string,path:string}|null}
 */
export function findFile(clientId, fileId) {
    const manifest = getManifestForClient(clientId);
    return manifest.files.find((f) => f.id === fileId) || null;
}
