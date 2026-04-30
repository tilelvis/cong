import { createAuthClient, type AuthClient } from "@alien_org/auth-client";
import { getServerEnv, getClientEnv } from "@/lib/env";

let authClient: AuthClient | null = null;

function getAuthClient(): AuthClient {
  if (!authClient) {
    authClient = createAuthClient({
      jwksUrl: getServerEnv().ALIEN_JWKS_URL,
      audience: getClientEnv().NEXT_PUBLIC_ALIEN_RECIPIENT_ADDRESS,
    });
  }
  return authClient;
}

export type TokenInfo = Awaited<ReturnType<AuthClient["verifyToken"]>>;

export function verifyToken(accessToken: string): Promise<TokenInfo> {
  return getAuthClient().verifyToken(accessToken);
}

export function extractBearerToken(header: string | null): string | null {
  return header?.startsWith("Bearer ") ? header.slice(7) : null;
}
