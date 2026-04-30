# PHASE 3 — PAYMENTS & WEBHOOK
# Prerequisite: Phase 2 rectification complete and Vercel build is green.
# Exactly 4 files to change/create. Nothing else.

---

## IMPORTANT — AUTH PATTERN FOR THIS PROJECT

The boilerplate does NOT use `verifyRequest` from `features/auth/server-lib`.
It uses `verifyToken` + `extractBearerToken` from `features/auth/lib`.

Every new API route in this project must follow this pattern:
```ts
import { verifyToken, extractBearerToken } from '@/features/auth/lib';
import { JwtErrors } from '@alien_org/auth-client';

const token = extractBearerToken(request.headers.get('Authorization'));
if (!token) return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 });
const { sub } = await verifyToken(token);
// sub is the alienId
```

Do not create or reference `features/auth/server-lib`. It does not exist.

---

## STEP 1 — Register webhook on dev.alien.org

1. Go to https://dev.alien.org → your Mini App → Webhooks
2. If a webhook exists with a blank or wrong URL, delete it
3. Click Create Webhook
4. Set URL to: `https://YOUR_VERCEL_DOMAIN/api/webhooks/payment`
5. Copy the Ed25519 public key shown — it is only shown once. Save it.
6. Go to Vercel → your project → Settings → Environment Variables
7. Update `WEBHOOK_PUBLIC_KEY` to the copied key
8. Click Redeploy

---

## STEP 2 — Add trial packs to `features/payments/constants.ts`

Open `features/payments/constants.ts`. Find the closing `];` of the
`DIAMOND_PRODUCTS` array (around line 2763). Add these 4 entries
**before** that `];`:

```ts
  {
    id: "trials-10",
    name: "10 Trials",
    description: "10 puzzle trials. 1 ALIEN = 1 trial.",
    diamonds: 10,
    price: "10 ALIEN",
    amount: "10000000000",
    token: "ALIEN",
    network: "alien",
    recipientAddress: ALIEN_RECIPIENT,
    iconUrl: ICON_URL,
  },
  {
    id: "trials-25",
    name: "27 Trials",
    description: "25 ALIEN — get 27 trials (+8% bonus).",
    diamonds: 27,
    price: "25 ALIEN",
    amount: "25000000000",
    token: "ALIEN",
    network: "alien",
    recipientAddress: ALIEN_RECIPIENT,
    iconUrl: ICON_URL,
  },
  {
    id: "trials-50",
    name: "60 Trials",
    description: "50 ALIEN — get 60 trials (+20% bonus).",
    diamonds: 60,
    price: "50 ALIEN",
    amount: "50000000000",
    token: "ALIEN",
    network: "alien",
    recipientAddress: ALIEN_RECIPIENT,
    iconUrl: ICON_URL,
  },
  {
    id: "trials-100",
    name: "130 Trials",
    description: "100 ALIEN — get 130 trials (+30% bonus).",
    diamonds: 130,
    price: "100 ALIEN",
    amount: "100000000000",
    token: "ALIEN",
    network: "alien",
    recipientAddress: ALIEN_RECIPIENT,
    iconUrl: ICON_URL,
  },
```

Do not touch any other part of this file.

---

## STEP 3 — Replace `app/api/webhooks/payment/route.ts`

The current webhook records transactions but never credits trials.
Replace the entire file with this — the only addition is the trial
crediting block inside the `finalized` handler:

```ts
import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { getServerEnv } from "@/lib/env";
import { WebhookPayload } from "@/features/payments/dto";
import { db, schema } from "@/lib/db";

async function verifySignature(
  publicKeyHex: string,
  signatureHex: string,
  body: string,
): Promise<boolean> {
  const publicKey = await crypto.subtle.importKey(
    "raw",
    Buffer.from(publicKeyHex, "hex"),
    { name: "Ed25519" },
    false,
    ["verify"],
  );
  return crypto.subtle.verify(
    "Ed25519",
    publicKey,
    Buffer.from(signatureHex, "hex"),
    Buffer.from(body),
  );
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signatureHex = request.headers.get("x-webhook-signature") ?? "";

  if (!signatureHex) {
    return NextResponse.json({ error: "Missing webhook signature" }, { status: 401 });
  }

  try {
    const isValid = await verifySignature(
      getServerEnv().WEBHOOK_PUBLIC_KEY,
      signatureHex,
      rawBody,
    );

    if (!isValid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const parsed = WebhookPayload.safeParse(JSON.parse(rawBody));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const payload = parsed.data;

    const intent = await db.query.paymentIntents.findFirst({
      where: eq(schema.paymentIntents.invoice, payload.invoice),
    });

    if (!intent) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Idempotency guard
    if (intent.status === "completed" || intent.status === "failed") {
      return NextResponse.json({ success: true });
    }

    await db.transaction(async (tx) => {
      const newStatus = payload.status === "finalized" ? "completed" : "failed";

      await tx
        .update(schema.paymentIntents)
        .set({ status: newStatus })
        .where(eq(schema.paymentIntents.invoice, payload.invoice));

      await tx.insert(schema.transactions).values({
        senderAlienId: intent.senderAlienId,
        recipientAddress: payload.recipient,
        txHash: payload.txHash ?? null,
        status: payload.status === "finalized" ? "paid" : "failed",
        amount: intent.amount,
        token: intent.token,
        network: intent.network,
        invoice: payload.invoice,
        test: payload.test ? "true" : null,
        payload,
      });

      // Credit trials to game_wallets on successful payment
      if (payload.status === "finalized") {
        const trialsMap: Record<string, number> = {
          "trials-10": 10,
          "trials-25": 27,
          "trials-50": 60,
          "trials-100": 130,
        };
        const trialsToAdd = trialsMap[intent.productId ?? ""] ?? 0;

        if (trialsToAdd > 0) {
          await tx.execute(sql`
            INSERT INTO game_wallets (alien_id, trials, total_purchased)
            VALUES (${intent.senderAlienId}, ${trialsToAdd}, ${trialsToAdd})
            ON CONFLICT (alien_id) DO UPDATE SET
              trials          = game_wallets.trials + ${trialsToAdd},
              total_purchased = game_wallets.total_purchased + ${trialsToAdd},
              updated_at      = NOW()
          `);
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json({ error: "Failed to process webhook" }, { status: 500 });
  }
}
```

