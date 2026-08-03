import NextAuth from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';

import { prisma } from '@juris-flow/db';
import { verifyPassword } from '@juris-flow/auth';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

/**
 * Configuração NextAuth v5 (Auth.js).
 *
 * Providers:
 * - Credentials (email/senha) — verificação bcrypt
 * - Google OAuth (opcional, configurado por env)
 *
 * Adapter:
 * - PrismaAdapter (Account, Session, User, VerificationToken)
 *
 * Callbacks:
 * - jwt inclui tenantId e role para checagem em route handlers
 * - session expõe tenantId e role para o frontend
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  providers: [
    Credentials({
      name: 'Email',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Senha', type: 'password' },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        const user = await prisma.user.findFirst({
          where: { email: email.toLowerCase() },
        });

        if (!user) return null;
        if (!user.passwordHash) return null;
        if (user.deletedAt) return null;

        const valid = await verifyPassword(password, user.passwordHash);
        if (!valid) return null;

        // Atualiza lastLogin
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.fullName,
          image: user.avatarUrl,
        };
      },
    }),
    ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
      ? [Google({ allowDangerousEmailAccountLinking: true })]
      : []),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Na criação/refresh do JWT, persistir tenantId e role do user
      if (user?.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { id: true, tenantId: true, role: true, oabNumber: true, oabState: true },
        });
        if (dbUser) {
          token.tenantId = dbUser.tenantId;
          token.role = dbUser.role;
          token.userId = dbUser.id;
          token.oab = dbUser.oabNumber
            ? `${dbUser.oabNumber}/${dbUser.oabState}`
            : undefined;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId as string;
        session.user.tenantId = token.tenantId as string;
        session.user.role = token.role as
          | 'OWNER'
          | 'PARTNER'
          | 'LAWYER'
          | 'ASSISTANT'
          | 'READONLY';
        session.user.oab = token.oab as string | undefined;
      }
      return session;
    },
  },
  trustHost: true,
});
