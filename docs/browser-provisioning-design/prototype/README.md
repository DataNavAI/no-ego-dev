# Browser provisioning prototypes

Run from the repository root:

```bash
python3 -m http.server 4173 --directory docs/browser-provisioning-design/prototype
```

Open:

- `http://127.0.0.1:4173/guided.html` (`UI-01`)
- `http://127.0.0.1:4173/focused.html` (`UI-02`)
- `http://127.0.0.1:4173/lobby.html` (`UI-03`)

Use the state pills to inspect entry, authorization, progress, failure, ready/first request, resume, and destroy confirmation. Add `?state=storyboard` for a capture-friendly overview of every required state.

These are review-only, local prototypes. Provider actions are simulated and make no network requests.
