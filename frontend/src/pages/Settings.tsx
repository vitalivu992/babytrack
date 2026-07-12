import { useNavigate } from "react-router-dom";
import { useActiveChild } from "../hooks/useActiveChild";
import { useAuth } from "../hooks/useAuth";
import { Card } from "../components/Card";
import { Avatar } from "../components/Avatar";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { CheckIcon, LogoutIcon, PlusIcon, ShareIcon } from "../components/icons";
import { ageLabel, cn } from "../lib/utils";
import { Link } from "react-router-dom";

export default function Settings() {
  const { children, activeChild, activeChildId, setActiveChildId } = useActiveChild();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold text-slate-800">Settings</h1>
      </header>

      {/* Child switcher */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
          My children
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
                    active && "ring-2 ring-brand-300",
                  )}
                >
                  <Avatar name={c.name} src={c.photo_url} size="lg" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-800">{c.name}</p>
                    <p className="text-xs text-slate-400">
                      {ageLabel(c.birth_date)}
                      {c.role ? ` · ${c.role}` : ""}
                    </p>
                  </div>
                  {active && <CheckIcon className="h-5 w-5 text-brand-500" />}
                </button>
              </li>
            );
          })}
          <li>
            <Link to="/onboarding" className="contents">
              <Card className="flex items-center justify-center gap-2 border-2 border-dashed border-brand-200 text-brand-600 hover:bg-brand-50">
                <PlusIcon className="h-5 w-5" />
                <span className="font-semibold">Add another child</span>
              </Card>
            </Link>
          </li>
        </ul>
      </section>

      {/* Active child quick actions */}
      {activeChild && (
        <Card title="Active child">
          <div className="flex flex-col gap-2">
            <Link to="/app/child">
              <Button variant="secondary" className="w-full justify-start">
                Edit profile & growth
              </Button>
            </Link>
            <Link to="/app/share">
              <Button variant="secondary" className="w-full justify-start">
                <ShareIcon className="h-5 w-5" /> Manage sharing
              </Button>
            </Link>
          </div>
        </Card>
      )}

      {/* Account */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
          Account
        </h2>
        <Card className="space-y-3">
          <Input label="Name" value={user?.name ?? ""} readOnly />
          <Input label="Email" value={user?.email ?? ""} readOnly />
          <Button
            variant="danger"
            className="w-full"
            onClick={() => {
              signOut();
              navigate("/login");
            }}
          >
            <LogoutIcon className="h-5 w-5" /> Sign out
          </Button>
        </Card>
      </section>

      <p className="pb-4 text-center text-xs text-slate-300">BabyTrack · made with 💜</p>
    </div>
  );
}
