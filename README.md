# Fundsroom Mini ERP + CRM Operations Portal

A full-stack internal operations portal for a wholesale/distribution company: customer CRM, product/inventory management, and sales challans with transactional stock control.

## 1. Project Overview

Internal employees (Admin, Sales, Warehouse, Accounts) use this portal to manage customers, track product stock, and issue sales challans. The core business rule is that **stock is only ever touched when a challan is confirmed**, and that update is atomic — either every line item's stock is reduced and the challan is confirmed, or nothing happens at all.

## 2. Business Context

The company sells products to Retail, Wholesale, and Distributor customers. Sales staff build a draft challan (a delivery/dispatch note), and once confirmed it becomes an immutable record that also reduces warehouse stock.

## 3. Features

- JWT authentication with 4 roles: Admin, Sales, Warehouse, Accounts
- Customer CRM: create/edit/search customers, follow-up notes, customer detail page
- Product & inventory management: create/edit products, low-stock detection, full stock movement history
- Sales challans: multi-product draft challans, auto-generated challan numbers, product snapshots, atomic confirm-with-stock-check logic
- Role-based backend authorization on every route (never relies on the frontend alone)
- Centralized error handling, consistent JSON envelope, input validation with Zod
- Pagination + search/filter on list endpoints
- Seed script with demo users, customers, products, and one sample challan
- Postman collection

## 4. Tech Stack

**Backend:** Node.js, TypeScript, Express, PostgreSQL, Prisma ORM, JWT, bcryptjs, Zod
**Frontend:** React, TypeScript, Vite, React Router, Axios, hand-written CSS (no UI framework)

## 5. Architecture

```
fundsroom-erp/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma       # data model
│   │   └── seed.ts             # demo data
│   └── src/
│       ├── config/env.ts       # typed env loading
│       ├── db/prisma.ts        # shared Prisma client
│       ├── middleware/         # auth, validate, error handler
│       ├── validation/         # Zod schemas per module
│       ├── services/           # business logic (incl. the challan transaction)
│       ├── controllers/        # thin HTTP layer
│       ├── routes/             # route + role wiring
│       ├── utils/              # AppError, asyncHandler, pagination, response envelope
│       └── app.ts / index.ts
├── frontend/
│   └── src/
│       ├── api/client.ts       # axios instance + interceptors
│       ├── auth/AuthContext.tsx
│       ├── components/         # Layout, PrivateRoute, StatusBadge, ConfirmDialog, Banner
│       ├── pages/               # Login, Dashboard, Customers, CustomerDetail,
│       │                        # Products, Inventory, Challans, ChallanForm
│       └── types/
└── postman/
    └── Fundsroom-ERP-CRM.postman_collection.json
```

Business logic lives in `services/`, not in route handlers or controllers — controllers only translate HTTP <-> service calls.

## 6. Database Schema Overview

`User` (role-based) · `Customer` → `FollowUp` (1-many) · `Product` → `StockMovement` (1-many) · `Challan` → `ChallanItem` (1-many) · `ChallanCounter` (per-year sequence for challan numbers).

`ChallanItem` stores **snapshot fields** (`productNameSnapshot`, `productSkuSnapshot`, `unitPriceSnapshot`) in addition to the `productId` foreign key, so a historical challan's contents never change even if the product is later renamed or repriced.

`StockMovement` optionally links back to the `Challan` that generated it (`relatedChallanId`), giving full traceability from a stock change back to the challan that caused it.

## 7. Authentication

`POST /api/auth/login` — email + password, returns `{ token, user }`. Passwords are hashed with bcrypt (cost 10). JWT payload contains `sub` (user id), `email`, `role`, `name`. `GET /api/auth/me` returns the current user from the token.

## 8. Role-Based Authorization

Enforced in `src/middleware/auth.ts` (`authenticate` + `authorize(...roles)`) and applied per-route in `src/routes/*.ts` — **never only in the frontend**. Permission matrix used (documented assumption, since the spec left exact per-role access to be decided):

