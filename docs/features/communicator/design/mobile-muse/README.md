# Muse-inspired mobile NED

[Guidance image](guide.png) / [renderable source](guide.html). This is a synthetic proposal, not an implemented screenshot. The user's supplied Muse mobile screenshot is the primary visual reference; it is private and is not copied here.

Official benchmark: [How We Designed Muse](https://muse.ai/blog/how-we-designed-muse), particularly conversation bubbles, Goals and structured controls. No signed-in Muse inspection is claimed. From the supplied screenshot: persistent bottom navigation, floating top actions, quiet white canvas, rounded content surfaces, a pill composer above navigation and a floating latest-message control. Adapt the pattern to NED's actual capabilities; no Call/Gift/Microphone placeholders.

Use Chat, Goals, Preview and More at the bottom. More retains Dashboard/Artifacts/Settings/Debug. Move the existing More menu node rather than clone private controls. Hide the duplicate project tab strip on mobile; keep desktop rail and tabs. The project shortcut restores the last project view; Back and bottom Chat restore conversation context. Keep original single session, references/media, protected forms, version/model and Preview DOM.

Composer and navigation have separate rows. Safe-area padding belongs to navigation, and navigation yields space in keyboard-sized viewports. Review actual pixels at320/390/430, landscape/short viewport, enlarged text and desktop. [FR-102–105/CUJ-036/TC-057–058](../../SPEC.md#muse-inspired-mobile-navigation-279) are authoritative.
