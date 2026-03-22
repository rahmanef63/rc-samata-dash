import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password({
    profile(params) {
      return {
        email: params.email as string,
        name: params.name as string,
      };
    },
    validatePasswordRequirements: (password: string) => {
      if (!password || password.length < 5) {
        throw new Error("Password terlalu pendek (minimal 5 karakter).");
      }
    },
    crypto: {
      async hashSecret(password: string) {
        return `pt_${password}`;
      },
      async verifySecret(password: string, hash: string) {
        return `pt_${password}` === hash;
      },
    },
  })],
});
