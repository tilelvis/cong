# CLAUDE.md

## Project Overview

Alien Miniapp Boilerplate — a production-ready starter for building mini apps on the Alien platform. Ships with authentication and payments. Designed to deploy on **Vercel** with a few clicks.

Docs: https://docs.alien.org/

## Package Manager

**Always use `bun`** as the package manager. Never use npm, yarn, or pnpm.

```bash
bun install        # install dependencies
bun run dev        # start dev server
bun run build      # production build
bun run lint       # run eslint
```

## Tech Stack

- **Framework**: Next.js 16 (App Router), React 19, TypeScript 5
- **Styling**: Tailwind CSS 4 (no config file — theme defined inline in `globals.css`)
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod 4
- **Data Fetching**: TanStack React Query 5
- **Alien SDK**: `@alien_org/react` ^0.2.6 (client), `@alien_org/auth-client` ^0.2.3 (server)
- **Deployment**: Vercel

## Project Structure

Feature-based architecture under `features/`. Each feature may contain:

```
features/<name>/
├── components/     # React components (.tsx)
├── hooks/          # Custom hooks (use-*.ts)
├── dto.ts          # Zod schemas & inferred types
├── queries.ts      # Database queries
├── constants.ts    # Feature constants
└── lib.ts          # Utility functions
```

App routes live in `app/`, API routes in `app/api/`, shared utilities in `lib/`.

## Code Conventions

### Formatting
- **Semicolons**: yes
- **Quotes**: double quotes
- **Indentation**: 2 spaces
- **Trailing commas**: yes (multiline)

### Naming
- **Files**: `kebab-case.ts` / `kebab-case.tsx`
- **Components**: `PascalCase` (exported as named functions)
- **Hooks**: `camelCase` with `use` prefix, file name `use-*.ts`
- **Types**: `PascalCase` (prefer `type` over `interface`)
- **Constants**: `SCREAMING_SNAKE_CASE`
- **Functions**: `camelCase`
- **DB columns**: `snake_case` in Postgres, `camelCase` in TypeScript

### Imports
- Always use `@/` path alias (maps to project root) for cross-feature imports
- Relative imports only within the same feature
- Order: external framework → external libs → `@/` internal → relative
- Use `import type` for type-only imports

### TypeScript
- Strict mode enabled
- Explicit return types on exported functions
- Type inference for local variables
- Co-locate Zod schema and inferred type: `export type Foo = z.infer<typeof Foo>;`

### React
- `"use client"` directive on all client components
- Named exports for components: `export function MyComponent()`
- `<>` fragment shorthand
- Tailwind classes directly on elements

## Alien SDK Packages

The Alien miniapp SDK is a monorepo with four packages:

| Package | Purpose |
|---------|---------|
| `@alien_org/react` | React hooks & `AlienProvider` for miniapp integration |
| `@alien_org/bridge` | Low-level bridge communication with the Alien host app |
| `@alien_org/contract` | Type definitions for methods, events, and version contracts |
| `@alien_org/auth-client` | Server-side JWT verification against JWKS |

This boilerplate uses `@alien_org/react` (client) and `@alien_org/auth-client` (server).

## AlienProvider Setup

Wrap app root with `AlienProvider` (already done in `app/providers.tsx`).

