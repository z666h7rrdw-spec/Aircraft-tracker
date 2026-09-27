Aircraft Tracker V3

FILES
- index.html      -> replace the current index.html in the GitHub Aircraft-tracker repository
- worker.js       -> paste this into a Cloudflare Worker and deploy it

CLOUDFLARE WORKER SETUP
1. Create/sign in to a Cloudflare account.
2. Go to Workers & Pages.
3. Create application -> Create Worker.
4. Open the Worker editor.
5. Replace the sample code with worker.js from this ZIP.
6. Deploy.
7. Copy the https://...workers.dev URL.
8. Open Aircraft Tracker V3. It will ask for the Worker URL once.
9. Paste the Worker URL and tap Save Proxy.

The proxy tries ADSB.lol first, then ADSB One, then adsb.fi.
The front-end refreshes every 15 seconds.
