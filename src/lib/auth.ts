import { betterAuth } from "better-auth";
import { admin, username } from "better-auth/plugins";
import { Pool } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL || process.env.NEXT_NEON_DB_URI;

const pool = new Pool({
  connectionString: databaseUrl,
});

export const auth = betterAuth({
  database: pool,
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
      defaultDestinationId: {
        type: "string",
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
