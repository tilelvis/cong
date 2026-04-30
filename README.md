# Alien Miniapp Boilerplate

Boilerplate for building miniapps on the Alien platform with **authentication** and **payments** out of the box. Next.js 16, PostgreSQL, Drizzle ORM, JWT auth, crypto payments (USDC on Solana, ALIEN token).

## Quick Start

```bash
bun install
docker compose up -d
bun run db:migrate
bun run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `WEBHOOK_PUBLIC_KEY` | Ed25519 public key (hex) for verifying payment webhook signatures |
| `NEXT_PUBLIC_RECIPIENT_ADDRESS` | Solana wallet address that receives USDC/SOL payments |
| `NEXT_PUBLIC_ALIEN_RECIPIENT_ADDRESS` | Alien provider address that receives ALIEN token payments |

### Where to get the values

- **`NEXT_PUBLIC_RECIPIENT_ADDRESS`** — any Solana wallet address you want to receive payments to (e.g. your personal wallet, or even the wallet address shown in your Alien app).
- **`NEXT_PUBLIC_ALIEN_RECIPIENT_ADDRESS`** — your **provider address** from the Alien Dev Portal. You can find it on the [Webhooks](https://dev.alien.org/dashboard/webhooks) or [Mini Apps](https://dev.develop.alien.org/dashboard/miniapps) pages. For ALIEN token payments, your provider address is used automatically.
- **`WEBHOOK_PUBLIC_KEY`** — the Ed25519 public key provided by the Alien Dev Portal when you register a webhook.

## Setting Up Payments

Before making any payments, you need to register a webhook in the [Alien Dev Portal](https://dev.alien.org/dashboard/webhooks):

1. Go to the [**Webhooks**](https://dev.alien.org/dashboard/webhooks) page in the Dev Portal
2. Click **Create webhook**
3. Select your **Mini App** from the dropdown
4. Set the **Webhook URL** to:
   ```
   https://<your-website>/api/webhooks/payment
   ```
5. Optionally add your **Solana pubkey** if you want to receive SOL/USDC
6. Click **Create**

After creation, you will be briefly shown your **webhook public key** (Ed25519, hex-encoded). Copy it immediately — this is your `WEBHOOK_PUBLIC_KEY` env var. The boilerplate uses this key to verify that incoming webhooks are genuinely from the Alien platform: each request carries an `x-webhook-signature` header, and the server verifies it against your public key before processing (see `app/api/webhooks/payment/route.ts`).

Fill in the recipient addresses and you're ready to accept payments.

## Payment Flow

1. User picks a product in the store and initiates a purchase
2. Frontend calls `POST /api/invoices` to create a payment intent in the database
3. Backend returns an `invoice` ID
4. Frontend opens the Alien payment interface via the `usePayment()` hook
5. After the user pays, the Alien platform sends a webhook to `POST /api/webhooks/payment`
6. Backend verifies the Ed25519 signature, updates the payment intent, and records a transaction

### Supported Tokens

| Token | Network | Recipient env var |
|---|---|---|
| USDC | Solana | `NEXT_PUBLIC_RECIPIENT_ADDRESS` |
| ALIEN | Alien | `NEXT_PUBLIC_ALIEN_RECIPIENT_ADDRESS` |

You can specify any Solana wallet for USDC/SOL tokens. For ALIEN token payments, your provider address is used automatically.

### Test Payments

The store includes a **Test** tab with pre-configured test products. Test transactions are marked with a `test` badge and don't involve real funds.

Available test scenarios:

| Test product | What it simulates |
|---|---|
| Test USDC purchase | Successful USDC payment |
| Test ALIEN purchase | Successful ALIEN payment |
| Test cancelled | User cancels the payment |
| Test failed | Payment succeeds on-chain but webhook reports failure |

Some test scenarios simulate errors on both the **frontend** (payment UI) and **backend** (webhook processing), useful for testing your error handling:

| Scenario | Description |
|---|---|
| `paid` | Successful payment |
| `paid:failed` | Payment goes through but is marked as failed |
| `cancelled` | User cancels before completing |
| `error:insufficient_balance` | Insufficient balance |
| `error:network_error` | Network error |
| `error:unknown` | Unknown error |

## Project Structure

```
app/
├── api/
│   ├── me/route.ts                    # Authenticated user endpoint
│   ├── invoices/route.ts              # Create payment intents
│   ├── transactions/route.ts          # Fetch transaction history
│   └── webhooks/payment/route.ts      # Payment webhook handler
├── store/page.tsx                     # Store page (diamond shop)
├── layout.tsx                         # Root layout with AlienProvider
├── page.tsx                           # Home page
├── providers.tsx                      # Client-side providers
├── error.tsx                          # Error boundary
└── global-error.tsx                   # Global error boundary
features/
├── auth/
│   ├── components/
│   │   └── connection-status.tsx      # Bridge & token status indicator
│   └── lib.ts                         # Token verification (JWKS)
├── user/
│   ├── components/
│   │   └── user-info.tsx              # User info display
│   ├── dto.ts                         # Zod schemas for user data
│   ├── hooks/
│   │   └── use-current-user.ts        # Hook to fetch current user
│   └── queries.ts                     # Database queries (find/create user)
└── payments/
    ├── components/
    │   ├── diamond-store.tsx           # Store UI with product grid
    │   └── transaction-history.tsx     # Transaction list
    ├── hooks/
    │   └── use-diamond-purchase.ts     # Purchase hook (invoice + pay)
    ├── constants.ts                    # Products, tokens, test scenarios
    ├── dto.ts                          # Zod schemas for payments
    └── queries.ts                      # Database queries for payments
