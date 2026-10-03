/**
 * @file src/lib/auth-client.ts
 * @description Better-Auth Client SDK setup for React frontend components.
 * 
 * Provides reactive hooks (useSession) and client methods (signIn, signOut)
 * with built-in logging for browser verification.
 * 
 * @module AuthClient
 */

import { createAuthClient } from "better-auth/react";
import { adminClient, usernameClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  plugins: [
    adminClient(),
    usernameClient(),
  ],
});