```tsx
<AlienProvider autoReady={true} interceptLinks={true}>
  {children}
</AlienProvider>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `autoReady` | `boolean` | `true` | Automatically send `app:ready` to the host on mount |
| `interceptLinks` | `boolean` | `true` | Intercept external link clicks and route through bridge |

On mount, `AlienProvider`:
- Reads launch params from host-injected `window.__ALIEN_*__` globals
- Sends `app:ready` method to the host app (if `autoReady` is true)
- Sets safe area CSS variables: `--alien-safe-area-inset-{top|right|bottom|left}`
- Enables link interception (if `interceptLinks` is true)

## React Hooks Reference

### useAlien

Core context hook. Returns:

```typescript
{
  authToken: string | undefined;        // JWT from host app
  contractVersion: Version | undefined; // Semver e.g. "0.1.3"
  isBridgeAvailable: boolean;           // true when running inside Alien app
  ready: () => void;                    // Manually signal readiness (only needed if autoReady=false)
}
```

### useLaunchParams

Returns `LaunchParams | undefined` (undefined when running in browser dev mode).

```typescript
{
  authToken: string | undefined;
  contractVersion: Version | undefined;
  hostAppVersion: string | undefined;
  platform: 'ios' | 'android' | undefined;
  startParam: string | undefined;             // Custom parameter from deeplink
  safeAreaInsets: { top, right, bottom, left } | undefined;
}
```

### usePayment

Full payment state management. Options:

```typescript
{
  timeout?: number;                                              // Default: 120000ms (2 min)
  onPaid?: (txHash: string) => void;
  onCancelled?: () => void;
  onFailed?: (errorCode: PaymentErrorCode, error?: Error) => void;
  onStatusChange?: (status: PaymentStatus) => void;
}
```

Returns:

```typescript
{
  pay: (params: PaymentParams) => Promise<PaymentResult>;
  status: 'idle' | 'loading' | 'paid' | 'cancelled' | 'failed';
  isLoading: boolean;
  isPaid: boolean;
  isCancelled: boolean;
  isFailed: boolean;
  txHash?: string;
  errorCode?: PaymentErrorCode;
  error?: Error;
  reset: () => void;
  supported: boolean;  // Whether host app version supports payments
}
```

`PaymentParams`:

```typescript
{
  recipient: string;      // Wallet address
  amount: string;         // In token's smallest unit
  token: string;          // 'SOL', 'USDC', or 'ALIEN' (no arbitrary contract addresses yet)
  network: string;        // 'solana' or 'alien'
  invoice: string;        // Server-generated invoice ID for backend correlation
  item?: {
    title: string;
    iconUrl: string;
    quantity: number;
  };
  test?: PaymentTestScenario;
}
```

### useEvent

Subscribe to bridge events. Auto-unsubscribes on unmount.

```typescript
useEvent('host.back.button:clicked', () => { navigateBack(); });
```

### useMethod

Generic hook for request-response bridge methods.

```typescript
const { execute, data, error, isLoading, reset, supported } = useMethod(
  'payment:request',   // method name
  'payment:response',  // response event name
);
```

### useClipboard

```typescript
const { writeText, readText, isReading, errorCode, supported } = useClipboard();
// writeText(text) — fire-and-forget
// readText() — returns Promise<string | null>
// errorCode: 'permission_denied' | 'unavailable' | null
```

### useIsMethodSupported

```typescript
const { supported, minVersion, contractVersion } = useIsMethodSupported('payment:request');
```

### useLinkInterceptor

Intercept external link clicks and route through bridge. Already enabled by default via `AlienProvider`.

```typescript
useLinkInterceptor({ openMode: 'external' }); // 'external' | 'internal'
```

## Bridge Methods & Events

### Methods (miniapp -> host)

| Method | Payload | Since |
|--------|---------|-------|
| `app:ready` | `{}` | 0.0.9 |
| `host.back.button:toggle` | `{ visible: boolean }` | 0.0.14 |
| `payment:request` | `{ recipient, amount, token, network, invoice, item?, test? }` | 0.1.1 |
| `clipboard:write` | `{ text: string }` | 0.1.1 |
| `clipboard:read` | `{}` | 0.1.1 |
| `link:open` | `{ url: string, openMode?: 'external' \| 'internal' }` | 0.1.3 |

Note: `miniapp:close.ack` exists in the SDK contract (since 0.0.14) but is **not yet supported** — do not use it.

### Events (host -> miniapp)

| Event | Payload | Since |
|-------|---------|-------|
| `host.back.button:clicked` | `{}` | 0.0.14 |
| `payment:response` | `{ status, txHash?, errorCode? }` | 0.1.1 |
| `clipboard:response` | `{ text, errorCode? }` | 0.1.1 |

Note: `miniapp:close` exists in the SDK contract (since 0.0.14) but is **not yet supported** — do not use it.

### Bridge Error Classes

- `BridgeError` — base error
- `BridgeTimeoutError` — request timed out (has `method` and `timeout` properties)
- `BridgeUnavailableError` — bridge not available (not in Alien app)
- `BridgeWindowUnavailableError` — `window` undefined (SSR)

## Authentication (https://docs.alien.org/react-sdk/auth)

### Client Side
- `useAlien()` provides `authToken` (JWT injected by host via `window.__ALIEN_AUTH_TOKEN__`)
- `isBridgeAvailable` is `false` when running outside the Alien app
- Send token as `Authorization: Bearer <token>` to API routes

### Server Side
- Verify tokens with `@alien_org/auth-client` against JWKS
- JWKS endpoint: `https://sso.alien-api.com/oauth/jwks` (configurable via `ALIEN_JWKS_URL` env var)
- JWT signed with RS256 or EdDSA
- `sub` claim = user's Alien ID (wallet address)
- **Never log full tokens in production**
- Handle `JwtErrors.JWTExpired` and `JwtErrors.JOSEError` in API routes

