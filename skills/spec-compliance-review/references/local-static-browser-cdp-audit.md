# Local static-browser audit with Chrome CDP

Use this when an immutable static web candidate has no Playwright/Puppeteer dependency, ordinary browser navigation cannot reach loopback, and a real rendered-browser probe is still needed. This is a verification technique, not a claim that any browser tool is unavailable.

## Preconditions

- Keep the reviewed checkout read-only.
- Serve it with a tracked background process from the exact checkout.
- Use a unique loopback port and a unique disposable Chrome profile.
- Record the exact SHA and clean status before and after.
- Load the candidate URL by launching Chrome with the URL directly. Then connect to the page target through Chrome's DevTools WebSocket endpoint.

## Procedure

1. Identify and serve the **actual emitted build directory** from the exact checkout. Do not assume `public/`, repository root, or any conventional output name. Inspect the canonical build script/package command, run the permitted build in a disposable reviewer checkout when necessary, then prove the served root before browser work:

```sh
python3 -m http.server "$PORT" --bind 127.0.0.1 --directory "$EMITTED_DIR"
curl -fsS -o /dev/null -w '%{http_code}\n' "http://127.0.0.1:$PORT/"
```

Require the expected success status and, for stronger immutable binding, hash served HTML/CSS/JS against the reviewed output. A healthy process serving the wrong directory is a harness failure, not product evidence.

2. Launch a disposable headless Chrome instance:

```sh
CHROME='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' # macOS example
PROFILE="$(mktemp -d)"
"$CHROME" --headless=new \
  --remote-debugging-port="$CDP_PORT" \
  --user-data-dir="$PROFILE" \
  --no-first-run --no-default-browser-check \
  "http://127.0.0.1:$PORT/path/to/candidate/"
```

Use the platform's discovered Chrome/Chromium executable rather than hard-coding this example.

3. Query `http://127.0.0.1:$CDP_PORT/json`, select the exact candidate page target, and connect to its `webSocketDebuggerUrl`. Python's `websockets.sync.client.connect` is sufficient when no browser library is installed. On Node 22+, the built-in global `WebSocket` is another dependency-free option; pair request IDs with pending promises and route method-only messages to event listeners. Verify that the endpoint returned a real `ws://` or `wss://` URL before connecting—do not pass the HTTP discovery URL to a WebSocket client.

4. Send CDP messages with monotonically increasing IDs. At minimum use:

- `Emulation.setDeviceMetricsOverride` for each authoritative viewport;
- `Page.navigate` for route/query variants;
- `Runtime.evaluate` for rendered-state assertions and interaction journeys;
- `Runtime.enable` for exceptions and console calls;
- `Network.enable` plus `Network.responseReceived` for HTTP status evidence.

Reset per-route network/console buffers immediately before each navigation. Explicitly allowlist only contract-expected failures (for example, an intentionally absent canonical release on an unavailable route); a first-page-only favicon 404 or another incidental request remains unexpected until the product declares or suppresses it.

### Prove the layout viewport, not only the bitmap size

Do not treat `--window-size=390,844` or a 390×844 PNG as proof that Chrome laid the page out at 390 CSS pixels. Headless Chrome can honor a wider platform/window minimum and then crop the captured bitmap, making correctly wrapping controls appear clipped—or hiding real responsive defects.

For every claimed viewport:

1. Apply `Emulation.setDeviceMetricsOverride` before navigation with explicit `width`, `height`, `deviceScaleFactor`, `mobile`, `screenWidth`, and `screenHeight`.
2. After the app sentinel is ready, evaluate and record at least:
   - `innerWidth` and `innerHeight`;
   - `document.documentElement.scrollWidth` and `scrollHeight`;
   - bounding rectangles for every critical control and its clipping ancestor.
3. Require `innerWidth` to equal the requested width. For a no-horizontal-overflow contract, also require `scrollWidth <= innerWidth` and every critical rectangle to stay within `0…innerWidth`.
4. Capture the screenshot only after those assertions pass, and bind the screenshot plus metrics to the same page target and runtime state.

A cropped command-line screenshot may still be useful as a visual hint, but classify it as non-authoritative until the CDP metrics prove the actual layout viewport.

### Avoid responsive-assertion false negatives

Assert the contract appropriate to each breakpoint, not one mobile invariant at every width. For a mobile bottom navigation, require `display != none`, computed `position: fixed`, its live bottom edge at the viewport bottom, and non-negative bottom clearance after scrolling the last meaningful content fully into view. At a desktop breakpoint where the same mobile nav is intentionally hidden, require computed `display: none`; zero-sized hidden-element rectangles such as `bottom - innerHeight` are not geometry defects. Record both computed display and position so the harness cannot misclassify intentional responsive behavior.

For native `<dialog>` keyboard probes, a synthetic CDP Escape often needs complete key metadata. A reliable sequence is `Input.dispatchKeyEvent` with `type: rawKeyDown`, `key/code: Escape`, `windowsVirtualKeyCode: 27`, and the platform's native key code, followed by matching `keyUp`. Verify both `dialog.open === false` and focus restoration to the opener. If the incomplete key event fails while click-close tests pass, fix the probe before reporting a keyboard blocker.

Wait for both `document.readyState === 'complete'` and the app's actual runtime sentinel before testing. After every `Page.navigate` or SPA route transition, wait for the destination-specific sentinel again; a fixed sleep is not sufficient.

Treat missing or unserializable evaluation values as probe failures. Assert every required result object is non-null and contains its expected keys before comparing values. In particular, never let `null == null`, two empty objects, or absent arrays produce a false-success equality result. Print target URL, title, runtime sentinel, and a short DOM prefix when a wait or evaluation fails.

For rendered-markup contracts that need no interaction, use Chrome's deterministic `--dump-dom` mode as a simpler fail-closed first layer:

```sh
"$CHROME" --headless=new --no-first-run --disable-gpu \
  --dump-dom "http://127.0.0.1:$PORT/path/?view=DS-04" > "$REVIEWER_TMP/rendered.html"
```

Parse that disposable output for exact copy, cardinality, route attributes, sibling interaction structure, fixture labels, and forbidden claims. Keep CDP for focus, history, dynamic rerenders, computed styles, console capture, and accessibility. Remove dumped files afterward.

5. For accessibility, inject the locally installed `axe.min.js` text with `Runtime.evaluate`, then execute `axe.run`. Record violations separately from `incomplete` results. Manually inspect every serious/critical incomplete result; “zero violations” does not mean “no manual checks.”

6. Exercise behavior, not only DOM presence. For selected-entity lessons, verify:

- primary/secondary CTA order;
- URL/query identity preservation;
- first rendered entity belongs to the selected cohort;
- Next and Previous change and restore state;
- focus lands on the updated heading;
- overflow at every required viewport.

7. Classify harness-only errors before reporting them. A missing shared plugin or injected review script is not a candidate regression when the same reference exists in the parent and the documented production/hub harness owns it. Preserve the observation, prove it is baseline/harness-specific, and do not silently count it as an application pass.

8. Stop Chrome and the static server, remove the disposable profile, and recheck exact SHA plus clean status.

## Evidence reporting

Report fresh counts actually observed: routes × viewports, accessibility violations, overflow views, journey outcomes, runtime exceptions, and any excluded harness-only errors with their classification basis. Do not repeat a committed evidence summary as though it were freshly rerun.