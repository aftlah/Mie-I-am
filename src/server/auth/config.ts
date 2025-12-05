import { type DefaultSession, type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/server/db";
import { scryptSync, timingSafeEqual } from "crypto";

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      role?: "admin" | "cashier";
    } & DefaultSession["user"];
  }

  // interface User {
  //   // ...other properties
  //   // role: UserRole;
  // }
}

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authConfig = {
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (creds) => {
        const uRaw = creds?.username;
        const pRaw = creds?.password;
        const username = typeof uRaw === "string" ? uRaw.trim() : "";
        const password = typeof pRaw === "string" ? pRaw : "";
        if (!username || !password) return null;
        const user = await db.staffUser.findUnique({ where: { username } });
        if (!user) return null;
        const stored = user.password_hash;
        let ok = false;
        if (stored.startsWith("scrypt:")) {
          const parts = stored.split(":");
          const salt = parts[1];
          const hex = parts[2];
          if (salt && hex) {
            const derived = scryptSync(password, salt, 32);
            const hashBuf = Buffer.from(hex, "hex");
            ok = hashBuf.length === derived.length && timingSafeEqual(hashBuf, derived);
          }
        } else if (stored.startsWith("plain:")) {
          const a = Buffer.from(stored.slice(6));
          const b = Buffer.from(password);
          ok = a.length === b.length && timingSafeEqual(a, b);
        }
        if (!ok) return null;
        return { id: String(user.id), name: user.username, role: user.role } as { id: string; name: string; role: "admin" | "cashier" };
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      const t = token as unknown as { sub?: string; role?: "admin" | "cashier" };
      const u = user as unknown as { role?: "admin" | "cashier" } | undefined;
      if (u?.role) {
        t.role = u.role;
      } else if (t.sub) {
        const existing = await db.staffUser.findUnique({ where: { id: Number(t.sub) } });
        if (existing) t.role = existing.role;
      }
      return t as unknown as typeof token;
    },
    session: async ({ session, token }) => {
      const t = token as unknown as { sub?: string; role?: "admin" | "cashier" };
      return {
        ...session,
        user: {
          ...session.user,
          id: String(t?.sub ?? ""),
          role: t.role,
        },
      };
    },
  },
} satisfies NextAuthConfig;
