import { type ReactNode } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../hooks/useAuth";
import { useActiveChild } from "../hooks/useActiveChild";
import { useTheme, type ThemeMode } from "../hooks/useTheme";
import { Avatar } from "./Avatar";
import { cn } from "../lib/utils";
import {
  ChartIcon,
  ChildIcon,
  HomeIcon,
  ListIcon,
  LogoutIcon,
  PlusIcon,
  SettingsIcon,
  ShareIcon,
} from "./icons";

interface NavItem {
  to: string;
  labelKey: string;
  icon: (props: { className?: string }) => ReactNode;
}

const PRIMARY_NAV: NavItem[] = [
  { to: "/app", labelKey: "nav.home", icon: HomeIcon },
  { to: "/app/logs", labelKey: "nav.logs", icon: ListIcon },
  { to: "/app/child", labelKey: "nav.child", icon: ChildIcon },
  { to: "/app/insights", labelKey: "nav.insights", icon: ChartIcon },
];

/** Full-screen centered spinner, used while auth resolves. */
export function FullScreenLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-200 border-t-brand-500" />
    </div>
  );
}

function NavButton({ item }: { item: NavItem }) {
  const { t } = useTranslation();
  const Icon = item.icon;
  const location = useLocation();
  const isExact = item.to === "/app";
  const active = isExact
    ? location.pathname === "/app"
    : location.pathname.startsWith(item.to);
  return (
    <NavLink
      to={item.to}
      end={isExact}
      className={cn(
        "flex flex-1 flex-col items-center justify-center gap-0.5 rounded-xl py-2 text-[11px] font-semibold transition",
        active
          ? "text-brand-600 dark:text-brand-400"
          : "text-slate-400 hover:text-brand-500 dark:hover:text-brand-400",
      )}
    >
      <Icon className="h-6 w-6" />
      <span>{t(item.labelKey)}</span>
    </NavLink>
  );
}

function BrandHeader() {
  const { t } = useTranslation();
  return (
    <Link to="/app" className="flex items-center gap-2">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-100 text-lg dark:bg-brand-900/60">
        🍼
      </div>
      <span className="text-lg font-bold text-slate-800 dark:text-slate-100">
        {t("app.brand")}
      </span>
    </Link>
  );
}

function ActiveChildPill() {
  const { activeChild, children } = useActiveChild();
  if (!activeChild) return null;
  return (
    <Link
      to="/app/settings"
      className="flex items-center gap-2 rounded-full bg-brand-50 py-1 pl-1 pr-3 transition hover:bg-brand-100 dark:bg-slate-700/60 dark:hover:bg-slate-700"
    >
      <Avatar name={activeChild.name} src={activeChild.photo_url} size="sm" />
      <span className="max-w-[120px] truncate text-sm font-semibold text-brand-700 dark:text-brand-300">
        {activeChild.name}
      </span>
      {children.length > 1 && (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-brand-400">
          <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      <span className="sr-only">{/* accessible hint */}settings</span>
    </Link>
  );
}

function ThemeQuickToggle() {
  const { mode, setMode } = useTheme();
  // Cycle light → dark → system.
  const next: Record<ThemeMode, ThemeMode> = {
    light: "dark",
    dark: "system",
    system: "light",
  };
  return (
    <button
      type="button"
      onClick={() => setMode(next[mode])}
      aria-label="Toggle theme"
      className="flex items-center justify-center rounded-xl border border-brand-100 p-2 text-slate-500 transition hover:bg-brand-50 hover:text-brand-600 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700/60 dark:hover:text-brand-300"
    >
      {mode === "light" && <SunIcon className="h-5 w-5" />}
      {mode === "dark" && <MoonGlyph className="h-5 w-5" />}
      {mode === "system" && <SystemIcon className="h-5 w-5" />}
    </button>
  );
}

function SunIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

function MoonGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  );
}

function SystemIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
    </svg>
  );
}

function SecondaryNav() {
  const { t } = useTranslation();
  const { signOut } = useAuth();
  return (
    <nav className="flex flex-col gap-1">
      <SidebarLink to="/app/share" label={t("nav.share")} icon={ShareIcon} />
      <SidebarLink to="/app/settings" label={t("nav.settings")} icon={SettingsIcon} />
      <button
        onClick={signOut}
        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-rose-50 hover:text-rose-600 dark:text-slate-300 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
      >
        <LogoutIcon className="h-5 w-5" />
        {t("nav.signOut")}
      </button>
    </nav>
  );
}

function SidebarLink({
  to,
  label,
  icon: Icon,
}: {
  to: string;
  label: string;
  icon: (props: { className?: string }) => ReactNode;
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
          isActive
            ? "bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-200"
            : "text-slate-600 hover:bg-brand-50 hover:text-brand-700 dark:text-slate-300 dark:hover:bg-slate-700/60 dark:hover:text-brand-300",
        )
      }
    >
      <Icon className="h-5 w-5" />
      {label}
    </NavLink>
  );
}

export function AppLayout() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-brand-100 bg-white/70 px-4 py-6 backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/70 lg:flex">
        <div className="px-2">
          <BrandHeader />
        </div>
        <div className="mt-8 px-2">
          <ActiveChildPill />
        </div>
        <nav className="mt-8 flex flex-1 flex-col gap-1 px-2">
          {PRIMARY_NAV.map((item) => (
            <SidebarLink key={item.to} to={item.to} label={t(item.labelKey)} icon={item.icon} />
          ))}
          <div className="my-4 border-t border-brand-100 dark:border-slate-700" />
          <SecondaryNav />
        </nav>
        <div className="px-2">
          <ThemeQuickToggle />
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-brand-100 bg-white/80 px-4 py-3 backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/80 lg:hidden">
        <BrandHeader />
        <div className="flex items-center gap-2">
          <ThemeQuickToggle />
          <ActiveChildPill />
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto w-full max-w-3xl px-4 pb-28 pt-4 lg:ml-64 lg:max-w-4xl lg:pb-8">
        <Outlet />
      </main>

      {/* Mobile floating add button */}
      <Link
        to="/app/log/new"
        aria-label={t("app.quickLog")}
        className="fixed bottom-24 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-brand-500 text-white shadow-soft transition hover:bg-brand-600 active:scale-95 lg:hidden"
      >
        <PlusIcon className="h-7 w-7" />
      </Link>

      {/* Mobile bottom navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex items-stretch gap-1 border-t border-brand-100 bg-white/90 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/90 lg:hidden">
        {PRIMARY_NAV.map((item) => (
          <NavButton key={item.to} item={item} />
        ))}
      </nav>
    </div>
  );
}
