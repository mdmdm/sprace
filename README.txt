Space Race translated browser revival — local review build
Serve this directory over HTTP(S); file:// does not support module/fetch loading.
Local check: python3 -m http.server 8872 --bind 127.0.0.1 --directory .
Open / for the welcome/help pages, /embed.html for embedding, or /game/ to play. All game assets and code are included locally.
Embedding: <iframe src="/space-race/game/" title="Space Race" allow="autoplay" style="width:100%;height:1100px;border:0"></iframe>
Use a stable iframe URL; scripts/modules/JSON/WAV/PNG must be served with correct MIME types. No CDN, remote service, build tooling or legacy binaries are required at runtime.
Audio starts on Play. Focus stays inside the game for keyboard input; blur/hidden pauses. Storage is optional and origin-scoped. An iframe sandbox needs allow-scripts and, for storage, allow-same-origin. Host CSP must permit its own module scripts, inline CSS, images, fetches and audio. No postMessage/host resizing API is provided.
The welcome-page visitor counter optionally contacts countapi.mileshilliard.com (connect-src https://countapi.mileshilliard.com if a CSP is set). The game does not depend on it. Open https://sprace.demarchis.net/?counter=ignore once in each owner/testing browser to save an exclusion before a counted visit. Local previews and detected automation never increment. See the source project's docs/VISITOR_COUNTER.md for limits and update instructions.
This is a desktop keyboard playtest with the newly designed Crew Access practice deck, 12 numbered saves and 2 alternates. No touch controls or verified campaign reconstruction. See STABILIZATION.md for source audit, approximations and unresolved route completion/Conundrum scheduling.
No publication or deployment has been performed.
