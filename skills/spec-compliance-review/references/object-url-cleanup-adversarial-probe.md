# Object-URL ownership and cleanup adversarial probe

Use this when browser code creates a temporary object URL, triggers a download/share action, and must clean up even if injected browser APIs or DOM methods are hostile.

## Implementation invariant

Capture the URL API owner and both methods before the first side effect:

```js
const owner = window.URL;
const create = owner?.createObjectURL;
const revoke = owner?.revokeObjectURL;
let created = false;
let token;

try {
  token = create.call(owner, blob);
  created = true;
  // create/configure/append/click link
} finally {
  try { link?.remove?.(); } catch {}
  if (created) {
    try { revoke.call(owner, token); } catch {}
  }
}
```

Do **not** use the returned token itself as the creation sentinel. A guard such as `if (url !== null)` leaks when a hostile creator returns `null` without throwing, and can also falsely report a download as successful. Track successful return with a separate boolean.

## Deterministic matrix

After one valid baseline, vary the creator result independently:

- ordinary blob URL string;
- `null`;
- `undefined`;
- empty string;
- `0` and `false`;
- frozen object or other hostile value permitted by the harness.

For every non-throwing creator return, require:

1. creator called exactly once with `this === capturedOwner`;
2. captured revoker called exactly once with `this === capturedOwner` and the exact returned value;
3. no replacement owner or replacement method receives cleanup;
4. cleanup remains exactly once if href/download assignment, append, click, remove, or revoke throws;
5. a creator throw causes zero revoke calls;
6. the public result does not claim success when no valid downloadable URL was produced, if the contract validates the return shape.

Mutate both `window.URL` and `capturedOwner.revokeObjectURL` during `click()` and `remove()` to prove the implementation retained the original owner **and method**, not merely the owner object. Record create/revoke counts and exact argument identity.

## Review classification

If the contract explicitly requires hostile injected-API closure or cleanup after every successful creation, a sentinel collision is a merge blocker even when real browsers normally return strings. Green happy-path cleanup tests do not neutralize the missing hostile-value branch.
