# Source-to-dashboard contract

| Decision | Required meaning |
| --- | --- |
| Identity | Stable product user/account or documented anonymous identity; explain limitations, never infer people from request count |
| Activity | Explicit qualifying event/filter, distinct identities per reporting day |
| Conversion | Explicit business event/filter, counting distinct converters or conversion events; state which |
| Rate | Explicit eligible denominator and window; zero denominator => null/N/A |
| Calendar | IANA reporting timezone; source timestamp interpretation, inclusive dates, partial current day |
| Exclusions | Agreed bot/internal/test policy applied consistently to numerator and denominator |
| Coverage | Complete/partial/missing by date; missing is unknown, not zero |
| Aggregation | Latest/average DAU are valid summaries; period unique users require source-level distinct query, not daily sum |
| Freshness | Data-through/source coverage is separate from last successful query/sync; source failure cannot look fresh |
| Sync | Transactional daily replacement/upsert, bounded overlap for late arrivals, duplicate-safe retry, last-good preservation |
| Privacy | Aggregates only to browser; identities/credentials stay server-side, source permissions read-only |

A direct SQLite connection uses URI mode=ro. PostgreSQL should have a genuinely restricted role; read-only transaction settings supplement that role. Use existing drivers; never assemble SQL from browser date input. Validate dates, bound ranges and parameterize source queries. Do not create/alter tables or views in the product database just to support a dashboard without explicit authority.