### Token Claims (TokenInfo)

```typescript
{
  iss: string;                // Issuer URL
  sub: string;                // User's Alien ID (wallet address)
  aud: string | string[];     // Audience (provider address)
  exp: number;                // Expiration (Unix seconds)
  iat: number;                // Issued at (Unix seconds)
  nonce?: string;
  auth_time?: number;
}
```

### Auth Client Setup

```typescript
import { createAuthClient } from "@alien_org/auth-client";

const authClient = createAuthClient({
  jwksUrl: "https://sso.alien-api.com/oauth/jwks", // optional, this is the default
});

const tokenInfo = await authClient.verifyToken(accessToken);
// tokenInfo.sub = user's Alien ID
```

In this boilerplate, auth is wrapped in `features/auth/lib.ts`:
- `verifyToken(accessToken)` — verifies JWT, returns `TokenInfo`
- `extractBearerToken(header)` — extracts token from `Authorization: Bearer <token>` header

## Payments (https://docs.alien.org/react-sdk/payments)

### Payment Flow

1. **Frontend** calls `POST /api/invoices` to create a payment intent server-side
2. **Backend** validates product params against catalog, creates intent, returns `invoice` ID
3. **Frontend** calls `pay()` with invoice + payment params, opening the Alien payment UI
4. **User** approves; transaction is broadcast on-chain
5. **Frontend** immediately receives result (`paid`, `cancelled`, or `failed`)
6. **Backend** later receives a webhook `POST /api/webhooks/payment` when tx is confirmed on-chain
7. **Backend** verifies Ed25519 signature, updates intent status, records transaction

### Supported Tokens & Networks

| Token | Network | Recipient |
|-------|---------|-----------|
| `USDC` | `solana` | Your Solana wallet address (`NEXT_PUBLIC_RECIPIENT_ADDRESS`) |
| `ALIEN` | `alien` | Your provider address (`NEXT_PUBLIC_ALIEN_RECIPIENT_ADDRESS`) |
| `SOL` | `solana` | Your Solana wallet address |

Only these token slugs are supported. Arbitrary contract addresses are **not yet supported** — use the exact slug strings above.

### PaymentErrorCode (SDK contract type)

```typescript
type PaymentErrorCode = 'insufficient_balance' | 'network_error' | 'unknown';
```

The Alien platform additionally supports `pre_checkout_rejected` and `pre_checkout_timeout` error codes in test scenarios, but these are not part of the SDK's TypeScript type.

### PaymentTestScenario (SDK contract type)

