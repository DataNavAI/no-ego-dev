# Message rendering direction

Status: implementation direction; rendered acceptance and independent approval remain outstanding.

## Observed research

The signed-in Antigravity conversation was inspected at 1280×800 using `/tmp/ned-single-chat/antigravity-message.png` and `/tmp/ned-single-chat/antigravity-message-expanded.png`. The useful transferable patterns are a max-768px reading column, a fine outlined user turn, unboxed assistant prose, 14px body text at roughly 24px line height, compact 16px/600 headings, generous section spacing, subdued dividers, quiet collapsible activity, and message actions beneath the content. Account, machine, model, timing, private reasoning, and conversation content are not product requirements and are not copied into fixtures.

## Intended states

- User: preserve the submitted text literally, including Markdown-like punctuation, inside the existing fine outline.
- Assistant: render semantic Markdown with local pinned libraries and the existing strict sanitizer; keep paragraphs, headings, lists, tables, links and code readable without turning the reply into a card.
- Activity: show only actual provider tool names, arguments, results, and unknown structured records in collapsed native details. Never synthesize thought text, duration, reasoning fields, or tool facts.
- Copy: expose an accessible explicit control below real prose. Copy the stored prose text, not generated HTML or collapsed tool/private disclosures. Clipboard failure leaves the control available and reports success/failure through visible text and a polite live status.
- Resilience: payloads over 64 KiB and structures beyond 100 parts/depth 32 retain the existing lossless plain-data fallback. Long literals, code and tables remain contained at 320px. Fallback content whose prose cannot be safely separated has no copy action; display remains lossless.

## Implementation acceptance

| ID | Required result | Deterministic evidence | Rendered evidence |
| --- | --- | --- | --- |
| UI-AC-10 | User Markdown-like text stays literal; assistant Markdown is sanitized and semantic. | TC-013 renderer cases | Desktop/mobile transcript capture |
| UI-AC-11 | Actual tool/data content is preserved in collapsed, labelled details with no invented reasoning. | TC-013 mixed-content and bounds cases | Expanded/collapsed activity capture |
| UI-AC-12 | Copy occurs only after activation, excludes tool disclosures, and truthfully exposes failure. | TC-013 clipboard cases | Keyboard focus and mobile target inspection |
| UI-AC-13 | Typography follows the observed readable column without changing shell/composer geometry or causing horizontal overflow. | Scoped selectors and existing layout tests | 1280×800, 390×844, 320px and 200% text inspection |

No approval or browser acceptance is claimed by this document.
