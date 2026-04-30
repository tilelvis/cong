import { z } from "zod";

const serverSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  WEBHOOK_PUBLIC_KEY: z.string().min(1, "WEBHOOK_PUBLIC_KEY is required"),
  ALIEN_JWKS_URL: z.optional(z.url("ALIEN_JWKS_URL must be a valid URL")).default("https://sso.alien-api.com/oauth/jwks"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

const clientSchema = z.object({
  NEXT_PUBLIC_RECIPIENT_ADDRESS: z.string().min(1, "NEXT_PUBLIC_RECIPIENT_ADDRESS is required"),
  NEXT_PUBLIC_ALIEN_RECIPIENT_ADDRESS: z.string().min(1, "NEXT_PUBLIC_ALIEN_RECIPIENT_ADDRESS is required"),
});

export type ServerEnv = z.infer<typeof serverSchema>;
export type ClientEnv = z.infer<typeof clientSchema>;

let _serverEnv: ServerEnv | null = null;
let _clientEnv: ClientEnv | null = null;

function formatErrors(errors: Record<string, string[] | undefined>): string {
  return Object.entries(errors)
    .map(([key, msgs]) => `  ${key}: ${msgs?.join(", ")}`)
    .join("\n");
}

export function getServerEnv(): ServerEnv {
  if (!_serverEnv) {
    const parsed = serverSchema.safeParse(process.env);
    if (!parsed.success) {
      throw new Error(
        `Missing or invalid server environment variables:\n${formatErrors(parsed.error.flatten().fieldErrors)}`,
      );
    }
    _serverEnv = parsed.data;
  }
  return _serverEnv;
}

export function getClientEnv(): ClientEnv {
  if (!_clientEnv) {
    const parsed = clientSchema.safeParse({
      NEXT_PUBLIC_RECIPIENT_ADDRESS: process.env.NEXT_PUBLIC_RECIPIENT_ADDRESS,
      NEXT_PUBLIC_ALIEN_RECIPIENT_ADDRESS: process.env.NEXT_PUBLIC_ALIEN_RECIPIENT_ADDRESS,
    });
    if (!parsed.success) {
      throw new Error(
        `Missing or invalid client environment variables:\n${formatErrors(parsed.error.flatten().fieldErrors)}`,
      );
    }
    _clientEnv = parsed.data;
  }
  return _clientEnv;
}
