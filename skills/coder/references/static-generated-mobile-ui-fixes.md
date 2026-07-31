# Static-generated mobile UI fixes

Use this reference when a mobile screenshot points to a visible issue on a static-generated product page (for example: an event card missing dates).

## Pattern for generated event pages

- Anchor the screenshot first: identify the exact route/page, visible cards, missing field, and whether the issue is top cards, feed rows, or both.
- Find the generator source, not only the generated HTML. Trace output files back to the owning generator and data model.
- Add a regression assertion against the served route via the host/path the user sees, including representative visible values from the failing card or feed row.
- Update both the generator source and regenerated static output. Do not hand-edit generated HTML only unless the generator is deliberately out of scope.
- Verify in this order:
  1. `npm test`
  2. `npm run build`
  3. deploy workflow / CI if the repo has one
  4. browser or HTTP check against the live public URL
- Final report should name the screenshot target, exact visible copy now present, commands/results, deploy result, and live URL checked.

## Pitfall

Static-generated UIs often have several representations of the same page: generator source, committed generated output, server route tests, and deployed HTML. A fix is incomplete until the visible live route has the corrected copy, not just local source.
