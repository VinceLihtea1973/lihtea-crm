import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

/**
 * Extension du type Session : on y injecte tenantId + role pour l'utiliser
 * côté serveur sans aller chercher en base à chaque requête.
 */
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      tenantId: string;
      role: "OWNER" | "ADMIN" | "MEMBER";
    } & DefaultSession["user"];
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/signin",
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      allowDangerousEmailAccountLinking: true,
    }),
    Credentials({
      name: "Mot de passe",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(raw) {
        const email = typeof raw?.email === "string" ? raw.email.toLowerCase().trim() : "";
        const password = typeof raw?.password === "string" ? raw.password : "";
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash) return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          image: user.image ?? undefined,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // À la connexion on enrichit le token avec tenantId + role.
      if (user?.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { tenantId: true, role: true },
        });
        if (dbUser) {
          token.tenantId = dbUser.tenantId;
          token.role = dbUser.role;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        session.user.tenantId = token.tenantId as string;
        session.user.role = token.role as "OWNER" | "ADMIN" | "MEMBER";
      }
      return session;
    },
  },
});
