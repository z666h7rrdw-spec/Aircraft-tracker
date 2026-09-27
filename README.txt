Aircraft Tracker V8

Upload ALL files in this ZIP to the root of the Aircraft-tracker GitHub repository and commit them.
Cloudflare is already connected and should redeploy automatically.

V8 uses worker-v8.js so Cloudflare cannot reuse an older worker file.
It searches a 250 NM radius around Atlanta for a currently airborne aircraft and reports provider diagnostics if no sample is returned.
