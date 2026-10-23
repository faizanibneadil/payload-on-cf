# Boards (Next.js + Payload CMS + Cloudflare D1)

A lecture editor for instructors: each board is one rich document (Lexical) that the instructor writes and shares. The app is being rebuilt iteration by iteration; see `docs/knowledge-base/11-iterations.md` for the status and `docs/knowledge-base/01-architecture-and-decisions.md` for the target design.

## Target features

- **Board editor:** one Lexical document per board with markdown shortcuts, an inline toolbar on the selection, tables, links, and blocks (Code block, Canvas) from the `/` menu. See `docs/knowledge-base/05-board-editor.md`.
- **Accounts:** username and password only, in a sign-in modal. Anyone can register; new accounts are instructors.
- **Sharing:** a board is private until shared; anyone with the link can view it read-only, and only the owner can save. There is no forking.
- **Limits:** per-instructor limits on new boards and saves, configurable by the super admin in a Payload Global.
- **Stack:** Next.js, Tailwind CSS, shadcn/ui (Base UI), Payload CMS, Cloudflare Worker + D1 + R2, Biome, pnpm.

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
```

### 3. Run Development Server
```bash
pnpm dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.
Access the admin dashboard at [http://localhost:3000/admin](http://localhost:3000/admin).

---

## 👤 Users

1. The first account created becomes the **admin** (username + password). On an existing database with no admin, migration `20261015_060000_promote_first_user_to_admin` promotes the oldest account to admin, so `/admin` is reachable. Sign in at `/admin/login` with that username.
   CI/CD also runs `pnpm deploy:seed` (`scripts/seed-admin.ts`) after the migrations: if the database has **no admin**, it creates the user `admin` with password `admin` (override with `ADMIN_USERNAME` / `ADMIN_PASSWORD`). If an admin already exists it does nothing. **Change the default password right after the first login.** The username `admin` is reserved at registration.
2. Instructors create accounts and sign in through the modal in the app header (coming in Iteration 1). They do not use the Payload admin panel.
3. Admins can manage users in `/admin` under **Users**.

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
4. `ADMIN_USERNAME`, `ADMIN_PASSWORD`: (Optional) Credentials for the default admin. If unset, the default admin is `admin` / `admin`.
5. `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM_ADDRESS`, `SMTP_FROM_NAME`: (Optional) Email transport settings.

### Repository Variables
None are required right now.

---

## 📝 Step-by-Step Instructions: Adding a New Environment Variable

When adding a new environment variable in the future:
1. **Add to `scripts/check-env.mjs`:** Include the variable name in `requiredEnvs` if mandatory.
2. **Add to `.env.example`:** Provide example value and description.
3. **Add to GitHub Actions Workflow (`.github/workflows/deploy.yml`):**
   - For `NEXT_PUBLIC_*` build-time variables: add under the `Build and Deploy Worker` step `env:`.
   - For runtime secrets: add to `Configure secrets on Cloudflare Wrangler` step using `wrangler secret put`.
4. **Update `wrangler.jsonc` (if non-secret runtime variable):** Define under `vars`.
