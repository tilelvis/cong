# PHASE 3 — PAYMENTS & WEBHOOK
# Wire trial packs into the payment system and credit trials on payment confirmation.
# Prerequisite: Phase 2 complete and green.

---

## STEP 1 — Register the Webhook on dev.alien.org

1. Go to https://dev.alien.org → your Mini App → **Webhooks**
2. If you already created a webhook in Phase 1 with a blank URL, delete it and create a new one
3. Click **Create Webhook**
4. Set Webhook URL to: `https://YOUR_VERCEL_DOMAIN/api/webhooks/payment`
   - Replace `YOUR_VERCEL_DOMAIN` with your exact Vercel URL e.g. `congruence-xyz.vercel.app`
5. Copy the **Ed25519 public key** shown immediately — it is only shown once
6. Go to Vercel → your project → **Settings** → **Environment Variables**
7. Update `WEBHOOK_PUBLIC_KEY` with the key you just copied
8. Click **Save** then go to **Deployments** → **Redeploy** (to apply the new env var)

---

## STEP 2 — Add Trial Packs to `features/payments/constants.ts`

The boilerplate's invoice route validates `productId` against `DIAMOND_PRODUCTS`.
Your trial pack IDs must exist in this array or every purchase returns "Invalid product".

Open `features/payments/constants.ts`. Find the closing `];` of the `DIAMOND_PRODUCTS` array.
Add these 4 entries **before** the `];`:

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
    iconUrl: "https://alien.org/favicon.ico",
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
    iconUrl: "https://alien.org/favicon.ico",
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
    iconUrl: "https://alien.org/favicon.ico",
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
    iconUrl: "https://alien.org/favicon.ico",
  },
```

---

## STEP 3 — Replace `app/api/webhooks/payment/route.ts`

This adds trial crediting inside the existing webhook transaction.
The signature verification and payment intent lookup are unchanged from the boilerplate.
The only addition is the `INSERT INTO game_wallets` block inside the `finalized` handler.

Replace the entire file:

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

    // Idempotency guard — do not process twice
    if (intent.status === "completed" || intent.status === "failed") {
      return NextResponse.json({ success: true });
    }

    await db.transaction(async (tx) => {
      const newStatus = payload.status === "finalized" ? "completed" : "failed";

      // Update payment intent status
      await tx
        .update(schema.paymentIntents)
        .set({ status: newStatus })
        .where(eq(schema.paymentIntents.invoice, payload.invoice));

      // Record transaction
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

Returns the user's purchase history by joining `transactions` with `payment_intents`
to retrieve `product_id` — necessary because the invoice UUID contains no product info.

```ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { verifyRequest } from '@/features/auth/server-lib';

const TRIALS_MAP: Record<string, number> = {
  'trials-10': 10,
  'trials-25': 27,
  'trials-50': 60,
  'trials-100': 130,
};

export async function GET(req: NextRequest) {
  const auth = await verifyRequest(req);
  if (auth instanceof NextResponse) return auth;

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
    WHERE t.sender_alien_id = ${auth.alienId}
    ORDER BY t.created_at DESC
    LIMIT 30
  `);

  const rows = (result.rows as any[]).map(row => ({
    invoice:        row.invoice,
    amount:         row.amount,
    token:          row.token,
    status:         row.status,
    created_at:     row.created_at,
    product_id:     row.product_id ?? null,
    trials_credited: row.product_id ? (TRIALS_MAP[row.product_id] ?? null) : null,
  }));

  return NextResponse.json(rows);
}
```

---

## STEP 5 — Create `lib/deposit-packs.ts`

This constant file is used by `GameWallet.tsx` to render the purchase UI.
The IDs must match the product IDs registered in `features/payments/constants.ts` exactly.

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

## STEP 6 — Commit, Deploy and Test a Real Payment

```bash
git add .
git commit -m "Phase 3: payments, webhook trial crediting, purchase history"
git push
```

Wait for green Vercel deployment, then:

1. Open the app inside the Alien app
2. Tap **GET TRIALS** → tap **10 Trials**
3. Approve the payment in the Alien wallet UI
4. Wait up to 30 seconds
5. Go to Neon → SQL Editor → run:
   ```sql
   SELECT alien_id, trials, total_purchased FROM game_wallets ORDER BY updated_at DESC LIMIT 5;
   ```
6. Confirm `trials` incremented by 10 and `total_purchased` incremented by 10

Also check Vercel logs → **Functions** tab → `webhooks/payment` — you should see a `200` response logged after the payment.

**Do not proceed to Phase 4 until a real payment credits trials correctly in the DB.**

---

## PHASE 3 COMPLETE CHECKLIST

- [ ] Webhook URL registered on dev.alien.org pointing to `/api/webhooks/payment`
- [ ] `WEBHOOK_PUBLIC_KEY` updated in Vercel env vars and redeployed
- [ ] Trial packs added to `features/payments/constants.ts`
- [ ] Webhook route updated with trial crediting block
- [ ] `app/api/purchase-history/route.ts` created
- [ ] `lib/deposit-packs.ts` created
- [ ] Real payment tested — `game_wallets.trials` increments correctly in Neon
