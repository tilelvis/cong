# PHASE 1 — FOUNDATION
# Boilerplate setup, environment variables, first deploy, bridge verification.
# Do not proceed to Phase 2 until the final verification step passes.

---

## STEP 1 — Register on dev.alien.org

1. Go to https://dev.alien.org
2. Sign in and click **Create Mini App**
3. Fill in:
   - **Name:** Congruence
   - **Mini App URL:** leave blank for now — you'll fill this after first deploy
4. On the app detail page, copy your **Provider Address** (hex string) — this is `NEXT_PUBLIC_ALIEN_RECIPIENT_ADDRESS`
5. Go to **Webhooks** → **Create Webhook** — leave URL blank for now, you will fill it in Phase 3
6. Copy the **Ed25519 public key** shown immediately — it is only displayed once. Save it somewhere safe. This is `WEBHOOK_PUBLIC_KEY`.

---

## STEP 2 — Create Neon Database

1. Go to https://neon.tech and sign in
2. Click **New Project** → name it `congruence`
3. Select region closest to `iad1` (US East) — this matches Vercel's default
4. Once created, go to **Dashboard** → **Connection Details**
5. Copy the connection string — it looks like:
   ```
   postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
6. Keep this tab open — you'll need this string in Step 4

---

## STEP 3 — Clone the Boilerplate

```bash
git clone https://github.com/alien-id/miniapp-boilerplate congruence
cd congruence
npm install
```

Confirm the project structure has these key folders:
- `app/` — Next.js app router
- `features/` — auth, payments, user modules
- `lib/` — db, utils
- `drizzle/` — migration files

---

## STEP 4 — Create Environment Files

Create `.env` in the project root (copy from `.env.example`):

```bash
cp .env.example .env
```

Then open `.env` and fill in all values:

```env
# Database — paste your Neon connection string here
DATABASE_URL=postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require

# Auth — do not change this
ALIEN_JWKS_URL=https://sso.alien-api.com/oauth/jwks

# Payments — Ed25519 public key from dev.alien.org Webhooks page
WEBHOOK_PUBLIC_KEY=your_ed25519_key_hex_from_dev_alien_org

# Payments — your Solana wallet (can leave blank if not using USDC)
NEXT_PUBLIC_RECIPIENT_ADDRESS=

# Payments — your Provider Address from dev.alien.org
NEXT_PUBLIC_ALIEN_RECIPIENT_ADDRESS=your_provider_address_from_dev_alien_org

NODE_ENV=development
```

---

## STEP 5 — Run Database Migrations

```bash
npx drizzle-kit migrate
```

If that fails, try:
```bash
npx drizzle-kit push
```

Then open Neon → your project → **Tables**. You should see: `users`, `payment_intents`, `transactions`. If these three tables exist, migrations worked.

---

## STEP 6 — Update `app/layout.tsx`

The boilerplate layout wraps children in a padded `<main>` container with a tab bar. Remove both so the game has full screen control.

Replace the entire file:

```tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Congruence",
  description: "Modular Arithmetic Puzzle",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        style={{ margin: 0, padding: 0, background: '#04060f', overflowX: 'hidden' }}
      >
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
```

---

## STEP 7 — Create a GitHub Repo and Push

```bash
git init
git remote add origin https://github.com/YOUR_USERNAME/congruence.git
git add .
git commit -m "Phase 1: boilerplate setup"
git push -u origin main
```

---

## STEP 8 — Deploy to Vercel

1. Go to https://vercel.com → **Add New Project**
2. Import your GitHub repo
3. In **Environment Variables**, add all 5 variables from your `.env`:
   - `DATABASE_URL`
   - `ALIEN_JWKS_URL` → `https://sso.alien-api.com/oauth/jwks`
   - `WEBHOOK_PUBLIC_KEY`
   - `NEXT_PUBLIC_RECIPIENT_ADDRESS`
   - `NEXT_PUBLIC_ALIEN_RECIPIENT_ADDRESS`
4. Click **Deploy**
5. Once green, copy your live URL — e.g. `https://congruence-xyz.vercel.app`

---

## STEP 9 — Register Live URL on dev.alien.org

1. Go to https://dev.alien.org → your Mini App
2. Set **Mini App URL** to your exact Vercel URL: `https://congruence-xyz.vercel.app`
3. Save

---

## STEP 10 — Verify the Bridge Works

Open the Alien app on your phone → navigate to your Mini App.

The boilerplate's home page calls `/api/me` which verifies the JWT and returns your `alienId`. If it renders without error and shows your Alien ID, the bridge is working.

**Do not proceed to Phase 2 until this works.**

If it shows a blank screen or error:
- Check Vercel function logs → Project → Functions tab
- The most common cause is `ALIEN_JWKS_URL` missing or wrong
- Confirm the Mini App URL on dev.alien.org exactly matches your Vercel domain including `https://`

---

## PHASE 1 COMPLETE CHECKLIST

- [ ] Provider Address copied from dev.alien.org
- [ ] Ed25519 public key copied from dev.alien.org Webhooks
- [ ] Neon DB created, connection string saved
- [ ] `.env` filled with all 5 variables
- [ ] Migrations ran — `users`, `payment_intents`, `transactions` tables exist in Neon
- [ ] Deployed to Vercel with all env vars
- [ ] Mini App URL registered on dev.alien.org
- [ ] App opens inside Alien app and shows Alien ID without errors
