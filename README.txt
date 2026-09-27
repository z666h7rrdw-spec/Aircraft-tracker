Aircraft Tracker V7

Upload ALL files in this ZIP to the root of the Aircraft-tracker GitHub repository and commit them.
V7 intentionally uses a NEW Worker filename: worker-v7.js.
wrangler.jsonc points Cloudflare to worker-v7.js, which prevents the older worker.js from being reused.
The tracker page also includes no-cache markers and displays LIVE ADS-B TEST V7 at the top.

After GitHub commits the upload, Cloudflare should automatically redeploy from the connected repository.