```typescript
type PaymentTestScenario = 'paid' | 'paid:failed' | 'cancelled' | `error:${PaymentErrorCode}`;
```

Expands to: `'paid'`, `'paid:failed'`, `'cancelled'`, `'error:insufficient_balance'`, `'error:network_error'`, `'error:unknown'`

The boilerplate's `features/payments/constants.ts` defines a broader local type that also includes `'error:pre_checkout_rejected'` and `'error:pre_checkout_timeout'` (supported by the platform but not typed in the SDK contract).

### Test Scenario Behavior

| Scenario | Client sees | Webhook sent | Webhook status |
|----------|-------------|--------------|----------------|
| `'paid'` | `paid` | Yes | `finalized` |
| `'paid:failed'` | `paid` | Yes | `failed` |
| `'cancelled'` | `cancelled` | No | -- |
| `'error:*'` | `failed` | No | -- |

Test webhooks include `test: true` in the payload.

### Webhook Signature Verification

```typescript
// Ed25519 verification using Web Crypto API
const publicKey = await crypto.subtle.importKey(
  "raw",
  Buffer.from(publicKeyHex, "hex"),
  { name: "Ed25519" },
  false,
  ["verify"],
);
const isValid = await crypto.subtle.verify(
  "Ed25519",
  publicKey,
  Buffer.from(signatureHex, "hex"),
  Buffer.from(rawBody),
);
```

- Signature header: `x-webhook-signature` (hex-encoded Ed25519)
- Public key: `WEBHOOK_PUBLIC_KEY` env var (hex-encoded, shown once when creating webhook in Dev Portal)
- Always verify before processing — reject if missing or invalid
- Webhook statuses: `finalized` -> fulfill order, `failed` -> mark as failed
- Ensure idempotency: skip processing if payment intent is already `completed` or `failed`

### Webhook Payload

```typescript
{
  invoice: string;
  recipient: string;
  status: 'finalized' | 'failed';
  txHash?: string;
  amount?: string;
  token?: string;
  network?: string;
  test?: boolean;
}
```

## Bridge & Dev Mode (https://docs.alien.org/react-sdk/bridge)

- `isBridgeAvailable` is `false` when running outside the Alien app
- In dev mode: `send()` logs warnings, `request()` times out, hooks return `supported: false`
- Check `supported` property on hooks before calling host methods
- Use `mockLaunchParamsForDev()` from `@alien_org/bridge` to simulate launch params locally
- Deploy to a public URL and use the Dev Portal deeplink to test in Alien app: `https://alien.app/miniapp/{slug}`
- Remote debugging: Safari Web Inspector (iOS), `chrome://inspect` (Android)

## API Route Pattern

All protected routes follow this structure:

```typescript
import { NextResponse } from "next/server";
import { verifyToken, extractBearerToken } from "@/features/auth/lib";
import { JwtErrors } from "@alien_org/auth-client";

export async function GET(request: Request) {
  try {
    const token = extractBearerToken(request.headers.get("Authorization"));
    if (!token) {
      return NextResponse.json({ error: "Missing authorization token" }, { status: 401 });
    }
    const { sub } = await verifyToken(token);
    // ... business logic using sub as the user's Alien ID
  } catch (error) {
    if (error instanceof JwtErrors.JWTExpired) {
      return NextResponse.json({ error: "Token expired" }, { status: 401 });
    }
    if (error instanceof JwtErrors.JOSEError) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

Response format: `{ data }` on success, `{ error: "message" }` on failure.
Validate request bodies with Zod `.safeParse()`.

### API Endpoints

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/me` | Bearer token | Get or create authenticated user |
| POST | `/api/invoices` | Bearer token | Create payment intent (validates product against catalog) |
| GET | `/api/transactions` | Bearer token | Get user's transaction history (limit 50) |
| POST | `/api/webhooks/payment` | Ed25519 signature | Receive payment status from Alien platform |

## Database

