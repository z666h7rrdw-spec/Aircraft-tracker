Aircraft Tracker V6

Upload all files in this ZIP to the root of the Aircraft-tracker GitHub repository.
Cloudflare is already connected to the repository, so this commit should redeploy the Worker automatically.

V6 adds a 'Find a Live Aircraft Now' test button. The Worker queries a busy-airspace area and returns an aircraft actually visible in the live ADS-B feed, eliminating the need to guess a flight number or tail number for testing.
