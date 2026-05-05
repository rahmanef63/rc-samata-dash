/**
 * Seed action — idempotent. Creates (or rotates password for) the two
 * canonical accounts:
 *   - super_admin: rahmanef63@gmail.com / namam787898
 *   - owner:      owner@mail.com / owner567
 *
 * Run via:
 *   pnpm seed:users
 *   # or directly:
 *   npx convex run _internal/seedUsers:seedAdminAndOwner --url=$NEXT_PUBLIC_CONVEX_URL --admin-key=$CONVEX_ADMIN_KEY
 *
 * Uses `createAccount` / `modifyAccountCredentials` from @convex-dev/auth so
 * password hashing matches the Password provider configured in convex/auth.ts.
 */
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import {
  createAccount,
  modifyAccountCredentials,
} from "@convex-dev/auth/server";
import type { Id } from "../_generated/dataModel";

type Role = "super_admin" | "owner" | "staff";

interface Seed {
  email: string;
  password: string;
  name: string;
  role: Role;
}

const SEEDS: Seed[] = [
  {
    email: "rahmanef63@gmail.com",
    password: "namam787898",
    name: "Super Admin",
    role: "super_admin",
  },
  {
    email: "owner@mail.com",
    password: "owner567",
    name: "Owner",
    role: "owner",
  },
];

export const seedAdminAndOwner = internalAction({
  args: {},
  handler: async (
    ctx,
  ): Promise<
    Array<{ email: string; status: string; userId: string; role: Role }>
  > => {
    const results: Array<{
      email: string;
      status: string;
      userId: string;
      role: Role;
    }> = [];

    for (const s of SEEDS) {
      const existingId: Id<"users"> | null = await ctx.runQuery(
        internal.features.auth.queries.findUserByEmailInternal,
        { email: s.email },
      );

      let userId: Id<"users">;
      let status: string;

      if (existingId) {
        await modifyAccountCredentials(ctx, {
          provider: "password",
          account: { id: s.email, secret: s.password },
        });
        userId = existingId;
        status = "password_rotated";
      } else {
        const created = await createAccount(ctx, {
          provider: "password",
          account: { id: s.email, secret: s.password },
          profile: { email: s.email, name: s.name },
        });
        userId = created.user._id as Id<"users">;
        status = "created";
      }

      await ctx.runMutation(internal.features.auth.mutations.setRole, {
        userId,
        role: s.role,
      });

      results.push({ email: s.email, status, userId, role: s.role });
    }

    return results;
  },
});
