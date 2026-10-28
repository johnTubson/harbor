# Harbor

Multi-tenant marketplace platform — admin KYC portal, merchant catalog & orders, search, settlements.

## Auth

Short-lived JWT access tokens (default 15m) plus opaque refresh tokens stored hashed in Postgres. Refresh rotates on each use; reuse of a rotated token revokes the whole family. Admin and merchant Next apps use BFF routes (`/api/auth/*`) that set **httpOnly** refresh cookies — access tokens stay in memory, not `localStorage`.

## Stack

Turborepo · NestJS 11 · Next.js 16 · React 19 · Prisma 7 · PostgreSQL · Redis · BullMQ · MinIO · Docker Compose

## Quick start

```bash
cp .env.example .env
docker compose up -d
pnpm deps
pnpm db:migrate && pnpm db:seed
pnpm dev
```

| App             | URL                        |
| --------------- | -------------------------- |
| API (Swagger)   | http://localhost:4000/docs |
| Admin portal    | http://localhost:3011      |
| Merchant portal | http://localhost:3012      |
| Storefront      | http://localhost:3013      |

## Demo credentials

| Email                 | Password | Role                              |
| --------------------- | -------- | --------------------------------- |
| admin@harbor.demo     | demo1234 | Platform admin                    |
| merchant@harbor.demo  | demo1234 | Merchant admin (Harbor Demo Shop) |
| merchant2@harbor.demo | demo1234 | Merchant admin (Valley Organics)  |
| pending@harbor.demo   | demo1234 | Merchant admin (Pending Artisan)  |

## MinIO KYC upload (curl)

Request a presigned URL (merchant JWT), upload the file, then register the document:

```bash
# 1. Login as pending merchant
TOKEN=$(curl -s -X POST http://localhost:4000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"pending@harbor.demo","password":"demo1234"}' \
  | jq -r .accessToken)

# 2. Get presigned upload URL
UPLOAD=$(curl -s -X POST http://localhost:4000/storage/kyc/upload-url \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"type":"tax_certificate","fileName":"tax-cert.pdf","contentType":"application/pdf"}')

UPLOAD_URL=$(echo "$UPLOAD" | jq -r .uploadUrl)
OBJECT_KEY=$(echo "$UPLOAD" | jq -r .objectKey)

# 3. PUT file to MinIO
curl -X PUT "$UPLOAD_URL" \
  -H 'Content-Type: application/pdf' \
  --data-binary @./tax-cert.pdf

# 4. Register document in Harbor
curl -X POST http://localhost:4000/merchants/me/kyc-documents \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"type\":\"tax_certificate\",\"objectKey\":\"$OBJECT_KEY\",\"fileName\":\"tax-cert.pdf\"}"
```

Public product search:

```bash
curl 'http://localhost:4000/products/search?q=honey'
```

## Stripe (extension, test mode only)

The API talks to Stripe through a gateway selected by `STRIPE_MODE`:

- `fake` (default, CI): in-memory gateway. No account needed; webhook signatures are still verified.
- `test`: real test-mode keys (`sk_test_` / `rk_test_`). Live keys are rejected at boot.

Forward test webhooks locally with the [Stripe CLI](https://docs.stripe.com/stripe-cli):

```bash
stripe listen \
  --forward-to localhost:4000/webhooks/stripe \
  --forward-connect-to localhost:4000/webhooks/stripe/connect
```

`stripe listen` prints one signing secret that covers both forwards; put it in `STRIPE_WEBHOOK_SECRET` and `STRIPE_CONNECT_WEBHOOK_SECRET`. Deployed endpoints each get their own secret from the Dashboard. Design: [ADR-007](docs/adr/ADR-007-money-path.md).

### Platform setup (test mode, once per Stripe account)

Requires a platform account in a country that supports separate charges and transfers (US, UK, EEA, CA, AU, SG, …; **not** NG).

1. **Dashboard:** complete the Connect platform profile (Connect → Get started; marketplace, platform handles losses and fees).
2. **Dashboard:** Tax → set head office + add at least one registration.
3. Set `STRIPE_MODE=test`, `STRIPE_SECRET_KEY=sk_test_…` in `.env`, then:

```bash
pnpm stripe:setup --dry-run                                   # read-only report
pnpm stripe:setup                                             # Harbor Pro price + Customer Portal
pnpm stripe:setup --webhook-base-url=https://<deployed-api>   # + both webhook endpoints (prints secrets once)
```

The script is idempotent (looks up by price lookup key, portal metadata and endpoint URL) and exits `2` while any `!` action remains. Live keys are rejected.

## Scripts

```bash
pnpm test          # Vitest (API + shared)
pnpm test:e2e      # Playwright (requires Docker, build, free ports 3011/3012/4000)
```

## Monorepo structure

```
apps/api       — NestJS REST API
apps/admin     — Next.js platform admin
apps/merchant  — Next.js merchant portal
apps/storefront — Next.js buyer storefront + /demo (Stripe extension)
packages/shared — Zod schemas & types
```

## License

MIT — portfolio demonstration project.
