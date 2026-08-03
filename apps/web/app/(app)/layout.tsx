import { redirect } from 'next/navigation';
import Link from 'next/link';
import { UploadProvider } from '@/components/uploads/upload-context';
import { UploadSheet } from '@/components/uploads/upload-sheet';
import { TrialBanner } from '@/components/onboarding/trial-banner';
import { prisma } from '@juris-flow/db';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  CheckSquare,
  FileText,
  Calculator,
  Bell,
  Library,
  BookOpen,
  Wallet,
  CreditCard,
  Settings,
  Search,
  Plus,
  LogOut,
  Sparkles,
} from 'lucide-react';
import { auth } from '@/lib/auth';
import { LogoLockup, Avatar, AvatarFallback, Badge, Button } from '@juris-flow/ui';

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  soon?: boolean;
};

const NAV: { group: string; items: NavItem[] }[] = [
  { group: 'Trabalho', items: [
    { href: '/dashboard', label: 'Início', icon: LayoutDashboard },
    { href: '/clients', label: 'Meus Clientes', icon: Users },
    { href: '/leads', label: 'Leads', icon: Plus },
    { href: '/processos', label: 'Meus Processos', icon: Briefcase },
    { href: '/tarefas', label: 'Tarefas', icon: CheckSquare, badge: '3' },
  ]},
  { group: 'Produtividade', items: [
    { href: '/ia', label: 'Assistant IA', icon: Sparkles },
    { href: '/pecas', label: 'Peças', icon: FileText },
    { href: '/calculators', label: 'Calculadoras', icon: Calculator, soon: true },
    { href: '/inbox', label: 'Publicações', icon: Bell },
    { href: '/templates', label: 'Modelos', icon: Library, soon: true },
    { href: '/jurisprudence', label: 'Jurisprudência', icon: BookOpen, soon: true },
  ]},
  { group: 'Escritório', items: [
    { href: '/finance', label: 'Honorários', icon: Wallet, soon: true },
    { href: '/configuracoes/billing', label: 'Plano & Cobrança', icon: CreditCard, soon: true },
    { href: '/configuracoes/integracoes', label: 'Configurações', icon: Settings },
  ]},
];

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const initials = session.user.name
    ?.split(' ')
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('') ?? 'A';

  // Trial banner: aparece se trialEndsAt futuro e plano não é pago
  const tenant = await prisma.tenant.findUnique({
    where: { id: session.user.tenantId },
    select: { trialEndsAt: true, plan: true, planStatus: true },
  });
  const showTrial =
    tenant?.planStatus === 'TRIALING' &&
    tenant.trialEndsAt != null &&
    tenant.trialEndsAt.getTime() > Date.now();
  const daysLeft = tenant?.trialEndsAt
    ? Math.max(0, Math.ceil((tenant.trialEndsAt.getTime() - Date.now()) / 86400000))
    : 0;

  return (
    <UploadProvider>
      <div className="flex min-h-screen bg-ink-950 text-ink-50">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Topbar userName={session.user.name ?? session.user.email} initials={initials} oab={session.user.oab} />
          <main className="flex-1 overflow-y-auto">
            <div className="container mx-auto max-w-7xl px-6 py-8">
              {showTrial && <TrialBanner daysLeft={daysLeft} />}
              {children}
            </div>
          </main>
        </div>
      </div>
      <UploadSheet />
    </UploadProvider>
  );
}

function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-ink-800 bg-ink-900/40 lg:flex lg:flex-col">
      <div className="flex h-16 items-center px-6">
        <Link href="/dashboard">
          <LogoLockup variant="compact" />
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {NAV.map((group) => (
          <div key={group.group} className="mb-6">
            <h3 className="vf-overline mb-2 px-3">{group.group}</h3>
            <ul className="space-y-1">
              {group.items.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="group flex items-center gap-2 rounded-md px-3 py-2 text-sm text-ink-300 hover:bg-ink-800 hover:text-ink-50"
                  >
                    <item.icon className="h-4 w-4 text-ink-400 group-hover:text-vara-300" />
                    <span className="flex-1">{item.label}</span>
                    {item.badge && (
                      <Badge variant="warning" className="text-[10px]">
                        {item.badge}
                      </Badge>
                    )}
                    {item.soon && (
                      <span className="text-[10px] uppercase text-ink-500">
                        em breve
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-ink-800 p-4">
        <form action="/api/auth/signout" method="post">
          <Button variant="ghost" size="sm" type="submit" className="w-full justify-start">
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </form>
      </div>
    </aside>
  );
}

function Topbar({ userName, initials, oab }: { userName: string; initials: string; oab?: string }) {
  return (
    <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between border-b border-ink-800 bg-ink-950/80 px-6 backdrop-blur">
      <div className="flex flex-1 items-center gap-3">
        <button className="flex h-9 w-9 items-center justify-center rounded-md border border-ink-700 hover:bg-ink-800 lg:hidden">
          <LayoutDashboard className="h-4 w-4" />
        </button>

        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            type="search"
            placeholder="Buscar processos, clientes, peças…  ⌘K"
            className="h-9 w-full rounded-md border border-ink-700 bg-ink-900 pl-9 pr-3 text-sm text-ink-100 placeholder:text-ink-400 focus:border-vara-400 focus:outline-none"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Link
          href="/cases/new"
          className="hidden items-center gap-2 rounded-md bg-vara-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-vara-400 sm:flex"
        >
          <Plus className="h-4 w-4" />
          Novo processo
        </Link>

        <button
          aria-label="Notificações"
          className="relative flex h-9 w-9 items-center justify-center rounded-md border border-ink-700 hover:bg-ink-800"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-prazo-500" />
        </button>

        <div className="flex items-center gap-2 border-l border-ink-800 pl-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="hidden text-left leading-tight sm:block">
            <div className="text-xs font-semibold text-ink-50">{userName}</div>
            {oab && <div className="text-[10px] text-ink-400">OAB {oab}</div>}
          </div>
        </div>
      </div>
    </header>
  );
}