- Schema in `lib/db/schema.ts`, connection in `lib/db/index.ts`
- Migrations in `drizzle/`, config in `drizzle.config.ts`
- Tables: `users`, `payment_intents`, `transactions`
- UUID primary keys with `defaultRandom()`
- Timestamps with timezone: `timestamp("col", { withTimezone: true }).defaultNow()`
- Use Drizzle query builder, not raw SQL
- Connection pool: max 10, idle timeout 20s, connect timeout 10s

```bash
bun run db:generate   # generate migration from schema changes
bun run db:migrate    # apply pending migrations
bun run db:push       # push schema directly (dev only)
bun run db:studio     # open Drizzle Studio GUI
```

## Environment Variables

Validated with Zod in `lib/env.ts`. Use `getServerEnv()` and `getClientEnv()` helpers.

| Variable | Side | Required | Description |
|---|---|---|---|
| `DATABASE_URL` | Server | Yes | PostgreSQL connection string |
| `WEBHOOK_PUBLIC_KEY` | Server | Yes | Ed25519 hex public key for webhook verification |
| `ALIEN_JWKS_URL` | Server | No | JWKS endpoint (default: `https://sso.alien-api.com/oauth/jwks`) |
| `NODE_ENV` | Server | No | `development` / `production` / `test` |
| `NEXT_PUBLIC_RECIPIENT_ADDRESS` | Client | Yes | Solana wallet for USDC/SOL payments |
| `NEXT_PUBLIC_ALIEN_RECIPIENT_ADDRESS` | Client | Yes | Alien provider address for ALIEN payments |

## Agent Teams

This project ships with pre-configured subagent definitions in `.claude/agents/` for parallel development with Claude Code Agent Teams. Teams are enabled via `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` in `.claude/settings.json`.

### Available Agents

| Agent | Model | Role | Key Constraint |
|-------|-------|------|----------------|
| `frontend` | sonnet | Pages, components, hooks, UI | Must invoke `/frontend-design` skill before building UI |
| `backend` | sonnet | API routes, DB, webhooks, auth | Never touches `"use client"` files |
| `fullstack` | sonnet | End-to-end features (DB → API → UI) | Follows 8-step implementation order |
| `reviewer` | haiku | Read-only code review | Cannot Write or Edit files |

All agents inherit this CLAUDE.md automatically. Agent definitions add role-specific behavior only.

### Creating a Team

Tell Claude to create a team in natural language. Claude spawns teammates using the `.claude/agents/` definitions, creates a shared task list, and coordinates work.

```
Create an agent team with frontend, backend, and reviewer teammates
to build a notifications feature.
```

```
Create a team with 3 teammates to refactor the payment flow.
Use the fullstack agent for implementation and reviewer for QA.
Require plan approval before any changes.
```

```
Spawn a frontend teammate to build a settings page and a backend
teammate to add the GET /api/settings endpoint.
```

### Tips

- Assign each teammate **different files** to avoid edit conflicts
- Use **delegate mode** when the lead should coordinate without coding
- Use **plan approval** for risky changes: teammates plan first, lead reviews
- Start with **research/review tasks** (lower risk) before parallel implementation
- Size tasks appropriately: 5-6 tasks per teammate keeps everyone productive
- The `reviewer` agent is cheap (haiku model) — use it liberally after changes

## Deployment (Vercel)

This app is designed to run on Vercel. Import the repo, add env vars, deploy — that's it.

1. Push your code to GitHub
2. Import the repository on [vercel.com](https://vercel.com)
3. Add a PostgreSQL database (Vercel Postgres or external)
4. Set all environment variables
5. Register a webhook in the [Dev Portal](https://dev.alien.org/dashboard/webhooks) pointing to `https://<your-domain>/api/webhooks/payment`
6. Deploy

Vercel auto-detects Next.js and configures the build. For auto-migrations on start, set `RUN_MIGRATIONS=true`.
