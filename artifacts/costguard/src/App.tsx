import { useMemo, useState, type HTMLAttributes, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Link, Route, Switch, useLocation, useParams, Router as WouterRouter } from 'wouter';
import {
  Activity, ArrowDownRight, ArrowUpRight, BarChart3, Bell, Box, ChevronRight, CircleAlert,
  CircleCheck, Clock3, Cloud, Database, FileCode2, Gauge, GitBranch, LayoutDashboard, ListFilter,
  Menu, MoreHorizontal, Package, RefreshCw, Search, Settings2, ShieldCheck,
  Terminal, X, Zap,
} from 'lucide-react';
import { Bar as ChartBar, BarChart as ChartBarChart, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis } from 'recharts';
import {
  getGetCostguardPlanQueryKey, useGetCostguardCache, useGetCostguardOverview,
  useGetCostguardPlan, useGetCostguardPlans, useGetCostguardPolicy, useGetCostguardPricing,
  useGetCostguardReports, useGetCostguardResources,
} from '@workspace/api-client-react';
import type {
  AzureResource, BudgetPolicy, CacheHealth, CostReport, CostguardOverview, PricingItem,
  TerraformPlan, TrendPoint,
} from '@workspace/api-client-react';
import './index.css';

const queryClient = new QueryClient();

const navGroups = [
  {
    label: 'Control room',
    items: [
      { href: '/', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/plans', label: 'Terraform Plans', icon: FileCode2 },
      { href: '/resources', label: 'Resources', icon: Box },
    ],
  },
  {
    label: 'Signals',
    items: [
      { href: '/pricing', label: 'Pricing', icon: DollarMark },
      { href: '/cache', label: 'Cache', icon: Database },
      { href: '/reports', label: 'Reports', icon: BarChart3 },
    ],
  },
  {
    label: 'Guardrails',
    items: [{ href: '/policy', label: 'Policy', icon: ShieldCheck }],
  },
];

function DollarMark({ size = 16 }: { size?: number }) {
  return <span className="font-mono-ui text-[15px] font-medium leading-none" style={{ fontSize: size }}>USD</span>;
}

const money = (value = 0) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value);
const compactMoney = (value = 0) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 }).format(value);
const number = (value = 0) => new Intl.NumberFormat('en-US').format(value);
const timeAgo = (value: string) => {
  const timestamp = new Date(value).getTime();
  if (!Number.isNaN(timestamp)) {
    const diff = Math.max(0, Date.now() - timestamp);
    const minutes = Math.floor(diff / 60000);
    if (minutes < 2) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }
  const relative = value.match(/(\d+)\s*(minute|min|hour|hr|day|d)/i);
  if (relative) {
    const amount = Number(relative[1]);
    const unit = relative[2].toLowerCase();
    if (unit.startsWith('min')) return `${amount}m ago`;
    if (unit.startsWith('hour') || unit === 'hr') return `${amount}h ago`;
    return `${amount}d ago`;
  }
  if (/yesterday/i.test(value)) return '1d ago';
  return value;
};
const dateLabel = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
};

