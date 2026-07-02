# Harbor

Multi-tenant marketplace platform — admin KYC portal, merchant catalog & orders, search, settlements.

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
packages/shared — Zod schemas & types
```

## License

MIT — portfolio demonstration project.
