import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useActiveChild } from "../hooks/useActiveChild";
import { useAuth } from "../hooks/useAuth";
import { useTheme, type ThemeMode } from "../hooks/useTheme";
import { Card } from "../components/Card";
import { Avatar } from "../components/Avatar";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { CheckIcon, LogoutIcon, PlusIcon, ShareIcon } from "../components/icons";
import { ageLabel, cn } from "../lib/utils";
import i18n, { SUPPORTED_LANGUAGES, type Language } from "../i18n";

const THEME_OPTIONS: { value: ThemeMode; labelKey: string; descKey: string }[] = [
  { value: "light", labelKey: "settings.appearance.light", descKey: "settings.appearance.lightDesc" },
  { value: "dark", labelKey: "settings.appearance.dark", descKey: "settings.appearance.darkDesc" },
  { value: "system", labelKey: "settings.appearance.system", descKey: "settings.appearance.systemDesc" },
];

const LANGUAGE_OPTIONS: { value: Language; labelKey: string }[] = [
  { value: "en", labelKey: "settings.appearance.english" },
  { value: "vi", labelKey: "settings.appearance.vietnamese" },
];

export default function Settings() {
  const { t } = useTranslation();
  const { children, activeChild, activeChildId, setActiveChildId } = useActiveChild();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { mode, setMode } = useTheme();

  const currentLang = (SUPPORTED_LANGUAGES as readonly string[]).includes(i18n.language)
    ? (i18n.language as Language)
    : i18n.language?.startsWith("vi")
    ? "vi"
    : "en";

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
          {t("settings.title")}
        </h1>
      </header>

      {/* Appearance — theme */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
          {t("settings.appearance.title")}
        </h2>
        <Card className="space-y-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t("settings.appearance.subtitle")}
          </p>
          <div>
            <p className="label">{t("settings.appearance.theme")}</p>
            <div className="grid grid-cols-3 gap-2">
              {THEME_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setMode(opt.value)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 text-sm font-semibold transition",
                    mode === opt.value
                      ? "border-brand-400 bg-brand-50 text-brand-700 dark:border-brand-500 dark:bg-brand-900/40 dark:text-brand-200"
                      : "border-slate-200 bg-white text-slate-600 hover:border-brand-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-brand-700",
                  )}
                >
                  <ThemeIcon mode={opt.value} active={mode === opt.value} />
                  <span>{t(opt.labelKey)}</span>
                  <span className="text-[10px] font-normal text-slate-400 dark:text-slate-500">
                    {t(opt.descKey)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Language */}
          <div>
            <p className="label">{t("settings.appearance.language")}</p>
            <div className="grid grid-cols-2 gap-2">
              {LANGUAGE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => i18n.changeLanguage(opt.value)}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-xl border-2 p-3 text-sm font-semibold transition",
                    currentLang === opt.value
                      ? "border-brand-400 bg-brand-50 text-brand-700 dark:border-brand-500 dark:bg-brand-900/40 dark:text-brand-200"
                      : "border-slate-200 bg-white text-slate-600 hover:border-brand-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-brand-700",
                  )}
                >
                  {currentLang === opt.value && <CheckIcon className="h-4 w-4" />}
                  {t(opt.labelKey)}
                </button>
              ))}
            </div>
          </div>
        </Card>
      </section>

      {/* Child switcher */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
          {t("settings.myChildren")}
        </h2>
        <ul className="space-y-2">
          {children.map((c) => {
            const active = c.id === activeChildId;
            return (
              <li key={c.id}>
                <button
                  onClick={() => {
                    setActiveChildId(c.id);
                    navigate("/app");
                  }}
                  className={cn(
                    "card flex w-full items-center gap-3 p-4 text-left transition hover:shadow-soft",
                    active && "ring-2 ring-brand-300 dark:ring-brand-500",
                  )}
                >
                  <Avatar name={c.name} src={c.photo_url} size="lg" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-800 dark:text-slate-100">
                      {c.name}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      {ageLabel(c.birth_date)}
                      {c.role ? ` · ${c.role}` : ""}
                    </p>
                  </div>
                  {active && <CheckIcon className="h-5 w-5 text-brand-500 dark:text-brand-400" />}
                </button>
              </li>
            );
          })}
          <li>
            <Link to="/onboarding" className="contents">
              <Card className="flex items-center justify-center gap-2 border-2 border-dashed border-brand-200 text-brand-600 hover:bg-brand-50 dark:border-brand-800 dark:text-brand-300 dark:hover:bg-brand-900/30">
                <PlusIcon className="h-5 w-5" />
                <span className="font-semibold">{t("settings.addAnother")}</span>
              </Card>
            </Link>
          </li>
        </ul>
      </section>

      {/* Active child quick actions */}
      {activeChild && (
        <Card title={t("settings.activeChild")}>
          <div className="flex flex-col gap-2">
            <Link to="/app/child">
              <Button variant="secondary" className="w-full justify-start">
                {t("settings.editProfile")}
              </Button>
            </Link>
            <Link to="/app/share">
              <Button variant="secondary" className="w-full justify-start">
                <ShareIcon className="h-5 w-5" /> {t("settings.manageSharing")}
              </Button>
            </Link>
          </div>
        </Card>
      )}

      {/* Account */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
          {t("settings.account")}
        </h2>
        <Card className="space-y-3">
          <Input label={t("settings.name")} value={user?.name ?? ""} readOnly />
          <Input label={t("settings.email")} value={user?.email ?? ""} readOnly />
          <Button
            variant="danger"
            className="w-full"
            onClick={() => {
              signOut();
              navigate("/login");
            }}
          >
            <LogoutIcon className="h-5 w-5" /> {t("nav.signOut")}
          </Button>
        </Card>
      </section>

      <p className="pb-4 text-center text-xs text-slate-300 dark:text-slate-600">
        {t("app.madeWith")}
      </p>
    </div>
  );
}

function ThemeIcon({ mode, active }: { mode: ThemeMode; active: boolean }) {
  const stroke = active ? "currentColor" : "currentColor";
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke={stroke}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {mode === "light" && (
        <>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </>
      )}
      {mode === "dark" && <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />}
      {mode === "system" && (
        <>
          <rect x="3" y="4" width="18" height="12" rx="2" />
          <path d="M8 20h8M12 16v4" />
        </>
      )}
    </svg>
  );
}