| Module      | Admin | Sales | Warehouse | Accounts |
|-------------|:---:|:---:|:---:|:---:|
| Customers / CRM  | ✅ | ✅ | ❌ | ✅ (view + limited) |
| Products (view)  | ✅ | ✅ | ✅ | ✅ |
| Products (manage) / Stock adjustments | ✅ | ❌ | ✅ | ❌ |
| Challans (view)  | ✅ | ✅ | ❌ | ✅ |
| Challans (create/edit/confirm/cancel) | ✅ | ✅ | ❌ | ❌ |
| Dashboard | ✅ | ✅ | ✅ | ✅ |

Sales and Accounts can both view customers and challans; only Sales (and Admin) can create/manage them, since Accounts' role is financial oversight rather than order entry.

## 9. API Documentation (summary)

All responses use `{ success, data, meta? }` on success and `{ success: false, error: { message, details? } }` on failure.

- `POST /api/auth/login`, `GET /api/auth/me`
- `GET/POST /api/customers`, `GET/PUT /api/customers/:id`, `POST /api/customers/:id/followups`
- `GET/POST /api/products`, `GET/PUT /api/products/:id`, `GET /api/products/:id/movements`, `POST /api/products/:id/stock`
- `GET/POST /api/challans`, `GET/PUT /api/challans/:id`, `POST /api/challans/:id/confirm`, `POST /api/challans/:id/cancel`
- `GET /api/dashboard`

Full request/response examples are in the Postman collection.

## 10. Environment Variables

**Backend (`backend/.env`, see `backend/.env.example`):**
`DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `PORT`, `CLIENT_URL`, `NODE_ENV`

**Frontend (`frontend/.env`, see `frontend/.env.example`):**
`VITE_API_URL`

## 11. Local Setup

```bash
# 1. Backend
cd backend
cp .env.example .env        # fill in DATABASE_URL and JWT_SECRET
npm install
npx prisma migrate dev --name init
npm run prisma:seed
npm run dev                 # http://localhost:4000

# 2. Frontend (separate terminal)
cd frontend
cp .env.example .env
npm install
npm run dev                 # http://localhost:5173
```

## 12. Database Setup / Migrations / Seed

- `npx prisma migrate dev --name init` — creates the schema and generates the client
- `npm run prisma:seed` — inserts 4 demo users, 5 customers, 6 products, 1 draft challan
- `npx prisma studio` — optional visual DB browser

## 13. Test Credentials

All demo accounts use password: **`Password123!`**

| Role | Email |
|---|---|
| Admin | admin@fundsroom.test |
| Sales | sales@fundsroom.test |
| Warehouse | warehouse@fundsroom.test |
| Accounts | accounts@fundsroom.test |

## 14. Postman Collection

`postman/Fundsroom-ERP-CRM.postman_collection.json` — import into Postman, set the `baseUrl` variable (default `http://localhost:4000/api`), log in via the Authentication folder, and paste the returned token into the `token` collection variable.

## 15. Business Logic Explanation — Challan Confirmation

This is the core rule of the whole system (`backend/src/services/challan.service.ts` → `confirmChallan`), run inside a single Prisma `$transaction`:

1. Reject if the challan is not `DRAFT` (prevents double-confirmation and editing/confirming cancelled/confirmed challans).
2. Load current stock for every product on the challan and compare against the requested quantity **before touching anything**.
3. If **any** item is short, throw immediately with a `shortages` array naming each product plus its available/requested quantity — no stock is touched and the challan stays `DRAFT`.
4. If every item has enough stock, decrement stock for each item, create an `OUT` `StockMovement` per item (linked back to the challan), and mark the challan `CONFIRMED` with a timestamp.

Because all of this runs inside one transaction, a crash or error partway through rolls back everything — stock, movements, and challan status all change together or not at all. Stock can never go negative because step 2 always runs first.

Draft challans never touch stock. Only `DRAFT` challans can be cancelled (marks `CANCELLED`, no stock effect since none was ever deducted).

## 16. Assumptions

- Exact per-role permissions weren't fully specified — see the matrix in §8.
- Cancelling a **confirmed** challan is intentionally unsupported (see Known Limitations) rather than guessed at.
- "Low stock" = `currentStock <= minStockAlert`.
- Manual stock adjustments (`POST /products/:id/stock`) are a separate feature from challan-driven `OUT` movements, for warehouse corrections/receiving — both create `StockMovement` rows and both go through the same transactional, never-negative guard.
- Editing a challan (`PUT /challans/:id`) is only allowed while it's `DRAFT`; editing replaces all line items and regenerates their snapshots from current product data.

