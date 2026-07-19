# OrderTee

A lightweight online ordering website for small businesses, built with React, TypeScript, and Supabase.

## Tech Stack

- **Frontend**: React 19, Vite, TypeScript (Strict), React Router, TailwindCSS v4, shadcn/ui
- **State**: TanStack Query (server), Zustand (client)
- **Forms**: React Hook Form + Zod
- **Animation**: Framer Motion
- **Backend**: Supabase (Auth, PostgreSQL, Storage, Realtime)

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in your Supabase credentials:

```bash
cp .env.example .env
```

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. Set Up Database

Run the SQL migration files in order on your Supabase SQL Editor:

1. `supabase/migrations/001_schema.sql` — Creates all tables
2. `supabase/migrations/002_policies.sql` — Sets up Row Level Security
3. `supabase/migrations/003_functions.sql` — Adds triggers and functions

Optionally, run `supabase/seed.sql` to populate sample data.

### 4. Create Admin Account

In your Supabase Dashboard → Authentication → Users, create a user with email and password. This will be your admin account.

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

## Project Structure

```
src/
├── app/            # App root, providers, router
├── components/     # Shared UI components
├── features/       # Feature-based modules
│   ├── landing/    # Landing page
│   ├── ordering/   # Customer ordering flow
│   ├── tracking/   # Order tracking
│   ├── auth/       # Admin authentication
│   └── admin/      # Admin dashboard
├── hooks/          # Shared hooks
├── layouts/        # Page layouts
├── lib/            # Supabase client, utilities
├── stores/         # Zustand stores
├── types/          # TypeScript types
├── styles/         # Global CSS
└── utils/          # Helper functions
```

## Database

11 tables: `categories`, `products`, `addon_groups`, `addon_options`, `product_addon_groups`, `orders`, `order_items`, `order_item_addons`, `website`, `settings`

See `supabase/migrations/` for the complete schema.

## License

Private — All rights reserved.
