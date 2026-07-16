# Changelog

## [1.1.0] — 2026-07-16

### Added

- Refresh token rotation with family reuse detection
- `POST /auth/logout` to revoke refresh tokens
- Next.js BFF auth routes on admin and merchant (`/api/auth/login|refresh|logout`)
- httpOnly refresh cookies; access tokens held in memory (no `localStorage`)
- Integration tests for rotate / reuse-revoke / logout

### Changed

- Access token TTL default shortened to 15m (`JWT_ACCESS_TTL`)
- ADR-005 updated for BFF + rotation

## [1.0.0] — 2026-07-01

### Added

- Playwright e2e: admin login → approve pending merchant
- Playwright e2e: merchant login → create product
- API integration tests for auth, admin merchants, and audit log (22+ total)
- `docs/CASE_STUDY.md` STAR narrative for portfolio
- `docs/DEPLOY.md` — local demo, Vercel + Railway, Docker notes
- `docs/assets/architecture.mmd` and `architecture.png` export
- `pnpm test:e2e` and CI e2e job with Docker services
- Portfolio handoff: `harbor.json` with TenantGuard and fee calc snippets

### Fixed

- Admin and merchant dev/start ports aligned to 3011 / 3012 (README and `.env.example`)

### Phases complete

Phases 0–7: bootstrap through quality & deploy.