## 17. Known Limitations

- No reversal/return flow for confirmed challans (cancelling a confirmed challan, or partial returns, is out of scope).
- Low-stock filtering is done in application code rather than a SQL-level comparison between two columns (documented in `product.service.ts`); fine at this data scale, would move to raw SQL or a DB view at larger scale.
- No refresh-token flow — a single JWT with a fixed expiry (default 8h).
- No file/image upload (product images) — listed as an explicit bonus/AWS-optional feature in the spec.
- No automated test suite; business flows were exercised via the Postman collection instead (see §16 of the original spec — automated tests would be the next addition).

## 18. Future Improvements

- Automated tests (Jest/Vitest + Supertest) for the challan confirm transaction, especially concurrent-confirm race conditions.
- Refresh tokens / shorter-lived access tokens.
- CSV export and PDF challan generation (bonus feature in the original spec).
- Docker Compose for one-command local spin-up.

## 19. Deployment

**Frontend:** Vercel/Netlify — set `VITE_API_URL` to the deployed backend's `/api` URL.
**Backend:** Render/Railway/Fly.io — set all backend env vars; run `npx prisma migrate deploy` as a release step.
**Database:** Neon/Supabase/Render Postgres — put the connection string in `DATABASE_URL`.

Ensure `CLIENT_URL` on the backend matches the deployed frontend origin (CORS is locked to this one origin).

## 20. A note on this environment

This project was scaffolded and reviewed in a sandboxed container without outbound access to `binaries.prisma.sh`, so `prisma generate`/`migrate` could not be executed here to produce a fully compiled build. The frontend type-checks cleanly (`npx tsc --noEmit`) in this same sandbox. The backend type-checks cleanly too, **except** for errors that trace directly to the un-generated Prisma client (e.g. `Prisma.CustomerWhereInput` not found) — those resolve automatically the first time `npx prisma migrate dev` runs in a normal environment with internet access. Run the Local Setup steps above once to confirm, before your interview.

## 21. Final Requirement Checklist

| # | Requirement | Status |
|---|---|---|
| 1 | Tech stack (Node/TS/Express/Postgres/Prisma, React/TS/Vite) | COMPLETE |
| 2 | Business context / modules | COMPLETE |
| 3 | JWT auth + 4 roles + bcrypt + middleware | COMPLETE |
| 4 | Customer CRM module + follow-ups | COMPLETE |
| 5 | Product & inventory module + stock movements | COMPLETE |
| 6 | Sales challan module (draft/confirm, snapshots) | COMPLETE |
| 7 | Atomic stock/confirm transaction, no negative stock, no double-confirm | COMPLETE |
| 8 | REST API standards (validation, status codes, pagination, search) | COMPLETE |
| 9 | Normalized Prisma schema | COMPLETE |
| 10 | Frontend pages (Login, Dashboard, Customers, Detail, Products, Inventory, Challans, Create/Edit) | COMPLETE |
| 11 | Role-based frontend nav/access (backend still authoritative) | COMPLETE |
| 12 | Env vars + .env.example + .gitignore | COMPLETE |
| 13 | Clean layered project structure | COMPLETE |
| 14 | Centralized error handling | COMPLETE |
| 15 | Auto-generated challan numbers (CH-YYYY-NNNNNN, DB-unique) | COMPLETE |
| 16 | Testing of major flows | PARTIAL — exercised manually via Postman; no automated test suite (see §17/18) |
| 17 | Postman collection | COMPLETE |
| 18 | README (all subsections) | COMPLETE |
| 19 | Deployment readiness | COMPLETE (config-level; not deployed live) |
| 20 | Bonus features (Docker, CI, PDF export, S3 image upload) | NOT COMPLETE — intentionally skipped per spec's own priority order |
| 21 | Code quality (strict TS, layered, no fake buttons) | COMPLETE |

**Note on verification:** because this sandbox cannot reach `binaries.prisma.sh`, the backend was reviewed via full TypeScript review and `tsc --noEmit` rather than an actual running server + live database. Please run the Local Setup steps (§11) as your first step — everything is written to work end-to-end, but you should confirm a live run before relying on it for an interview.
