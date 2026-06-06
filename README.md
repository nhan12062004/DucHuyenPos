# DucHuyenPos

POS and invoice-management system for electrical and home utility products.

## Selected Stack

This project is locked to the following architecture:

- `Frontend`: React + TypeScript + Vite
- `Backend`: NestJS + TypeScript
- `Database`: Supabase

## Current Status

- `frontend/` is already organized for the React + TypeScript + Vite app.
- `backend/` now has a NestJS + TypeScript starter structure with `main.ts`, `app.module.ts`, a `health` module, and a Supabase provider.
- `database/` is reserved for Supabase schema notes, SQL scripts, and migration-related assets.

## Project Tree

```text
.
|-- frontend/
|   |-- public/
|   |-- src/
|   |   |-- assets/
|   |   |-- components/
|   |   |-- context/
|   |   |-- features/
|   |   |-- hooks/
|   |   |-- layout/
|   |   |-- pages/
|   |   |-- redux/
|   |   |-- services/
|   |   |-- utils/
|   |   |-- App.tsx
|   |   |-- index.css
|   |   |-- main.tsx
|   |   `-- types.ts
|   |-- .env.example
|   |-- index.html
|   |-- tsconfig.json
|   `-- vite.config.ts
|-- backend/
|   |-- src/
|   |   |-- modules/
|   |   |-- common/
|   |   |-- config/
|   |   |-- app.module.ts
|   |   `-- main.ts
|   `-- .env.example
|-- database/
|   |-- schema.sql
|   `-- supabase/
|-- package.json
`-- README.md
```

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   `npm install`
2. Frontend env:
   copy `frontend/.env.example` to `.env` if needed
3. Backend env:
   copy `backend/.env.example` to `.env` if needed
4. Run frontend:
   `npm run dev:frontend`
5. Run backend:
   `npm run dev:backend`

## Folder Purpose

- `frontend/`: React admin and POS interface.
- `backend/`: NestJS API, business logic, authentication, invoice generation, and integrations.
- `database/`: Supabase-related SQL, schema references, and migration assets.
- `frontend/src/features`: feature-based modules for scaling the POS UI.
- `backend/src/modules`: NestJS business modules such as auth, products, customers, orders, and invoices.

## Backend Notes

- `NestJS + TypeScript`
- `Supabase` as the hosted Postgres database
- server-side business logic for orders, debts, stock updates, and invoice printing
- optional use of Supabase Auth and Storage when needed
