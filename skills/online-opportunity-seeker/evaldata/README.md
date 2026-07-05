# Online Opportunity Seeker eval fixture

This fixture describes the expected behavior for `skills/online-opportunity-seeker/EVAL.yaml`.

A passing response should behave like a practical opportunity research operator for a given vertical. It should not simply brainstorm startup ideas. It should show how the agent would search keyword demand, Reddit/community pain, existing Google results, app-store/play-store competitors, substitutes, and review complaints, then synthesize those signals into ranked product opportunities.

For the pet services prompt, the agent should cover plausible sub-verticals such as dog walkers, pet sitters, anxious first-time dog owners, pet-care scheduling, trust/safety, emergency instructions, owner updates, sitter matching, and routine tracking. Exact source access may vary by environment, so the response may use transparent search paths and demand proxies, but it must not fabricate exact trend numbers, app rankings, review counts, downloads, revenue, or quotes.

A strong answer should create or name durable artifacts under `.projects/<project-or-vertical>/research/`, especially an opportunity map, keyword map, community pain log, competitor matrix, opportunity shortlist, and validation plan. It should rank at least three opportunities and include evidence quality, competitive gaps, MVP wedge, acquisition keywords/communities, monetization hypothesis, risks, and validation tests. It should also route follow-up work to product-manager, ui-designer, marketer, project-manager, or implementation skills where appropriate.
