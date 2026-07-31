# Selector-to-renderer closure

Use this probe when a change claims newly accepted inventory will appear as cards, rows, or generated sections.

## Boundary-count recipe

Run the same authoritative fixture and decision clock through each production boundary and record identity-preserving counts:

1. raw candidate inventory;
2. normalized inventory;
3. publishable inventory;
4. exact-entity selector output;
5. page-model/projection output;
6. renderer output;
7. final generated artifact.

A positive count followed by zero identifies the dropping boundary. Do not infer rendered success from selector tests.

## Own-`undefined` failure mode

JavaScript normalizers often construct broad records such as:

```js
const record = {
  contentType,
  scheduleSubtype, // undefined for non-schedules
};
```

A strict JSON-like clone may accept only `null`, strings, booleans, finite numbers, arrays, and plain objects, then reject `undefined`. If the page-model layer catches clone errors and treats the record as optional, every otherwise-valid selected row can disappear into an honest-empty state.

Probe selected records with:

```js
Object.keys(record).filter((key) => record[key] === undefined)
```

Then compare selector count with the page-model count using the same entity and clock. Verify the generated artifact separately in an output directory created under the runtime's canonical temporary directory.

## Required test shape

The regression test must use the real normalized production-shaped record and assert all of:

- publication gate accepts it;
- entity selector returns it;
- page-model builder retains it;
- renderer emits its exact title, source receipt, timestamps, and action;
- generated route contains the card rather than the empty state.

Hand-built selector-only fixtures are insufficient because they may omit the own-`undefined` property that triggers the production failure.
