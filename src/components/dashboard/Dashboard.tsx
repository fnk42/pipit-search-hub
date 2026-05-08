import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link, useNavigate } from "@tanstack/react-router";
import { format } from "date-fns";
import { getDashboardData, type DashboardData } from "@/lib/dashboard.functions";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth-context";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell,
  PieChart, Pie, Tooltip,
} from "recharts";

const NAVY = "oklch(0.218 0.034 254)";
const GOLD = "oklch(0.78 0.155 70)";
const MUTED = "oklch(0.91 0.01 250)";

const PIE_COLORS = [
  "oklch(0.218 0.034 254)",
  "oklch(0.78 0.155 70)",
  "oklch(0.45 0.05 254)",
  "oklch(0.65 0.10 254)",
  "oklch(0.85 0.08 90)",
];

export function Dashboard() {
  const { role } = useAuth();
  const fn = useServerFn(getDashboardData);
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => fn(),
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-2">
          Engagement overview
        </p>
        <h1 className="text-2xl sm:text-3xl font-semibold text-primary tracking-tight">
          {role === "client" ? "Search progress" : "Dashboard"}
        </h1>
      </div>

      <EngagementSummary data={data} loading={isLoading} />
      <PipelineFunnel data={data} loading={isLoading} />
      <StatCardsRow data={data} loading={isLoading} role={role} />
      {role === "recruiter" && <RecentActivity data={data} loading={isLoading} />}
    </div>
  );
}

function EngagementSummary({ data, loading }: { data?: DashboardData; loading: boolean }) {
  const initiated = data?.searchInitiated ? format(new Date(data.searchInitiated), "MMMM d, yyyy") : "—";
  return (
    <Card className="bg-primary text-primary-foreground border-0 shadow-[var(--shadow-card)] p-6 sm:p-8">
      <p className="text-[11px] uppercase tracking-[0.2em] text-primary-foreground/60 mb-5">
        Engagement summary
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-10">
        <SummaryStat label="Search initiated" value={loading ? "…" : initiated} />
        <SummaryStat label="Days active" value={loading ? "…" : String(data?.daysActive ?? 0)} />
        <SummaryStat
          label="Candidates in pipeline"
          value={loading ? "…" : String(data?.candidatesInPipeline ?? 0)}
        />
        <SummaryStat
          label="Shortlisted"
          value={loading ? "…" : String(data?.shortlistedCount ?? 0)}
        />
      </div>
    </Card>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-l border-primary-foreground/15 pl-5 first:border-l-0 first:pl-0 sm:border-l sm:pl-5 sm:first:pl-5">
      <p className="text-[11px] uppercase tracking-[0.16em] text-primary-foreground/60">{label}</p>
      <p className="mt-2 text-3xl sm:text-[2rem] font-semibold tracking-tight">{value}</p>
    </div>
  );
}

function PipelineFunnel({ data, loading }: { data?: DashboardData; loading: boolean }) {
  if (loading) {
    return (
      <Card className="p-6">
        <Skeleton className="h-5 w-40 mb-4" />
        <Skeleton className="h-32 w-full" />
      </Card>
    );
  }
  const funnel = data?.funnel ?? [];
  const total = funnel.reduce((s, f) => s + f.count, 0);
  if (total === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-sm font-medium text-foreground">No candidates yet</p>
        <p className="mt-1 text-xs text-muted-foreground">Add your first candidate to begin tracking the funnel.</p>
      </Card>
    );
  }
  const max = Math.max(...funnel.map((f) => f.count), 1);

  return (
    <Card className="p-6 shadow-[var(--shadow-soft)]">
      <div className="flex items-baseline justify-between mb-5">
        <h2 className="text-base font-semibold text-primary">Pipeline funnel</h2>
        <span className="text-xs text-muted-foreground">Sourced → Placed</span>
      </div>
      <div className="space-y-2">
        {funnel.map((f) => {
          const pct = (f.count / max) * 100;
          return (
            <Link
              key={f.stage}
              to="/candidates"
              search={{ stage: f.stage }}
              className="grid grid-cols-[140px_1fr_36px] sm:grid-cols-[180px_1fr_48px] items-center gap-3 rounded-sm hover:bg-muted/40 px-1 -mx-1 py-0.5 transition-colors"
            >
              <span className="text-xs sm:text-sm text-muted-foreground truncate">{f.stage}</span>
              <div className="h-7 bg-secondary/60 rounded-sm overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${Math.max(pct, f.count > 0 ? 4 : 0)}%` }}
                />
              </div>
              <span className="text-sm font-semibold text-primary tabular-nums text-right">{f.count}</span>
            </Link>
          );
        })}
      </div>
    </Card>
  );
}

