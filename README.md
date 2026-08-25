This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:


You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

# Edu Authentication

This project contains a Next.js React frontend and a NestJS TypeScript authentication API. The first auth slice provides email/password login, JWT access tokens, PostgreSQL-backed refresh-token rotation, logout, and a protected user endpoint.

## Setup

1. Copy `.env.example` to `.env` and set the Supabase PostgreSQL `DATABASE_URL`, JWT secret, and seed credentials.
2. Install dependencies:

	```bash
	npm install
	```

3. Generate Prisma Client and create the database tables:

	```bash
	npm run prisma:generate
	npm run prisma:migrate -- --name auth
	npm run prisma:seed
	```

## Start

Run the frontend and API in separate terminals from this directory:

```bash
npm run dev
npm run start:api
```

The frontend is available at `http://localhost:3000` and the API at `http://localhost:4000`.

## Auth behavior

- `POST /auth/login` accepts an email and password and returns an access token.
- The refresh token is stored in an HttpOnly `refresh_token` cookie scoped to `/auth`.
- `POST /auth/refresh` rotates the refresh token and returns a new access token.
- `POST /auth/logout` revokes the current refresh token and clears the cookie.
- `GET /auth/me` requires `Authorization: Bearer <accessToken>`.
- Refresh tokens are stored as SHA-256 hashes in PostgreSQL. Redis is not used.
- The frontend keeps the access token in React memory and sends cookies with `credentials: 'include'`.

For Postman requests and expected responses, see [MANUAL-TESTING.md](MANUAL-TESTING.md).
