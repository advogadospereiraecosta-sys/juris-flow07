import 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      tenantId: string;
      role: 'OWNER' | 'PARTNER' | 'LAWYER' | 'ASSISTANT' | 'READONLY';
      oab?: string;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId?: string;
    tenantId?: string;
    role?: 'OWNER' | 'PARTNER' | 'LAWYER' | 'ASSISTANT' | 'READONLY';
    oab?: string;
  }
}