---

## STEP 4 — Create `app/api/purchase-history/route.ts`

New file. Returns the user's purchase history joined with product info.

```ts
import { NextResponse } from "next/server";
import { verifyToken, extractBearerToken } from "@/features/auth/lib";
import { JwtErrors } from "@alien_org/auth-client";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

const TRIALS_MAP: Record<string, number> = {
  "trials-10": 10,
  "trials-25": 27,
  "trials-50": 60,
  "trials-100": 130,
};

export async function GET(request: Request) {
  try {
    const token = extractBearerToken(request.headers.get("Authorization"));
    if (!token) {
      return NextResponse.json({ error: "Missing authorization token" }, { status: 401 });
    }

    const { sub } = await verifyToken(token);

    const result = await db.execute(sql`
      SELECT
        t.invoice,
        t.amount,
        t.token,
        t.status,
        t.created_at,
        pi.product_id
      FROM transactions t
      LEFT JOIN payment_intents pi ON pi.invoice = t.invoice
      WHERE t.sender_alien_id = ${sub}
      ORDER BY t.created_at DESC
      LIMIT 30
    `);

    const rows = (result.rows as any[]).map((row) => ({
      invoice:         row.invoice,
      amount:          row.amount,
      token:           row.token,
      status:          row.status,
      created_at:      row.created_at,
      product_id:      row.product_id ?? null,
      trials_credited: row.product_id ? (TRIALS_MAP[row.product_id] ?? null) : null,
    }));

    return NextResponse.json(rows);
  } catch (error) {
    if (error instanceof JwtErrors.JWTExpired) {
      return NextResponse.json({ error: "Token expired" }, { status: 401 });
    }
    if (error instanceof JwtErrors.JOSEError) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    console.error("Error in /api/purchase-history:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

---

## STEP 5 — Create `lib/deposit-packs.ts`

New file. Used by the GameWallet UI in Phase 5.

```ts
export const DEPOSIT_PACKS = [
  {
    id: 'trials-10',
    label: '10 Trials',
    trials: 10,
    amount: '10000000000',
    token: 'ALIEN',
    network: 'alien',
    bonus: null,
  },
  {
    id: 'trials-25',
    label: '27 Trials',
    trials: 27,
    amount: '25000000000',
    token: 'ALIEN',
    network: 'alien',
    bonus: '+8% BONUS',
  },
  {
    id: 'trials-50',
    label: '60 Trials',
    trials: 60,
    amount: '50000000000',
    token: 'ALIEN',
    network: 'alien',
    bonus: '+20% BONUS',
  },
  {
    id: 'trials-100',
    label: '130 Trials',
    trials: 130,
    amount: '100000000000',
    token: 'ALIEN',
    network: 'alien',
    bonus: '+30% BONUS',
  },
] as const;

export type DepositPack = typeof DEPOSIT_PACKS[number];
```

---

## STEP 6 — Commit and deploy

```bash
git add .
git commit -m "Phase 3: trial packs, webhook trial crediting, purchase history"
git push
```

Wait for green Vercel build. Then make a real test payment inside the Alien app
and verify in Neon SQL Editor:

```sql
SELECT alien_id, trials, total_purchased
FROM game_wallets
ORDER BY updated_at DESC
LIMIT 5;
```

`trials` must have increased by the amount purchased.

---

## PHASE 3 CHECKLIST

- [ ] Webhook URL registered on dev.alien.org and `WEBHOOK_PUBLIC_KEY` updated in Vercel
- [ ] 4 trial pack entries added to `features/payments/constants.ts`
- [ ] `app/api/webhooks/payment/route.ts` replaced with trial crediting version
- [ ] `app/api/purchase-history/route.ts` created
- [ ] `lib/deposit-packs.ts` created
- [ ] Vercel build green
- [ ] Real payment tested — `game_wallets.trials` increments in Neon