lib/
├── db/
│   ├── index.ts                       # Database connection & migrations
│   └── schema.ts                      # Drizzle schema (users, payment_intents, transactions)
└── env.ts                             # Environment variable validation
```

## Auth

Authentication is handled automatically by the Alien platform:

1. Alien app injects an auth token when loading your miniapp
2. `useAlien()` hook from `@alien_org/react` provides the token on the client
3. Frontend sends the token as `Authorization: Bearer <token>` to your API routes
4. API verifies the token against Alien's JWKS using `@alien_org/auth-client`
5. The `sub` claim from the JWT is the user's unique Alien ID

**Registration is implicit** — on first API call, the user is automatically created in the database via a find-or-create pattern. No signup flow needed.

When running outside the Alien app, the bridge won't be available. The connection status component helps with debugging.

## Database

PostgreSQL with Drizzle ORM. Local setup uses Docker (`docker-compose.yml`).

**Users** (`users`):

| Column | Type | Description |
|---|---|---|
| `id` | UUID | Auto-generated primary key |
| `alienId` | TEXT (unique) | User's Alien ID from JWT `sub` claim |
| `createdAt` | TIMESTAMP | Set on first auth |
| `updatedAt` | TIMESTAMP | Updated on each auth |

**Payment Intents** (`payment_intents`):

| Column | Type | Description |
|---|---|---|
| `id` | UUID | Auto-generated primary key |
| `invoice` | TEXT (unique) | Invoice identifier (`inv-<uuid>`) |
| `senderAlienId` | TEXT | Payer's Alien ID |
| `recipientAddress` | TEXT | Recipient wallet/provider address |
| `amount` | TEXT | Payment amount in smallest units |
| `token` | TEXT | Token type (USDC / ALIEN) |
| `network` | TEXT | Network (solana / alien) |
| `productId` | TEXT | Product identifier |
| `status` | TEXT | `pending` / `completed` / `failed` |

**Transactions** (`transactions`):

| Column | Type | Description |
|---|---|---|
| `id` | UUID | Auto-generated primary key |
| `senderAlienId` | TEXT | Payer's Alien ID |
| `recipientAddress` | TEXT | Recipient wallet/provider address |
| `txHash` | TEXT | On-chain transaction hash |
| `status` | TEXT | `paid` / `failed` |
| `amount` | TEXT | Payment amount |
| `token` | TEXT | Token type |
| `network` | TEXT | Network |
| `invoice` | TEXT | Associated invoice |
| `test` | TEXT | `"true"` if test transaction |
| `payload` | JSONB | Full webhook payload for audit |

**Commands:**

```bash
bun run db:generate   # Generate migration from schema changes
bun run db:migrate    # Apply pending migrations
bun run db:push       # Push schema directly (dev only)
bun run db:studio     # Open Drizzle Studio GUI
```

To run migrations automatically on server start, set `RUN_MIGRATIONS=true`. Disabled by default.

## API

### `GET /api/me`

Returns the authenticated user. Requires Bearer token.

```json
{
  "id": "uuid",
  "alienId": "user-alien-id",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### `POST /api/invoices`

Creates a payment intent. Requires Bearer token.

**Request body:**

```json
{
  "recipientAddress": "wallet-or-provider-address",
  "amount": "10000",
  "token": "USDC",
  "network": "solana",
  "productId": "usdc-diamonds-10"
}
```

**Response:**

```json
{
  "invoice": "inv-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

### `GET /api/transactions`

Returns the authenticated user's transaction history. Requires Bearer token.

### `POST /api/webhooks/payment`

Receives payment status updates from the Alien platform. Verifies the `x-webhook-signature` header (Ed25519) against `WEBHOOK_PUBLIC_KEY`.

## Deployment

This app is designed to run on **Vercel**. Setup takes just a few clicks:

1. Push your code to GitHub
2. Import the repository on [vercel.com](https://vercel.com)
3. Add a PostgreSQL database (Vercel Postgres, Neon, Supabase, or any external provider)
4. Set the environment variables: `DATABASE_URL`, `WEBHOOK_PUBLIC_KEY`, `NEXT_PUBLIC_RECIPIENT_ADDRESS`, `NEXT_PUBLIC_ALIEN_RECIPIENT_ADDRESS`
5. Deploy

Vercel auto-detects Next.js and handles the build. For auto-migrations on deploy, set `RUN_MIGRATIONS=true`.

Once deployed, register your webhook in the [Alien Dev Portal](https://dev.alien.org/dashboard/webhooks) pointing to `https://<your-vercel-domain>/api/webhooks/payment`.
