Aircraft Tracker V4

This version is set up so Cloudflare can deploy the ADS-B proxy directly from the same GitHub repository.

UPLOAD THESE 4 FILES TO THE ROOT OF YOUR GitHub Aircraft-tracker REPOSITORY:
- index.html
- worker.js
- wrangler.jsonc
- README.txt

CLOUDFLARE GITHUB CONNECTION
1. Open the existing Cloudflare Worker named aircraft-tracker-proxy.
2. Settings -> Builds -> Connect Git repository.
3. Choose GitHub and select the Aircraft-tracker repository.
4. Root directory: /
5. Deploy command: npx wrangler deploy
6. Save/Deploy.

The wrangler.jsonc file tells Cloudflare:
- Worker name: aircraft-tracker-proxy
- Worker entry file: worker.js
- workers.dev enabled

Once Cloudflare deploys successfully, the Worker URL remains:
https://aircraft-tracker-proxy.z666h7rrdw.workers.dev

Then open Aircraft Tracker V4 and, if asked once, paste that Worker URL into the proxy field.

V5: Added BUILD_TRIGGER.txt so uploading this full ZIP creates a fresh GitHub commit and triggers Cloudflare.
