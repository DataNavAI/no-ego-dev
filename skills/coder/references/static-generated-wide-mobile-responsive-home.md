# Static Generated Wide-Mobile Responsive Home Fixes

Use when a mobile-first generated app looks correct at narrow phone widths but breaks in Android Chrome/tablet/landscape or desktop-mobile browser widths: a narrow app column, unused right-side space, horizontal-looking dead margin, or fixed bottom nav no longer matching the content.

## Durable pattern

1. Reproduce at the reported wide viewport, not only 390×844. Android Chrome screenshots with browser UI can expose widths around 1000–1200 CSS px.
2. Measure with a real browser/CDP:
   - `innerWidth`
   - `document.documentElement.scrollWidth`
   - main/app shell rect
   - feed/list rect
   - first card rect
   - bottom nav rect
   - computed grid columns
3. Do not just remove max-width on the shell. A single giant feed column is still not responsive. At wide mobile/tablet breakpoints, convert the home screen into a wider layout, e.g. hero/header column + responsive card grid.
4. Keep narrow phone behavior intact with a separate breakpoint check around 390–430px.
5. Add generator-source CSS and a route-level test asserting the responsive rule exists, then regenerate checked-in assets.
6. Capture a screenshot under the wide viewport and visually confirm the right side is populated with content, cards are readable, and bottom nav remains inside the viewport.

## Example CSS shape

```css
@media(min-width:720px){
  .home-redesign.mock-mobile-shell.cuj-home{
    display:grid;
    grid-template-columns:minmax(260px,34vw) minmax(0,1fr);
    grid-template-areas:
      "hero search"
      "hero feed";
    grid-template-rows:auto 1fr;
    gap:18px;
    width:100%;
    max-width:none;
  }
  .cuj-home .full-mock-header{grid-area:hero; min-height:auto;}
  .cuj-home .home-search-card{grid-area:search;}
  .cuj-home .personalized-home{grid-area:feed; min-width:0; margin:0;}
  .home-feed.full-feed{
    display:grid;
    grid-template-columns:repeat(auto-fit,minmax(230px,1fr));
  }
  .bottom-nav{
    width:min(560px,calc(100vw - 28px));
    max-width:560px;
  }
}

@media(max-width:560px){
  .cuj-home .home-search-card,
  .cuj-home .home-search,
  .cuj-home .keyword-suggestions{
    width:100%;
    max-width:100%;
    min-width:0;
    overflow:hidden;
  }
  .cuj-home .home-search{grid-template-columns:1fr;}
  .cuj-home .keyword-suggestions{display:grid; grid-template-columns:1fr;}
}
```

## Acceptance evidence

- Full generated-site tests pass.
- Wide viewport CDP shows `main.width == innerWidth`, `scrollWidth <= innerWidth`, and a multi-column feed grid.
- If the page has a hero/search/feed split, verify explicit placement: the feed rect should sit in the content rail, not below a tall sticky hero. CSS Grid auto-placement can silently put `hero` in column 1, `search` in column 2, then push `feed` into the next row under the hero; fix with `grid-template-areas` (for example `"hero search" "hero feed"`) and assign `grid-area` for each section.
- Wide screenshot at the reported size shows no blank/right dead zone and visible useful content above the fold.
- Narrow viewport CDP still shows `scrollWidth <= innerWidth`, bottom nav fully inside the viewport, and no clipped home search controls, suggestion chips/cards, or section header actions (for example a `Manage` pill). When a wide-view fix adds grid/flex overrides, add a separate `max-width` guard for narrow search/suggestion overflow.
