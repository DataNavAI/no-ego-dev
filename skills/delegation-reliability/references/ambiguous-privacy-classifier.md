# Ambiguous URI-versus-prose boundary review

Use only when a privacy classifier must reject URI/body-like text while preserving natural prose. Apply it to every in-scope sibling field role, not to arbitrary delegation payloads.

Probe scheme-only and payload forms, malformed HTTP forms, custom schemes, encoded whitespace around colons, malformed and layered encoding, punctuation and nested delimiters, hidden scheme tokens, body-like text, and hostile collection shapes. Retain explicit compatibility controls for ordinary colon prose, multi-word and punctuated prose, contractions, quotations, and Unicode-space variants.

Do not rely on a denylist, broad regex, word-count exemption, or cue word. Parse bounded delimiter/quote state, inspect every scheme-shaped token before each colon, and apply prose compatibility only after proving no hostile token exists. Fail closed on malformed, mismatched, unbounded, or residual-encoded structures. Aggregate review evidence must identify matrix cells, exact candidate/base, changed paths, validation, and an explicit verdict; test counts or omitted verdicts never imply approval.
