# Avielle

Avielle is a boutique luxury e-commerce storefront with a protected admin dashboard and SQLite-backed product management.

## Features

- Public storefront experience with home, shop, product, category, about, FAQ, cart, wishlist, and contact pages
- Protected administrator dashboard at `/admin`
- Secure admin login at `/admin/login`
- Product CRUD backed by SQLite
- Session-based authentication using `express-session`
- Promo validation and order creation for checkout flows
- Static assets served from the project root

## Local setup

1. Install Node.js 18+ if it is not already installed.
2. Open a terminal in the project root.
3. Run:
   npm install
4. Copy `.env.example` to `.env` and adjust the values:
   ADMIN_EMAIL=admin@avielle.com
   ADMIN_PASSWORD=change-me-please
   SESSION_SECRET=replace-with-a-long-random-secret
   PORT=3000
5. Start the app:
   npm start
6. Open the storefront at http://localhost:3000/
7. Open the admin login at http://localhost:3000/admin/login

## Admin login

Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` to private values in your local `.env` file or hosting provider settings. Never commit `.env` files or real credentials.

## Deploy publicly with Render

The repository includes `render.yaml` and `Dockerfile` for a full deployment with:

- a public customer storefront
- protected admin routes
- SQLite data persisted on a Render disk
- product image uploads persisted on the same disk
- a `/health` endpoint for service checks

1. Push the project to GitHub.
2. In Render, choose **New > Blueprint** and select the repository.
3. Set the secret environment values when prompted:
   - `ADMIN_EMAIL`
   - `ADMIN_PASSWORD`
   - `SESSION_SECRET` (Render can generate this automatically)
4. Create the service.
5. Open the generated `onrender.com` URL on any device.

The public storefront is at the generated URL. The private dashboard is at `/admin/login`.

The persistent disk is required because SQLite, sessions, and uploaded product images must survive deploys and restarts. A static host such as GitHub Pages cannot run the full Avielle system.
