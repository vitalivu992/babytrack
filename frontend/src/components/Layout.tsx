import { type ReactNode } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useActiveChild } from "../hooks/useActiveChild";
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
  label: string;
  icon: (props: { className?: string }) => ReactNode;
}

const PRIMARY_NAV: NavItem[] = [
  { to: "/app", label: "Home", icon: HomeIcon },
  { to: "/app/logs", label: "Logs", icon: ListIcon },
  { to: "/app/child", label: "Child", icon: ChildIcon },
  { to: "/app/insights", label: "Insights", icon: ChartIcon },
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
        active ? "text-brand-600" : "text-slate-400 hover:text-brand-500",
      )}
    >
      <Icon className="h-6 w-6" />
      <span>{item.label}</span>
    </NavLink>
  );
}

function BrandHeader() {
  return (
    <Link to="/app" className="flex items-center gap-2">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-100 text-lg">
        🍼
      </div>
      <span className="text-lg font-bold text-slate-800">BabyTrack</span>
    </Link>
  );
}

function ActiveChildPill() {
  const { activeChild, children } = useActiveChild();
  if (!activeChild) return null;
  return (
    <Link
      to="/app/settings"
      className="flex items-center gap-2 rounded-full bg-brand-50 py-1 pl-1 pr-3 transition hover:bg-brand-100"
    >
      <Avatar name={activeChild.name} src={activeChild.photo_url} size="sm" />
      <span className="max-w-[120px] truncate text-sm font-semibold text-brand-700">
        {activeChild.name}
      </span>
      {children.length > 1 && (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-brand-400">
          <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      <span className="sr-only">Switch child in settings</span>
    </Link>
  );
}

function SecondaryNav() {
  const { signOut } = useAuth();
  return (
    <nav className="flex flex-col gap-1">
      <SidebarLink to="/app/share" label="Share" icon={ShareIcon} />
      <SidebarLink to="/app/settings" label="Settings" icon={SettingsIcon} />
      <button
        onClick={signOut}
        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-rose-50 hover:text-rose-600"
      >
        <LogoutIcon className="h-5 w-5" />
        Sign out
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
            ? "bg-brand-100 text-brand-700"
            : "text-slate-600 hover:bg-brand-50 hover:text-brand-700",
        )
      }
    >
      <Icon className="h-5 w-5" />
      {label}
    </NavLink>
  );
}

export function AppLayout() {
  return (
    <div className="min-h-screen">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-brand-100 bg-white/70 px-4 py-6 backdrop-blur-md lg:flex">
        <div className="px-2">
          <BrandHeader />
        </div>
        <div className="mt-8 px-2">
          <ActiveChildPill />
        </div>
        <nav className="mt-8 flex flex-1 flex-col gap-1 px-2">
          {PRIMARY_NAV.map((item) => (
            <SidebarLink key={item.to} to={item.to} label={item.label} icon={item.icon} />
          ))}
          <div className="my-4 border-t border-brand-100" />
          <SecondaryNav />
        </nav>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-brand-100 bg-white/80 px-4 py-3 backdrop-blur-md lg:hidden">
        <BrandHeader />
        <ActiveChildPill />
      </header>

      {/* Main content */}
      <main className="mx-auto w-full max-w-3xl px-4 pb-28 pt-4 lg:ml-64 lg:max-w-4xl lg:pb-8">
        <Outlet />
      </main>

      {/* Mobile floating add button */}
      <Link
        to="/app/log/new"
        aria-label="Quick log"
        className="fixed bottom-24 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-brand-500 text-white shadow-soft transition hover:bg-brand-600 active:scale-95 lg:hidden"
      >
        <PlusIcon className="h-7 w-7" />
      </Link>

      {/* Mobile bottom navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex items-stretch gap-1 border-t border-brand-100 bg-white/90 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden">
        {PRIMARY_NAV.map((item) => (
          <NavButton key={item.to} item={item} />
        ))}
      </nav>
    </div>
  );
}
