# Review Tool Research

Research checked: 2026-07-25 PDT.

## Recommendation

Use **GitHub draft pull requests** as NoEgoDev's default review layer for Markdown and visual review bundles.

Why it fits NED:

- The repository remains the canonical source; no export/sync drift is required.
- GitHub renders Markdown prose and supports source/rendered rich diffs.
- Pull requests support line-level and multi-line review comments, threaded replies, review states, and resolved conversations.
- `gh`, REST, and GraphQL let NED list comments, identify unresolved threads, reply after a change, and call `resolveReviewThread` after verification.
- Screenshots can be embedded in `DESIGN_REVIEW.md`, while runnable HTML prototypes remain versioned and can link to existing deploy previews.
- It uses the project's existing GitHub authentication and collaborator model rather than requiring another account or paid annotation service.

The practical limitation is that GitHub comments are anchored to diff lines, not arbitrary pixel coordinates. NED compensates by placing each visual variant, screen, annotated hotspot, or cropped region on a separate stable `UI-*`/`A*` review row. This gives reviewers an in-context comment target while preserving an automatable resolution workflow.

## Official-source findings

### GitHub

- **Rendered Markdown/rich prose diff:** GitHub documents that prose documents in pull requests have source and rendered views, and that the rich diff highlights added and removed rendered prose.
- **Review comments:** GitHub's pull-request review workflow supports starting a review and adding line comments in `Files changed`.
- **Resolved conversations:** GitHub documents `Resolve conversation` on PR review threads for PR authors or collaborators with write access.
- **Automation:** GitHub GraphQL exposes `ResolveReviewThreadInput` with a required `threadId`; review threads and comments are queryable, and replies are available through the pull-request review-comment REST API.

Sources:

- https://docs.github.com/en/repositories/working-with-files/using-files/working-with-non-code-files
- https://docs.github.com/en/pull-requests/how-tos/review-pull-requests/reviewing-proposed-changes-in-a-pull-request
- https://docs.github.com/en/pull-requests/how-tos/review-pull-requests/commenting-on-a-pull-request
- https://docs.github.com/en/graphql/reference/mutations#resolvereviewthread
- https://docs.github.com/en/rest/pulls/comments
- https://cli.github.com/manual/gh_api

### Figma

Figma is useful when the project already uses it and reviewers need true coordinate-pinned visual comments. Its comments API supports reading comments, posting comments/replies, and positional `client_meta` values such as vectors, frame offsets, and regions.

It is not NED's default because it introduces a second artifact system and authentication requirement. The reviewed public REST comments endpoint documents GET, POST/reply, and DELETE operations but does not provide the same clearly automatable resolved-thread mutation that GitHub exposes. If Figma is used, accepted decisions must be mirrored to the canonical repository artifact and GitHub disposition log unless the user explicitly chooses Figma as canonical.

Source:

- https://developers.figma.com/docs/rest-api/comments-endpoints/

### Hypothesis

Hypothesis is an open annotation system with an API and works well for text/web-page annotation. It is less suitable as NED's default because it is not repository-native, does not naturally carry branches/commits/revisions, and does not provide the same PR approval and resolved-conversation lifecycle.

Source:

- https://h.readthedocs.io/en/latest/api-reference/

### Penpot and hosted visual-feedback products

Penpot is a credible open-source design platform and hosted visual-feedback products can provide pixel-pinned comments. They were not selected as the baseline because they add setup/accounts, source synchronization, and a less direct agent-readable resolution path than GitHub. Use them only when a project already depends on them or true coordinate feedback outweighs the extra workflow.

## Decision matrix

| Tool | Markdown review | Visual placement | Agent can read | Agent can reply | Agent can resolve | Canonical repo fit | Default |
|---|---:|---:|---:|---:|---:|---:|---:|
| GitHub draft PR | Excellent | Variant/screen/hotspot line anchors | Yes | Yes | Yes | Excellent | **Yes** |
| Figma | Weak for long Markdown | Excellent pixel/frame pins | Yes | Yes | Not selected as reliable default through reviewed public REST endpoint | Requires sync | Optional |
| Hypothesis | Good web-text annotation | Limited for product mockups | Yes | Yes | No native PR-style gate | Requires sync | No |
| Penpot/hosted feedback tools | Limited for canonical Markdown | Often strong | Varies | Varies | Varies | Requires sync/setup | Project-specific |

## Operational conclusion

The smallest reliable NED workflow is:

1. canonical Markdown/prototype source in the repository;
2. draft GitHub PR;
3. rendered review index with stable IDs and embedded images;
4. inline review threads;
5. agent reads threads through `gh`/GraphQL;
6. agent edits canonical source and regenerates evidence;
7. agent replies with the addressing revision;
8. agent resolves only verified/agreed threads;
9. user explicitly approves the artifact separately from merge.
