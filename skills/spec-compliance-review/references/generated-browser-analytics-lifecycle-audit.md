# Generated browser analytics lifecycle audit

Use this checklist when a static generator adds canonical analytics to server-rendered pages or an SPA enhancement layer.

## Contract-to-runtime closure

A passing extracted-helper test is not enough. Trace the complete production chain:

1. renderer emits the semantic action and stable machine-readable attributes;
2. generator embeds every structured record needed for classification;
3. browser module reads that embedded payload rather than a test-only injected fixture;
4. delegated listener classifies the action from semantic attributes, not visible text, headings, or copy;
5. sender emits the exact event/property schema and a server-valid canonical path;
6. server accepts the emitted envelope on every supported serving surface.

Probe a valid rendered current-item click through the same initialization used by generated HTML. A common false success is a helper test that passes `contentItems` explicitly while production initializes from `data.contentItems || []` and the embedded data omits `contentItems`.

## Serving-prefix coherence

If the application supports both canonical-host routes and a path prefix such as `/app/...`, compare the client payload with server path validation. Sending raw `location.pathname` can cause prefixed events to be rejected when the server schema accepts only canonical paths. Probe both route forms against the actual validator or HTTP endpoint.

## Lifecycle matrix

Exercise the generated module, not only isolated functions:

- initial direct load;
- repeated initialization of the same navigation;
- internal SPA navigation to another entity and to a detail route;
- back/forward (`popstate`) navigation;
- passport to non-passport and non-passport to passport transitions;
- delegated click from nested descendants;
- one event object seen through bubbling versus a later distinct click;
- external source links remain unblocked;
- session/auth resolution before `signed_in` is captured.

Check that dedupe keys follow the contractual unit (navigation or browser action) and do not suppress later distinct actions.

## Semantic source classification

Biography/fact sources and official outbound actions may appear in the same source list. Do not infer event type from link text such as `official`, from an `<h3>` title, or solely from an ancestor container. Require action-level attributes carrying bounded taxonomy tokens (event kind, source type, module, content type, and current-item identity where needed). This prevents copy edits, duplicate titles, or DOM restructuring from changing analytics meaning.

## Interface boundaries

Derive `interface_id` from the supported-interface registry, including exact boundary widths. If a mobile contract includes a tablet width such as 768px, test that exact width; a predicate like `innerWidth < 768` silently classifies it as desktop.

## Generated document structure

For representative main and detail routes, assert exact counts for:

- one application root;
- one embedded data payload;
- one browser module;
- one required stylesheet;
- expected metadata/JSON-LD scripts without accidental duplication.

Also verify SPA document replacement preserves or refreshes the data needed by the new route.

## Privacy and taxonomy probes

Capture the exact request body and verify:

- canonical event name only; no legacy duplicate on the same action;
- exact common and event-specific property keys;
- `taxonomy_version` is fixed as required;
- no raw URL, free text, query, email, name, account ID, IP, user agent, or cross-event property;
- non-passport routes remain silent;
- group and individual identities remain correct across the cohort.

Finally, submit the captured body to the real server validator. Client-side allowlisting alone does not prove the event will be stored.