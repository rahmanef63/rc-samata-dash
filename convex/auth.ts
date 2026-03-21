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
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest("SHA-256", data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
        return `sha256_${hashHex}`;
      },
      async verifySecret(password: string, hash: string) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest("SHA-256", data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
        return `sha256_${hashHex}` === hash;
      },
    },
  })],
});
