# Fundsroom Mini ERP + CRM Operations Portal

A full-stack internal operations portal for wholesale and distribution operations. It includes customer CRM, product and inventory management, and sales challans with atomic stock confirmation.

## Tech Stack

- Backend: Node.js, TypeScript, Express, PostgreSQL, Prisma, JWT, bcryptjs, Zod
- Frontend: React, TypeScript, Vite, React Router, Axios

## Features

- Role-based JWT authentication with Admin, Sales, Warehouse, and Accounts roles
- Customer management and follow-up tracking
- Product management, inventory tracking, and stock movement history
- Sales challans with draft, confirm, and cancel flows
- Atomic challan confirmation with stock validation and movement records
- Backend authorization on every route and request validation with Zod
- Centralized error handling and consistent JSON response format

## Architecture

- Backend: `backend/src` contains config, Prisma client, middleware, validation, services, controllers, and routes
- Frontend: `frontend/src` contains auth context, components, pages, API client, and protected routes
- `postman/` includes a Postman collection for API testing

## API Summary

Successful responses return `{ success, data, meta? }`.
Failed responses return `{ success: false, error: { message, details? } }`.

Key endpoints:

- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/customers`, `POST /api/customers`, `GET /api/customers/:id`, `PUT /api/customers/:id`, `POST /api/customers/:id/followups`
- `GET /api/products`, `POST /api/products`, `GET /api/products/:id`, `PUT /api/products/:id`, `GET /api/products/:id/movements`, `POST /api/products/:id/stock`
- `GET /api/challans`, `POST /api/challans`, `GET /api/challans/:id`, `PUT /api/challans/:id`, `POST /api/challans/:id/confirm`, `POST /api/challans/:id/cancel`
- `GET /api/dashboard`

## Environment Variables

Backend (`backend/.env`, see `backend/.env.example`):
`DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `PORT`, `CLIENT_URL`, `NODE_ENV`

Frontend (`frontend/.env`, see `frontend/.env.example`):
`VITE_API_URL`

## Local Setup

```bash
cd backend
cp .env.example .env
npm install
npx prisma migrate dev --name init
npm run prisma:seed
npm run dev

cd ../frontend
cp .env.example .env
npm install
npm run dev
```

## Demo Credentials

All demo accounts use password `Password123!`.

| Role | Email |
|---|---|
| Admin | admin@fundsroom.test |
| Sales | sales@fundsroom.test |
| Warehouse | warehouse@fundsroom.test |
| Accounts | accounts@fundsroom.test |

## Postman Collection

Import `postman/Fundsroom-ERP-CRM.postman_collection.json`. Set `baseUrl` to `http://localhost:4000/api`, log in, and add the returned token to the collection.

## Notes

- Draft challans do not adjust stock until confirmed.
- Confirmed challans are immutable and create stock movement records.
- No automated test suite is included.
- No refresh token flow or file/image upload support in this version.

## Deployment

- Frontend: Vercel/Netlify with `VITE_API_URL` pointing to the backend API
- Backend: Render/Railway/Fly.io with env vars configured and `npx prisma migrate deploy`
- Database: Neon/Supabase/Postgres with `DATABASE_URL`