function StatCardsRow({
  data, loading, role,
}: { data?: DashboardData; loading: boolean; role: "recruiter" | "client" | null }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
      <Card className="p-6 shadow-[var(--shadow-soft)]">
        <h3 className="text-sm font-semibold text-primary mb-1">Geography coverage</h3>
        <p className="text-xs text-muted-foreground mb-4">Candidates by region</p>
        <div className="h-44">
          {loading ? <Skeleton className="h-full w-full" /> : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.geography ?? []} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <XAxis dataKey="bucket" tick={{ fontSize: 10, fill: "currentColor" }} stroke={MUTED} interval={0} />
                <YAxis tick={{ fontSize: 10, fill: "currentColor" }} stroke={MUTED} allowDecimals={false} />
                <Bar dataKey="count" fill={NAVY} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      <Card className="p-6 shadow-[var(--shadow-soft)]">
        <h3 className="text-sm font-semibold text-primary mb-1">IR function mix</h3>
        <p className="text-xs text-muted-foreground mb-4">Candidate skill distribution</p>
        <div className="h-44 flex items-center">
          {loading ? <Skeleton className="h-full w-full" /> : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data?.irFunctions ?? []}
                  dataKey="count"
                  nameKey="name"
                  innerRadius={36}
                  outerRadius={64}
                  paddingAngle={2}
                  stroke="none"
                >
                  {(data?.irFunctions ?? []).map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      <Card className="p-6 shadow-[var(--shadow-soft)]">
        <h3 className="text-sm font-semibold text-primary mb-1">PE firm coverage</h3>
        <p className="text-xs text-muted-foreground mb-4">
          {role === "client" ? "Universe progress" : "Verified universe"}
        </p>
        {loading ? (
          <Skeleton className="h-24 w-full" />
        ) : role === "recruiter" && data?.peCoverage ? (
          <>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-semibold text-primary tabular-nums">{data.peCoverage.sourced ?? 0}</span>
              <span className="text-sm text-muted-foreground">/ {data.peCoverage.total ?? 0} firms</span>
            </div>
            <div className="mt-5 h-2 rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full rounded-full bg-accent transition-all"
                style={{ width: `${Math.min(100, ((data.peCoverage.sourced ?? 0) / Math.max(1, data.peCoverage.total ?? 1)) * 100)}%` }}
              />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              {Math.round(((data.peCoverage.sourced ?? 0) / Math.max(1, data.peCoverage.total ?? 1)) * 100)}% of target firms engaged
            </p>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">Coverage details available to your engagement team.</p>
        )}
      </Card>
    </div>
  );
}

function RecentActivity({ data, loading }: { data?: DashboardData; loading: boolean }) {
  return (
    <Card className="p-6 shadow-[var(--shadow-soft)]">
      <h2 className="text-base font-semibold text-primary mb-4">Recent activity</h2>
      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      ) : !data?.activity?.length ? (
        <p className="text-sm text-muted-foreground py-6 text-center">
          Activity will appear here as your team works the pipeline.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {data.activity.map((row) => (
            <li key={row.id} className="py-3 flex items-start gap-4">
              <span className="text-[11px] text-muted-foreground tabular-nums w-28 shrink-0 pt-0.5">
                {format(new Date(row.created_at), "MMM d · HH:mm")}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-foreground">{row.description}</p>
                {row.user_name && (
                  <p className="text-[11px] text-muted-foreground mt-0.5">{row.user_name}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
