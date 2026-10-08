# Multi-User Code Playground (Next.js + Payload CMS + Cloudflare D1 + Vivari WebContainer)

A multi-user playground for HTML, CSS, and JS with live browser-based previews powered by Vivari WebContainer. Features rich text theory notes (Payload Lexical), customizable code files, user authentication, and single-click forking.

## 🚀 Features

- **Theory Panel:** Rich text / markdown notes editor built on Lexical with an inline floating toolbar and markdown shortcuts.
- **Practical Panel:** In-browser code editor (File Tree + CodeMirror 6 + Vivari Live Preview iframe).
- **Public URL & Permissions:** Public read access via `/p/[slug]`. Only owners can update their playgrounds; non-owners and visitors can fork any playground to save their local edits.
- **Authentication:** Username + password login via Payload CMS (`auth.loginWithUsername`), with role-based access control (`admin` | `user`).
- **Data Model:** Cloudflare D1 SQLite database storing playgrounds (`title`, `slug`, `owner`, `theory`, `files`, `forkedFrom`).
- **UI & Theme:** Built with shadcn/ui components on Base UI (`preset b0`), zero Radix dependencies, with light/dark theme persistence and zero FOUC.
- **Service Worker Isolation:** COOP/COEP headers configured for cross-origin isolation on playground and Service Worker routes.

---

## 💻 Local Setup

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Environment Variables
Copy `.env.example` to `.env` and fill in required variables:
```bash
cp .env.example .env
```

Required `.env` variables:
```env
PAYLOAD_SECRET=your-32-byte-random-payload-secret
NEXT_PUBLIC_SERVER_URL=http://localhost:3000
```

### 3. Run Development Server
```bash
pnpm dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.
Access the admin dashboard at [http://localhost:3000/admin](http://localhost:3000/admin).

---

## 👤 Creating Users in Payload CMS

1. Open `/admin/login` (or `/admin`).
2. The initial startup will prompt you to create the first Admin user (`username` + `password`).
3. Additional regular users can be created manually by the admin inside the Payload Admin dashboard under **Users**.
4. Regular users log in at `/admin/login` and are redirected back to the playground.

---

## 🗄 Database Migrations (Cloudflare D1)

Schema migrations are managed automatically by Payload D1 SQLite adapter.

To generate a new migration after schema changes:
```bash
pnpm payload migrate:create <migration-name>
```

To apply migrations to the remote Cloudflare D1 database:
```bash
pnpm deploy:database
```

### Existing User Compatibility & Migrations
When migrating from earlier schema versions where `username` and `role` were not present on the `users` table:
- Migration `20261008_064007_add_playgrounds_and_users` automatically sets default `role = 'user'` and populates `username` for existing users from their `email` (or `user_<id>` fallback) during table rebuild.
- If existing users need custom usernames after migration, administrators can log in to `/admin` and update user profiles as needed.

---

## 🔐 GitHub Secrets & Variables List

To deploy via GitHub Actions, add the following to your repository (**Settings > Secrets and variables > Actions**):

### Repository Secrets
1. `CLOUDFLARE_API_TOKEN`: Cloudflare API token with `Account | Cloudflare D1 | Edit`, `Account | Workers R2 Storage | Edit`, `Account | Workers Scripts | Edit`, and `Account | Account Settings | Read` permissions.
2. `CLOUDFLARE_ACCOUNT_ID`: Your 32-character Cloudflare Account ID from the Cloudflare Dashboard.
3. `PAYLOAD_SECRET`: 32-byte secret string for Payload JWT sessions.
4. `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM_ADDRESS`, `SMTP_FROM_NAME`: (Optional) Email transport settings.

### Repository Variables
1. `NEXT_PUBLIC_SERVER_URL`: Production domain URL (e.g. `https://payload-on-cf.workers.dev`).

---

## 📝 Step-by-Step Instructions: Adding a New Environment Variable

When adding a new environment variable in the future:
1. **Add to `scripts/check-env.mjs`:** Include the variable name in `requiredEnvs` if mandatory.
2. **Add to `.env.example`:** Provide example value and description.
3. **Add to GitHub Actions Workflow (`.github/workflows/deploy.yml`):**
   - For `NEXT_PUBLIC_*` build-time variables: add under the `Build and Deploy Worker` step `env:`.
   - For runtime secrets: add to `Configure secrets on Cloudflare Wrangler` step using `wrangler secret put`.
4. **Update `wrangler.jsonc` (if non-secret runtime variable):** Define under `vars`.
