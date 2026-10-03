import "dotenv/config";
import { betterAuth } from "better-auth";
import { admin, username } from "better-auth/plugins";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL || process.env.DATABASE_URL_UNPOOLED;

export const auth = betterAuth({
  database: new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
  }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  advanced: {
    database: {
      generateId: "uuid",
    },
  },
  logger: {
    level: "debug",
  },
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "viewer",
        required: false,
      },
      username: {
        type: "string",
        required: false,
      },
      phone: {
        type: "string",
        required: false,
      },
      status: {
        type: "string",
        defaultValue: "active",
        required: false,
      },
    },
  },
  plugins: [
    username(),
    admin({
      defaultRole: "viewer",
    }),
  ],
});