function Shell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const pageTitle = navGroups.flatMap((group) => group.items).find((item) => item.href === location)?.label ?? 'Overview';

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-[252px] flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-transform duration-200 md:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-[76px] items-center justify-between border-b border-sidebar-border px-6">
          <Link href="/" className="flex items-center gap-3" data-testid="link-brand">
            <span className="grid h-8 w-8 place-items-center rounded-[9px] bg-sidebar-primary text-sidebar-primary-foreground">
              <Zap size={17} strokeWidth={2.5} />
            </span>
            <span><span className="block text-[17px] font-extrabold tracking-[-0.04em] text-white">CostGuard</span><span className="mt-0.5 block text-[8px] font-medium uppercase tracking-[.08em] text-sidebar-foreground/60">Azure cost impact predictor</span></span>
          </Link>
          <button className="rounded-md p-1 text-sidebar-foreground hover:bg-sidebar-accent md:hidden" onClick={() => setMobileOpen(false)} data-testid="button-close-sidebar" aria-label="Close navigation">
            <X size={18} />
          </button>
        </div>
        <div className="px-4 py-5">
          <div className="mb-4 flex items-center gap-2 rounded-md border border-sidebar-border bg-sidebar-accent/70 px-3 py-2.5">
            <span className="pulse-dot h-2 w-2 rounded-full bg-sidebar-primary" />
            <div className="min-w-0">
              <div className="font-mono-ui text-[9px] uppercase tracking-[.16em] text-sidebar-foreground/60">workspace</div>
              <div className="truncate text-[12px] font-semibold text-white">platform-engineering</div>
            </div>
            <ChevronRight size={14} className="ml-auto text-sidebar-foreground/50" />
          </div>
          <nav className="space-y-6">
            {navGroups.map((group) => (
              <div key={group.label}>
                <div className="mb-2 px-3 font-mono-ui text-[9px] uppercase tracking-[.18em] text-sidebar-foreground/45">{group.label}</div>
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const active = item.href === '/' ? location === '/' : location.startsWith(item.href);
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={`group flex items-center gap-3 rounded-md px-3 py-2.5 text-[12px] font-semibold ${active ? 'bg-sidebar-primary text-sidebar-primary-foreground' : 'text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-white'}`}
                        data-testid={`link-nav-${item.label.toLowerCase().replaceAll(' ', '-')}`}
                      >
                        <Icon size={16} strokeWidth={active ? 2.4 : 1.8} />
                        <span>{item.label}</span>
                        {item.href === '/cache' && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent" />}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>
        <div className="mt-auto border-t border-sidebar-border p-4">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-[#24465a] font-mono-ui text-[11px] font-medium text-cyan-100">AK</div>
            <div className="min-w-0">
              <div className="truncate text-[11px] font-bold text-white">Avery Kim</div>
              <div className="truncate text-[10px] text-sidebar-foreground/55">FinOps operator</div>
            </div>
            <button className="ml-auto rounded p-1 text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-white" onClick={() => window.alert('Account settings are managed by your workspace administrator.')} data-testid="button-account-settings" aria-label="Account settings">
              <Settings2 size={15} />
            </button>
          </div>
        </div>
      </aside>
      {mobileOpen && <button className="fixed inset-0 z-30 bg-slate-950/40 md:hidden" onClick={() => setMobileOpen(false)} data-testid="button-dismiss-sidebar" aria-label="Close navigation overlay" />}
      <div className="md:pl-[252px]">
        <header className="sticky top-0 z-20 flex h-[76px] items-center justify-between border-b border-border bg-background/90 px-5 backdrop-blur-md sm:px-8">
          <div className="flex items-center gap-3">
            <button className="rounded-md p-2 text-muted-foreground hover:bg-muted md:hidden" onClick={() => setMobileOpen(true)} data-testid="button-open-sidebar" aria-label="Open navigation">
              <Menu size={19} />
            </button>
            <div>
              <div className="font-mono-ui text-[9px] uppercase tracking-[.18em] text-muted-foreground">cost control room / {pageTitle.toLowerCase()}</div>
              <h1 className="mt-0.5 text-[19px] font-extrabold tracking-[-0.04em] text-foreground">{pageTitle}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-[10px] font-semibold text-muted-foreground sm:flex">
              <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-emerald-500" /> Azure retail API connected
            </div>
            <button className="relative rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground" onClick={() => window.alert('No new control room alerts.')} data-testid="button-notifications" aria-label="View notifications">
              <Bell size={17} />
              <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-accent" />
            </button>
          </div>
        </header>
        <main className="mx-auto max-w-[1460px] px-5 py-7 sm:px-8 lg:px-10">{children}</main>
      </div>
    </div>
  );
}

function SectionHeading({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        {eyebrow && <div className="font-mono-ui text-[9px] uppercase tracking-[.2em] text-primary">{eyebrow}</div>}
        <h2 className="mt-1 text-[17px] font-extrabold tracking-[-0.035em] text-foreground">{title}</h2>
      </div>
      {action}
    </div>
  );
}

function Card({ children, className = '', ...props }: { children: ReactNode; className?: string } & HTMLAttributes<HTMLDivElement>) {
  return <div className={`rounded-xl border border-card-border bg-card shadow-[0_1px_2px_hsl(214_37%_17%/.03)] ${className}`} {...props}>{children}</div>;
}

function QueryState({ isLoading, isError, isEmpty, onRetry, children, label }: { isLoading?: boolean; isError?: boolean; isEmpty?: boolean; onRetry?: () => void; children?: ReactNode; label: string }) {
  if (isLoading) {
    return <div className="space-y-3" data-testid={`loading-${label}`}><div className="h-20 animate-pulse rounded-lg bg-muted" /><div className="h-20 animate-pulse rounded-lg bg-muted" /><div className="h-20 animate-pulse rounded-lg bg-muted" /></div>;
  }
  if (isError) {
    return <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center" data-testid={`error-${label}`}><CircleAlert className="mx-auto mb-3 text-destructive" size={22} /><div className="text-sm font-bold">Could not load {label}</div><p className="mt-1 text-xs text-muted-foreground">The control room could not reach the API.</p>{onRetry && <button className="mt-4 rounded-md bg-foreground px-3 py-2 text-xs font-bold text-background hover:opacity-85" onClick={onRetry} data-testid={`button-retry-${label}`}>Retry request</button>}</div>;
  }
  if (isEmpty) return <div className="rounded-lg border border-dashed border-border p-10 text-center" data-testid={`empty-${label}`}><div className="mx-auto mb-3 grid h-9 w-9 place-items-center rounded-full bg-muted text-muted-foreground"><ListFilter size={16} /></div><div className="text-sm font-bold">No {label} yet</div><p className="mt-1 text-xs text-muted-foreground">New records will appear here after the next analysis.</p></div>;
  return <>{children}</>;
}

function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    passed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    healthy: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    synced: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    reviewed: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    analyzed: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    analyzing: 'bg-amber-50 text-amber-700 border-amber-200',
    degraded: 'bg-amber-50 text-amber-700 border-amber-200',
    blocked: 'bg-rose-50 text-rose-700 border-rose-200',
    stale: 'bg-rose-50 text-rose-700 border-rose-200',
  };
  const labels: Record<string, string> = { 'no-change': 'No change', blocked: 'Blocked', passed: 'Passed', analyzing: 'Analyzing', pending: 'Pending', fresh: 'Fresh', stale: 'Stale', healthy: 'Healthy', degraded: 'Degraded', reviewed: 'Reviewed', synced: 'Synced', analyzed: 'Analyzed' };
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 font-mono-ui text-[9px] uppercase tracking-[.1em] ${styles[status] ?? 'bg-muted text-muted-foreground border-border'}`}><span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />{labels[status] ?? status}</span>;
}

function Delta({ value, compact = false }: { value: number; compact?: boolean }) {
  const positive = value > 0;
  return <span className={`inline-flex items-center gap-1 font-mono-ui text-xs font-medium ${positive ? 'text-rose-600' : value < 0 ? 'text-emerald-600' : 'text-muted-foreground'}`}>{positive ? <ArrowUpRight size={13} /> : value < 0 ? <ArrowDownRight size={13} /> : null}{compact ? compactMoney(Math.abs(value)) : money(Math.abs(value))}</span>;
}

function TrendChart({ points }: { points: TrendPoint[] }) {
  return <div className="h-[205px] pt-2" data-testid="chart-cost-trend">
    <ResponsiveContainer width="100%" height="100%">
      <ChartBarChart data={points} margin={{ top: 10, right: 0, left: -18, bottom: 0 }}>
        <XAxis dataKey="label" tick={{ fill: 'hsl(215 16% 48%)', fontSize: 9, fontFamily: 'DM Mono, monospace' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: 'hsl(215 16% 48%)', fontSize: 9, fontFamily: 'DM Mono, monospace' }} tickFormatter={(value) => compactMoney(value)} axisLine={false} tickLine={false} width={58} />
        <ChartTooltip cursor={{ fill: 'hsl(210 24% 96%)' }} contentStyle={{ borderRadius: 8, border: '1px solid hsl(214 25% 88%)', fontSize: 11 }} formatter={(value: number) => money(value)} />
        <ChartBar dataKey="cost" name="Actual" fill="#16a6c8" radius={[3, 3, 0, 0]} />
        <ChartBar dataKey="budget" name="Budget" fill="#f6b73c" radius={[3, 3, 0, 0]} />
      </ChartBarChart>
    </ResponsiveContainer>
  </div>;
}

function OverviewPage() {
  const query = useGetCostguardOverview();
  const data = query.data as CostguardOverview | undefined;
  const budgetPercent = data ? Math.min(100, data.budgetUsed / Math.max(data.budgetLimit, 1) * 100) : 0;
  return <div className="space-y-8">
    <div className="fade-up flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div><div className="font-mono-ui text-[10px] uppercase tracking-[.2em] text-primary">deployment posture / live</div><h2 className="mt-2 text-[29px] font-extrabold tracking-[-0.06em] sm:text-[34px]">Cost, before it ships.</h2><p className="mt-2 max-w-xl text-[13px] leading-6 text-muted-foreground">A clear read on Terraform impact across your Azure estate. Every decision has a number behind it.</p></div>
      <button className="inline-flex items-center justify-center gap-2 self-start rounded-md border border-border bg-card px-3 py-2 text-xs font-bold text-foreground shadow-sm hover:border-primary hover:text-primary sm:self-auto" onClick={() => query.refetch()} data-testid="button-refresh-overview"><RefreshCw size={14} className={query.isFetching ? 'animate-spin' : ''} /> Refresh snapshot</button>
    </div>
    <QueryState label="overview" isLoading={query.isLoading} isError={query.isError} onRetry={() => query.refetch()} isEmpty={!data}>
      {data && <>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Monthly run-rate" value={money(data.monthlyCost)} detail={<Delta value={data.monthlyDelta} compact />} icon={Gauge} accent="cyan" />
          <MetricCard label="Plans analyzed" value={number(data.plansAnalyzed)} detail={<span className="text-xs text-muted-foreground"><span className="font-mono-ui text-foreground">{data.passRate.toFixed(1)}%</span> pass rate</span>} icon={FileCode2} accent="amber" />
          <MetricCard label="Budget consumed" value={`${budgetPercent.toFixed(1)}%`} detail={<span className="text-xs text-muted-foreground">{money(data.budgetUsed)} of {money(data.budgetLimit)}</span>} icon={ShieldCheck} accent="green" progress={budgetPercent} />
          <MetricCard label="Last pricing sync" value={timeAgo(data.lastSynced)} detail={<span className="text-xs text-muted-foreground">Azure retail catalog</span>} icon={Database} accent="violet" />
        </div>
        <div className="grid gap-5 xl:grid-cols-[1.45fr_1fr]">
          <Card className="fade-up delay-1 p-5">
            <SectionHeading eyebrow="trend / 30 days" title="Cost against budget" action={<div className="flex items-center gap-3 font-mono-ui text-[9px] uppercase tracking-[.12em] text-muted-foreground"><span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-sm bg-primary" />actual</span><span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-sm bg-accent" />budget</span></div>} />
            <TrendChart points={data.costTrend} />
          </Card>
          <Card className="fade-up delay-2 p-5">
            <SectionHeading eyebrow="guardrail / current" title="Deployment decisions" action={<Link href="/policy" className="text-[11px] font-bold text-primary hover:underline" data-testid="link-view-policy">View policy</Link>} />
            <div className="rounded-lg border border-border bg-muted/40 p-4">
              <div className="flex items-center justify-between"><span className="text-xs font-semibold text-muted-foreground">Budget headroom</span><span className="font-mono-ui text-sm font-medium text-foreground">{money(Math.max(0, data.budgetLimit - data.budgetUsed))}</span></div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-border"><div className={`h-full rounded-full ${budgetPercent > 90 ? 'bg-destructive' : 'bg-primary'}`} style={{ width: `${budgetPercent}%` }} /></div>
              <div className="mt-2 flex justify-between font-mono-ui text-[9px] text-muted-foreground"><span>used {budgetPercent.toFixed(1)}%</span><span>limit {money(data.budgetLimit)}</span></div>
            </div>
            <div className="mt-4 space-y-3">
              <DecisionRow label="Current enforcement" value="Blocking" icon={ShieldCheck} />
              <DecisionRow label="Largest open delta" value={data.monthlyDelta > 0 ? `+${money(data.monthlyDelta)}` : money(data.monthlyDelta)} icon={data.monthlyDelta > 0 ? ArrowUpRight : ArrowDownRight} tone={data.monthlyDelta > 0 ? 'rose' : 'green'} />
              <DecisionRow label="Pricing confidence" value="High · 98.4%" icon={CircleCheck} tone="green" />
            </div>
          </Card>
        </div>
        <Card className="fade-up delay-3 overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-5 py-4"><div><div className="font-mono-ui text-[9px] uppercase tracking-[.2em] text-primary">stream / latest</div><h3 className="mt-1 text-[15px] font-extrabold tracking-[-.03em]">Recent activity</h3></div><Link href="/plans" className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline" data-testid="link-all-activity">All plan history <ChevronRight size={13} /></Link></div>
          <div className="divide-y divide-border">{data.recentActivity.map((activity) => <div key={activity.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-muted/40" data-testid={`activity-${activity.id}`}><Activity size={15} className="shrink-0 text-muted-foreground" /><div className="min-w-0 flex-1"><div className="truncate text-xs font-bold">{activity.title}</div><div className="mt-0.5 truncate text-[11px] text-muted-foreground">{activity.detail}</div></div><StatusPill status={activity.status} /><span className="hidden w-14 text-right font-mono-ui text-[9px] text-muted-foreground sm:block">{timeAgo(activity.timestamp)}</span></div>)}</div>
        </Card>
      </>}
    </QueryState>
  </div>;
}

function MetricCard({ label, value, detail, icon: Icon, accent, progress }: { label: string; value: string; detail: ReactNode; icon: typeof Gauge; accent: string; progress?: number }) {
  const colors: Record<string, string> = { cyan: 'bg-cyan-50 text-cyan-700', amber: 'bg-amber-50 text-amber-700', green: 'bg-emerald-50 text-emerald-700', violet: 'bg-violet-50 text-violet-700' };
  return <Card className="relative overflow-hidden p-5 hover:-translate-y-0.5"><div className={`mb-5 grid h-8 w-8 place-items-center rounded-md ${colors[accent]}`}><Icon size={16} /></div><div className="font-mono-ui text-[9px] uppercase tracking-[.16em] text-muted-foreground">{label}</div><div className="mt-1 text-[25px] font-extrabold tracking-[-.055em]">{value}</div><div className="mt-1.5">{detail}</div>{progress !== undefined && <div className="absolute bottom-0 left-0 h-[3px] bg-emerald-500" style={{ width: `${progress}%` }} />}</Card>;
}

function DecisionRow({ label, value, icon: Icon, tone = 'cyan' }: { label: string; value: string; icon: typeof ShieldCheck; tone?: string }) {
  const color = tone === 'rose' ? 'text-rose-600' : tone === 'green' ? 'text-emerald-600' : 'text-primary';
  return <div className="flex items-center gap-3"><Icon size={15} className={color} /><span className="flex-1 text-xs text-muted-foreground">{label}</span><span className={`font-mono-ui text-[11px] font-medium ${color}`}>{value}</span></div>;
}

function PlansPage() {
  const query = useGetCostguardPlans();
  const plans = (query.data ?? []) as TerraformPlan[];
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => plans.filter((plan) => `${plan.name} ${plan.branch} ${plan.author} ${plan.status}`.toLowerCase().includes(search.toLowerCase())), [plans, search]);
  return <PageFrame eyebrow="analysis ledger" title="Terraform plan history" description="Every plan evaluated, the decision made, and the exact monthly delta it carries.">
    <div className="mb-5 flex flex-col gap-3 sm:flex-row"><div className="relative flex-1"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search plans, branches, authors..." className="h-10 w-full rounded-md border border-input bg-card pl-9 pr-3 text-xs outline-none placeholder:text-muted-foreground focus:border-primary" data-testid="input-search-plans" /></div><button className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-card px-3 text-xs font-bold hover:border-primary hover:text-primary" onClick={() => query.refetch()} data-testid="button-refresh-plans"><RefreshCw size={14} className={query.isFetching ? 'animate-spin' : ''} /> Refresh</button></div>
    <Card className="overflow-hidden"><QueryState label="plans" isLoading={query.isLoading} isError={query.isError} onRetry={() => query.refetch()} isEmpty={!filtered.length}><div className="overflow-x-auto"><table className="w-full min-w-[780px] text-left"><thead className="border-b border-border bg-muted/50 font-mono-ui text-[9px] uppercase tracking-[.14em] text-muted-foreground"><tr><th className="px-5 py-3 font-medium">Plan</th><th className="px-3 py-3 font-medium">Decision</th><th className="px-3 py-3 font-medium">Resources</th><th className="px-3 py-3 font-medium">Monthly delta</th><th className="px-3 py-3 font-medium">Analyzed</th><th className="px-5 py-3 text-right font-medium">Open</th></tr></thead><tbody className="divide-y divide-border">{filtered.map((plan) => <tr key={plan.id} className="group hover:bg-muted/35" data-testid={`row-plan-${plan.id}`}><td className="px-5 py-4"><div className="flex items-center gap-3"><div className="grid h-8 w-8 place-items-center rounded-md bg-cyan-50 text-primary"><Terminal size={15} /></div><div><div className="text-xs font-bold">{plan.name}</div><div className="mt-1 flex items-center gap-2 font-mono-ui text-[9px] text-muted-foreground"><GitBranch size={11} />{plan.branch}<span className="text-border">/</span>{plan.author}</div></div></div></td><td className="px-3 py-4"><StatusPill status={plan.status} /></td><td className="px-3 py-4 font-mono-ui text-xs text-muted-foreground">{plan.resources}</td><td className="px-3 py-4"><Delta value={plan.delta} /></td><td className="px-3 py-4"><div className="text-xs text-foreground">{timeAgo(plan.createdAt)}</div><div className="mt-1 font-mono-ui text-[9px] text-muted-foreground">{plan.duration}</div></td><td className="px-5 py-4 text-right"><Link href={`/plans/${plan.id}`} className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-[11px] font-bold text-primary hover:bg-cyan-50" data-testid={`link-plan-${plan.id}`}>Inspect <ChevronRight size={13} /></Link></td></tr>)}</tbody></table></div></QueryState></Card>
  </PageFrame>;
}

function PlanDetailPage() {
  const params = useParams<{ id: string }>();
  const query = useGetCostguardPlan(params.id ?? '', { query: { enabled: Boolean(params.id), queryKey: getGetCostguardPlanQueryKey(params.id ?? '') } });
  const plan = query.data as TerraformPlan | undefined;
  return <PageFrame eyebrow="analysis ledger / detail" title={plan?.name ?? 'Plan analysis'} description={plan ? `Reviewed ${dateLabel(plan.createdAt)} by ${plan.author}.` : 'Loading the selected Terraform plan analysis.'} backHref="/plans" backLabel="Back to plan history">
    <QueryState label="plan detail" isLoading={query.isLoading} isError={query.isError} onRetry={() => query.refetch()} isEmpty={!plan}>{plan && <div className="space-y-5"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><MetricCard label="Decision" value={plan.status === 'passed' ? 'Pass' : plan.status === 'blocked' ? 'Block' : 'Review'} detail={<StatusPill status={plan.status} />} icon={plan.status === 'blocked' ? CircleAlert : CircleCheck} accent={plan.status === 'blocked' ? 'violet' : 'green'} /><MetricCard label="Current monthly" value={money(plan.currentCost)} detail={<span className="text-xs text-muted-foreground">before apply</span>} icon={Gauge} accent="cyan" /><MetricCard label="Proposed monthly" value={money(plan.proposedCost)} detail={<Delta value={plan.delta} />} icon={ArrowUpRight} accent="amber" /><MetricCard label="Resources touched" value={number(plan.resources)} detail={<span className="text-xs text-muted-foreground">analysis in {plan.duration}</span>} icon={Box} accent="violet" /></div><Card className="p-6"><SectionHeading eyebrow="decision trace" title="Why this plan was {plan.status === 'passed' ? 'allowed' : 'held'}" /><div className="grid gap-4 md:grid-cols-3"><DecisionRow label="Projected change" value={`${plan.delta >= 0 ? '+' : ''}${money(plan.delta)}`} icon={plan.delta > 0 ? ArrowUpRight : ArrowDownRight} tone={plan.delta > 0 ? 'rose' : 'green'} /><DecisionRow label="Budget policy" value={plan.status === 'blocked' ? 'Threshold exceeded' : 'Within limits'} icon={ShieldCheck} tone={plan.status === 'blocked' ? 'rose' : 'green'} /><DecisionRow label="Confidence" value="High · 98.4%" icon={CircleCheck} tone="green" /></div></Card><Card className="overflow-hidden"><div className="border-b border-border px-5 py-4"><div className="font-mono-ui text-[9px] uppercase tracking-[.2em] text-primary">metadata</div><h3 className="mt-1 text-[15px] font-extrabold">Analysis context</h3></div><div className="grid gap-4 p-5 sm:grid-cols-3"><Detail label="Branch" value={plan.branch} /><Detail label="Author" value={plan.author} /><Detail label="Analyzed" value={dateLabel(plan.createdAt)} /></div></Card></div>}</QueryState>
  </PageFrame>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div><div className="font-mono-ui text-[9px] uppercase tracking-[.15em] text-muted-foreground">{label}</div><div className="mt-1 text-xs font-semibold">{value}</div></div>;
}

function ResourcesPage() {
  const query = useGetCostguardResources();
  const resources = (query.data ?? []) as AzureResource[];
  const [filter, setFilter] = useState('all');
  const filtered = resources.filter((resource) => filter === 'all' || resource.action === filter);
  return <PageFrame eyebrow="estate inventory" title="Extracted Azure resources" description="Resource-level deltas explain exactly where a Terraform plan changes the bill."><div className="mb-5 flex items-center justify-between gap-3"><div className="flex items-center gap-1 rounded-md border border-border bg-card p-1"><button className={`rounded px-2.5 py-1.5 text-[10px] font-bold ${filter === 'all' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'}`} onClick={() => setFilter('all')} data-testid="button-filter-resources-all">All resources</button>{['create', 'update', 'delete'].map((item) => <button key={item} className={`rounded px-2.5 py-1.5 text-[10px] font-bold capitalize ${filter === item ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'}`} onClick={() => setFilter(item)} data-testid={`button-filter-resources-${item}`}>{item}</button>)}</div><button className="rounded-md border border-border bg-card p-2 text-muted-foreground hover:border-primary hover:text-primary" onClick={() => query.refetch()} data-testid="button-refresh-resources" aria-label="Refresh resources"><RefreshCw size={15} className={query.isFetching ? 'animate-spin' : ''} /></button></div><Card className="overflow-hidden"><QueryState label="resources" isLoading={query.isLoading} isError={query.isError} onRetry={() => query.refetch()} isEmpty={!filtered.length}><div className="overflow-x-auto"><table className="w-full min-w-[800px] text-left"><thead className="border-b border-border bg-muted/50 font-mono-ui text-[9px] uppercase tracking-[.14em] text-muted-foreground"><tr><th className="px-5 py-3 font-medium">Resource</th><th className="px-3 py-3 font-medium">Action</th><th className="px-3 py-3 font-medium">Current</th><th className="px-3 py-3 font-medium">Proposed</th><th className="px-3 py-3 font-medium">Delta</th><th className="px-5 py-3 text-right font-medium">Confidence</th></tr></thead><tbody className="divide-y divide-border">{filtered.map((resource) => <tr key={resource.id} className="hover:bg-muted/35" data-testid={`row-resource-${resource.id}`}><td className="px-5 py-4"><div className="flex items-center gap-3"><div className="grid h-8 w-8 place-items-center rounded-md bg-muted text-primary"><Cloud size={15} /></div><div><div className="text-xs font-bold">{resource.name}</div><div className="mt-1 font-mono-ui text-[9px] text-muted-foreground">{resource.type} · {resource.region}</div></div></div></td><td className="px-3 py-4"><span className="font-mono-ui text-[10px] uppercase tracking-[.1em] text-muted-foreground">{resource.action}</span></td><td className="px-3 py-4 font-mono-ui text-xs">{money(resource.currentCost)}</td><td className="px-3 py-4 font-mono-ui text-xs">{money(resource.proposedCost)}</td><td className="px-3 py-4"><Delta value={resource.delta} /></td><td className="px-5 py-4 text-right"><div className="inline-flex items-center gap-2"><div className="h-1.5 w-16 overflow-hidden rounded-full bg-border"><div className="h-full rounded-full bg-primary" style={{ width: `${resource.confidence}%` }} /></div><span className="font-mono-ui text-[10px] text-muted-foreground">{resource.confidence}%</span></div></td></tr>)}</tbody></table></div></QueryState></Card></PageFrame>;
}

function PricingPage() {
  const query = useGetCostguardPricing();
  const pricing = (query.data ?? []) as PricingItem[];
  const [search, setSearch] = useState('');
  const filtered = pricing.filter((item) => `${item.service} ${item.sku} ${item.region}`.toLowerCase().includes(search.toLowerCase()));
  return <PageFrame eyebrow="pricing intelligence" title="Azure retail catalog" description="The price inputs CostGuard uses to make a deployment decision."><div className="mb-5 flex gap-3"><div className="relative flex-1"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search service, SKU, region..." className="h-10 w-full rounded-md border border-input bg-card pl-9 pr-3 text-xs outline-none focus:border-primary" data-testid="input-search-pricing" /></div><button className="rounded-md border border-border bg-card px-3 text-xs font-bold hover:border-primary hover:text-primary" onClick={() => query.refetch()} data-testid="button-refresh-pricing"><RefreshCw size={14} className={query.isFetching ? 'animate-spin' : ''} /></button></div><Card className="overflow-hidden"><QueryState label="pricing entries" isLoading={query.isLoading} isError={query.isError} onRetry={() => query.refetch()} isEmpty={!filtered.length}><div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left"><thead className="border-b border-border bg-muted/50 font-mono-ui text-[9px] uppercase tracking-[.14em] text-muted-foreground"><tr><th className="px-5 py-3 font-medium">Service / SKU</th><th className="px-3 py-3 font-medium">Region</th><th className="px-3 py-3 font-medium">Unit</th><th className="px-3 py-3 font-medium">Retail price</th><th className="px-3 py-3 font-medium">Cache</th><th className="px-5 py-3 text-right font-medium">Synced</th></tr></thead><tbody className="divide-y divide-border">{filtered.map((item) => <tr key={item.id} className="hover:bg-muted/35" data-testid={`row-pricing-${item.id}`}><td className="px-5 py-4"><div className="text-xs font-bold">{item.service}</div><div className="mt-1 font-mono-ui text-[9px] text-muted-foreground">{item.sku}</div></td><td className="px-3 py-4 text-xs text-muted-foreground">{item.region}</td><td className="px-3 py-4 font-mono-ui text-[10px] text-muted-foreground">{item.unit}</td><td className="px-3 py-4 font-mono-ui text-xs font-medium">{money(item.price)} <span className="text-[9px] text-muted-foreground">{item.currency}</span></td><td className="px-3 py-4"><StatusPill status={item.cacheStatus} /></td><td className="px-5 py-4 text-right font-mono-ui text-[10px] text-muted-foreground">{timeAgo(item.syncedAt)}</td></tr>)}</tbody></table></div></QueryState></Card></PageFrame>;
}

function CachePage() {
  const query = useGetCostguardCache();
  const cache = query.data as CacheHealth | undefined;
  return <PageFrame eyebrow="pricing intelligence" title="Cache health" description="Fresh pricing is the first line of defense against a false deployment decision."><QueryState label="cache health" isLoading={query.isLoading} isError={query.isError} onRetry={() => query.refetch()} isEmpty={!cache}>{cache && <div className="space-y-5"><Card className="grid gap-5 p-6 md:grid-cols-[1.2fr_1fr]"><div><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-50 text-emerald-700"><Database size={19} /></div><div><div className="font-mono-ui text-[9px] uppercase tracking-[.18em] text-muted-foreground">engine status</div><div className="mt-1 flex items-center gap-2 text-[20px] font-extrabold tracking-[-.05em]">{cache.engine}<StatusPill status={cache.status} /></div></div></div><p className="mt-5 max-w-md text-xs leading-5 text-muted-foreground">Pricing lookups are served from the local retail catalog cache before a plan is allowed to continue.</p></div><div className="rounded-lg border border-border bg-muted/35 p-4"><div className="flex justify-between text-xs"><span className="font-semibold">Cache hit rate</span><span className="font-mono-ui font-medium text-primary">{cache.hitRate}%</span></div><div className="mt-3 h-2 rounded-full bg-border"><div className="h-full rounded-full bg-primary" style={{ width: `${cache.hitRate}%` }} /></div><div className="mt-2 font-mono-ui text-[9px] text-muted-foreground">{number(cache.entries)} entries · {cache.size} on disk</div></div></Card><div className="grid gap-3 sm:grid-cols-3"><MetricCard label="Catalog entries" value={number(cache.entries)} detail={<span className="text-xs text-muted-foreground">indexed price points</span>} icon={Package} accent="cyan" /><MetricCard label="Last refresh" value={timeAgo(cache.lastRefresh)} detail={<span className="text-xs text-muted-foreground">scheduled sync window</span>} icon={Clock3} accent="amber" /><MetricCard label="Cache size" value={cache.size} detail={<span className="text-xs text-muted-foreground">local storage footprint</span>} icon={Database} accent="violet" /></div><Card className="p-5"><SectionHeading eyebrow="synchronization" title="Operational checks" /><div className="space-y-3"><CheckRow label="Azure retail pricing endpoint" detail="reachable · response within expected range" /><CheckRow label="Catalog schema validation" detail="all required price dimensions present" /><CheckRow label="Stale entry sweep" detail="next sweep runs with the next refresh" /></div></Card></div>}</QueryState></PageFrame>;
}

function CheckRow({ label, detail }: { label: string; detail: string }) {
  return <div className="flex items-center gap-3 border-b border-border pb-3 last:border-0 last:pb-0"><CircleCheck size={16} className="text-emerald-600" /><div className="flex-1"><div className="text-xs font-bold">{label}</div><div className="mt-0.5 text-[11px] text-muted-foreground">{detail}</div></div><span className="font-mono-ui text-[9px] uppercase tracking-[.12em] text-emerald-600">ok</span></div>;
}

function PolicyPage() {
  const query = useGetCostguardPolicy();
  const policy = query.data as BudgetPolicy | undefined;
  const [saved, setSaved] = useState(false);
  const [enforcement, setEnforcement] = useState<'block' | 'warn'>('block');
  return <PageFrame eyebrow="guardrails" title="Budget policy" description="Set the rules that turn a cost projection into a clear deployment decision."><QueryState label="budget policy" isLoading={query.isLoading} isError={query.isError} onRetry={() => query.refetch()} isEmpty={!policy}>{policy && <div className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]"><Card className="p-6"><div className="flex items-start justify-between gap-3"><div><div className="font-mono-ui text-[9px] uppercase tracking-[.2em] text-primary">active policy</div><h3 className="mt-1 text-[19px] font-extrabold tracking-[-.04em]">{policy.name}</h3></div><StatusPill status={enforcement} /></div><div className="mt-7 grid gap-5 sm:grid-cols-2"><label className="block"><span className="font-mono-ui text-[9px] uppercase tracking-[.14em] text-muted-foreground">Monthly limit</span><div className="relative mt-2"><span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono-ui text-xs text-muted-foreground">$</span><input defaultValue={policy.monthlyLimit} type="number" className="h-10 w-full rounded-md border border-input bg-background pl-7 pr-3 font-mono-ui text-xs outline-none focus:border-primary" data-testid="input-monthly-limit" /></div></label><label className="block"><span className="font-mono-ui text-[9px] uppercase tracking-[.14em] text-muted-foreground">Plan delta limit</span><div className="relative mt-2"><span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono-ui text-xs text-muted-foreground">$</span><input defaultValue={policy.deltaLimit} type="number" className="h-10 w-full rounded-md border border-input bg-background pl-7 pr-3 font-mono-ui text-xs outline-none focus:border-primary" data-testid="input-delta-limit" /></div></label></div><div className="mt-6"><div className="font-mono-ui text-[9px] uppercase tracking-[.14em] text-muted-foreground">Enforcement mode</div><div className="mt-2 grid gap-2 sm:grid-cols-2">{(['block', 'warn'] as const).map((item) => <button key={item} className={`rounded-lg border p-3 text-left ${enforcement === item ? 'border-primary bg-cyan-50' : 'border-border bg-background hover:border-primary/50'}`} onClick={() => setEnforcement(item)} data-testid={`button-enforcement-${item}`}><div className="flex items-center gap-2 text-xs font-bold capitalize">{item === 'block' ? <ShieldCheck size={15} className="text-primary" /> : <CircleAlert size={15} className="text-amber-600" />}{item} deployments</div><p className="mt-1 text-[10px] leading-4 text-muted-foreground">{item === 'block' ? 'Prevent apply when the projected cost exceeds the policy.' : 'Allow apply, but surface an operator warning.'}</p></button>)}</div></div><button className="mt-7 inline-flex items-center gap-2 rounded-md bg-foreground px-4 py-2.5 text-xs font-bold text-background hover:opacity-85" onClick={() => setSaved(true)} data-testid="button-save-policy"><ShieldCheck size={14} />{saved ? 'Policy saved locally' : 'Save policy'}</button></Card><div className="space-y-5"><Card className="p-5"><SectionHeading eyebrow="enforcement summary" title="What happens next" /><div className="space-y-4"><DecisionRow label="Window" value={policy.window} icon={Clock3} /><DecisionRow label="Monthly threshold" value={money(policy.monthlyLimit)} icon={Gauge} /><DecisionRow label="Delta threshold" value={money(policy.deltaLimit)} icon={ArrowUpRight} /><DecisionRow label="Last updated" value={dateLabel(policy.updatedAt)} icon={RefreshCw} /></div></Card><Card className="grid-lines overflow-hidden p-5"><div className="font-mono-ui text-[9px] uppercase tracking-[.2em] text-primary">policy note</div><p className="mt-3 text-[13px] font-semibold leading-6 text-foreground">CostGuard blocks on evidence, not instinct. Pricing confidence and budget headroom are shown alongside every decision.</p></Card></div></div>}</QueryState></PageFrame>;
}

function ReportsPage() {
  const query = useGetCostguardReports();
  const reports = (query.data ?? []) as CostReport[];
  return <PageFrame eyebrow="audit trail" title="Cost analysis reports" description="A durable record of the cost conversation around every deployment decision."><div className="mb-5 flex justify-end"><button className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-xs font-bold hover:border-primary hover:text-primary" onClick={() => query.refetch()} data-testid="button-refresh-reports"><RefreshCw size={14} className={query.isFetching ? 'animate-spin' : ''} /> Refresh reports</button></div><Card className="overflow-hidden"><QueryState label="reports" isLoading={query.isLoading} isError={query.isError} onRetry={() => query.refetch()} isEmpty={!reports.length}><div className="divide-y divide-border">{reports.map((report) => <div key={report.id} className="flex flex-col gap-3 px-5 py-4 hover:bg-muted/35 sm:flex-row sm:items-center" data-testid={`row-report-${report.id}`}><div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-cyan-50 text-primary"><BarChart3 size={16} /></div><div className="min-w-0 flex-1"><div className="truncate text-xs font-bold">{report.name}</div><div className="mt-1 font-mono-ui text-[9px] uppercase tracking-[.12em] text-muted-foreground">{report.period} · generated {timeAgo(report.generatedAt)}</div></div><div className="sm:w-28"><div className="font-mono-ui text-xs font-medium">{money(report.totalCost)}</div><Delta value={report.delta} /></div><StatusPill status={report.status} /><button className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground" onClick={() => window.alert(`Report ${report.name} is ready to export.`)} data-testid={`button-report-${report.id}`} aria-label={`Export ${report.name}`}><MoreHorizontal size={16} /></button></div>)}</div></QueryState></Card></PageFrame>;
}

function PageFrame({ eyebrow, title, description, children, backHref, backLabel }: { eyebrow: string; title: string; description: string; children: ReactNode; backHref?: string; backLabel?: string }) {
  return <div className="space-y-7"><div className="fade-up flex flex-col gap-2">{backHref && <Link href={backHref} className="mb-2 inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline" data-testid="link-back"><ChevronRight size={13} className="rotate-180" />{backLabel}</Link>}<div className="font-mono-ui text-[10px] uppercase tracking-[.2em] text-primary">{eyebrow}</div><h2 className="text-[29px] font-extrabold tracking-[-0.06em]">{title}</h2><p className="max-w-2xl text-[13px] leading-6 text-muted-foreground">{description}</p></div>{children}</div>;
}

function NotFound() {
  return <PageFrame eyebrow="404 / route not found" title="This control room panel does not exist." description="The requested path is not part of the CostGuard surface."><Link href="/" className="inline-flex items-center gap-2 rounded-md bg-foreground px-4 py-2.5 text-xs font-bold text-background" data-testid="link-return-overview">Return to overview <ChevronRight size={14} /></Link></PageFrame>;
}

function Router() {
  return <Shell><Switch><Route path="/" component={OverviewPage} /><Route path="/plans" component={PlansPage} /><Route path="/plans/:id" component={PlanDetailPage} /><Route path="/resources" component={ResourcesPage} /><Route path="/pricing" component={PricingPage} /><Route path="/cache" component={CachePage} /><Route path="/policy" component={PolicyPage} /><Route path="/reports" component={ReportsPage} /><Route component={NotFound} /></Switch></Shell>;
}

function App() {
  return <QueryClientProvider client={queryClient}><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter></QueryClientProvider>;
}

export default App;