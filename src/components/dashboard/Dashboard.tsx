import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link, useNavigate } from "@tanstack/react-router";
import { format } from "date-fns";
import { getDashboardData, type DashboardData } from "@/lib/dashboard.functions";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth-context";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell,
  PieChart, Pie, Tooltip,
} from "recharts";
import { cn } from "@/lib/utils";

type MetricTone = "sage" | "sky" | "clay" | "mauve" | "indigo" | "amber";
const TONE_BG: Record<MetricTone, string> = {
  sage: "bg-[var(--metric-sage-bg)]",
  sky: "bg-[var(--metric-sky-bg)]",
  clay: "bg-[var(--metric-clay-bg)]",
  mauve: "bg-[var(--metric-mauve-bg)]",
  indigo: "bg-[var(--metric-indigo-bg)]",
  amber: "bg-[var(--metric-amber-bg)]",
};
const TONE_FG: Record<MetricTone, string> = {
  sage: "text-[var(--metric-sage)]",
  sky: "text-[var(--metric-sky)]",
  clay: "text-[var(--metric-clay)]",
  mauve: "text-[var(--metric-mauve)]",
  indigo: "text-[var(--metric-indigo)]",
  amber: "text-[var(--metric-amber)]",
};
const PIE_COLORS = [
  "var(--metric-sage)",
  "var(--metric-sky)",
  "var(--metric-mauve)",
  "var(--metric-amber)",
  "var(--metric-indigo)",
  "var(--metric-clay)",
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
      {role === "recruiter" && <WeeklyStats data={data} loading={isLoading} />}
      {role === "recruiter" && <SeniorityRow data={data} loading={isLoading} />}
      <PipelineFunnel data={data} loading={isLoading} />
      {role === "recruiter" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <RejectionBreakdown data={data} loading={isLoading} />
          <TopFirms data={data} loading={isLoading} />
        </div>
      )}
      <StatCardsRow data={data} loading={isLoading} role={role} />
      {role === "recruiter" && <RecentActivity data={data} loading={isLoading} />}
    </div>
  );
}

function SeniorityRow({ data, loading }: { data?: DashboardData; loading: boolean }) {
  const navigate = useNavigate();
  const s = data?.seniority;
  type Tile = { label: string; value: number | undefined; tone: MetricTone; seniority?: "vp" | "seniorAssociate" | "other"; sub: string };
  const tiles: Tile[] = [
    { label: "Master list total", value: s?.total, tone: "mauve", sub: "All candidates except Placed" },
    { label: "VP / SVP / EVP", value: s?.vp, tone: "indigo", seniority: "vp", sub: "Vice president level" },
    { label: "Senior Associates", value: s?.seniorAssociate, tone: "sage", seniority: "seniorAssociate", sub: "Associate level" },
    { label: "Other", value: s?.other, tone: "clay", seniority: "other", sub: "Too senior, junior, or unmapped" },
  ];
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground mb-2">Sourced seniority</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {tiles.map((t) => (
          <button
            key={t.label}
            onClick={() => navigate({
              to: "/candidates",
              search: t.seniority ? { seniority: t.seniority } : {},
            })}
            className={cn("p-5 border-0 shadow-[var(--shadow-soft)] rounded-lg text-left hover:shadow-[var(--shadow-card)] transition-shadow", TONE_BG[t.tone])}
          >
            <p className="text-[11px] uppercase tracking-[0.14em] text-foreground/60">{t.label}</p>
            <p className={cn("mt-2 text-3xl font-semibold tabular-nums tracking-tight", TONE_FG[t.tone])}>
              {loading ? "…" : String(t.value ?? 0)}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">{t.sub}</p>
          </button>
        ))}
      </div>
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
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-6 sm:gap-10">
        <SummaryStat label="Search initiated" value={loading ? "…" : initiated} />
        <SummaryStat label="Days active" value={loading ? "…" : String(data?.daysActive ?? 0)} />
        <SummaryStat label="Master list" value={loading ? "…" : String(data?.masterTotal ?? 0)} />
        <SummaryStat label="Active pipeline" value={loading ? "…" : String(data?.candidatesInPipeline ?? 0)} />
        <SummaryStat label="Shortlisted" value={loading ? "…" : String(data?.shortlistedCount ?? 0)} />
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

function WeeklyStats({ data, loading }: { data?: DashboardData; loading: boolean }) {
  const w = data?.weekly;
  const tiles: { label: string; value: string; tone: MetricTone; sub?: string }[] = [
    { label: "Added today",      value: loading ? "…" : String(w?.addedToday ?? 0),     tone: "sage" },
    { label: "Added this week",  value: loading ? "…" : String(w?.addedThisWeek ?? 0),  tone: "sky" },
    { label: "Added this month", value: loading ? "…" : String(w?.addedThisMonth ?? 0), tone: "indigo" },
    { label: "% Accepted",       value: loading ? "…" : (w?.acceptedPct == null ? "—" : `${w.acceptedPct}%`), tone: "mauve", sub: "Reached out or further" },
  ];
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {tiles.map((t) => (
        <Card key={t.label} className={cn("p-5 border-0 shadow-[var(--shadow-soft)]", TONE_BG[t.tone])}>
          <p className="text-[11px] uppercase tracking-[0.14em] text-foreground/60">{t.label}</p>
          <p className={cn("mt-2 text-3xl font-semibold tabular-nums tracking-tight", TONE_FG[t.tone])}>{t.value}</p>
        </Card>
      ))}
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
      <div className="space-y-1.5">
        {funnel.map((f) => {
          const pct = (f.count / max) * 100;
          return (
            <Link
              key={f.stage}
              to="/candidates"
              search={{ stage: f.stage }}
              className="grid grid-cols-[200px_1fr_44px] sm:grid-cols-[260px_1fr_56px] items-center gap-3 rounded-sm hover:bg-muted/40 px-1 -mx-1 py-0.5 transition-colors"
            >
              <span className="text-xs sm:text-sm text-muted-foreground truncate">{f.stage}</span>
              <div className="h-6 bg-secondary/60 rounded-sm overflow-hidden">
                <div className="h-full bg-accent transition-all" style={{ width: `${Math.max(pct, f.count > 0 ? 4 : 0)}%` }} />
              </div>
              <span className="text-sm font-semibold text-primary tabular-nums text-right">{f.count}</span>
            </Link>
          );
        })}
      </div>
    </Card>
  );
}

function RejectionBreakdown({ data, loading }: { data?: DashboardData; loading: boolean }) {
  const [view, setView] = useState<"who" | "reason">("who");
  const [range, setRange] = useState<"week" | "all">("all");
  const navigate = useNavigate();
  const series = view === "who"
    ? (range === "week" ? data?.rejectionByWho.week : data?.rejectionByWho.all) ?? []
    : (range === "week" ? data?.rejectionByReason.week : data?.rejectionByReason.all) ?? [];
  const total = series.reduce((s, r) => s + r.count, 0);
  return (
    <Card className="p-6 shadow-[var(--shadow-soft)]">
      <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
        <div>
          <h3 className="text-sm font-semibold text-primary">Rejection breakdown</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Click a row to filter candidates</p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={view} onValueChange={(v) => setView(v as never)}>
            <TabsList className="h-7"><TabsTrigger value="who" className="h-6 text-xs">By who</TabsTrigger><TabsTrigger value="reason" className="h-6 text-xs">By reason</TabsTrigger></TabsList>
          </Tabs>
          <Tabs value={range} onValueChange={(v) => setRange(v as never)}>
            <TabsList className="h-7"><TabsTrigger value="week" className="h-6 text-xs">Week</TabsTrigger><TabsTrigger value="all" className="h-6 text-xs">All time</TabsTrigger></TabsList>
          </Tabs>
        </div>
      </div>
      {loading ? (
        <Skeleton className="h-40 w-full" />
      ) : total === 0 ? (
        <p className="text-xs text-muted-foreground py-8 text-center">No rejections in this range.</p>
      ) : (
        <div className="space-y-1.5">
          {series.map((r, i) => {
            const pct = (r.count / total) * 100;
            const onClick = () => {
              if (view === "who") navigate({ to: "/candidates", search: { stage: r.name } });
              else navigate({ to: "/candidates", search: { screenOutReason: r.name } });
            };
            return (
              <button
                key={r.name}
                onClick={onClick}
                className="w-full grid grid-cols-[160px_1fr_36px] items-center gap-3 rounded-sm hover:bg-muted/40 px-1 -mx-1 py-1 text-left"
              >
                <span className="text-xs text-muted-foreground truncate">{r.name}</span>
                <div className="h-5 bg-secondary/60 rounded-sm overflow-hidden">
                  <div className="h-full transition-all" style={{ width: `${Math.max(pct, 3)}%`, background: PIE_COLORS[i % PIE_COLORS.length] }} />
                </div>
                <span className="text-xs font-semibold text-primary tabular-nums text-right">{r.count}</span>
              </button>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function TopFirms({ data, loading }: { data?: DashboardData; loading: boolean }) {
  const navigate = useNavigate();
  const firms = data?.topFirms ?? [];
  const max = Math.max(...firms.map((f) => f.count), 1);
  return (
    <Card className="p-6 shadow-[var(--shadow-soft)]">
      <h3 className="text-sm font-semibold text-primary">Top firms reached out to</h3>
      <p className="text-xs text-muted-foreground mt-0.5 mb-4">Candidates engaged at Reached Out or later</p>
      {loading ? (
        <Skeleton className="h-40 w-full" />
      ) : firms.length === 0 ? (
        <p className="text-xs text-muted-foreground py-8 text-center">No outreach yet.</p>
      ) : (
        <div className="space-y-1.5">
          {firms.map((f) => {
            const pct = (f.count / max) * 100;
            return (
              <button
                key={f.firm}
                onClick={() => navigate({ to: "/candidates", search: { search: f.firm } })}
                className="w-full grid grid-cols-[180px_1fr_36px] items-center gap-3 rounded-sm hover:bg-muted/40 px-1 -mx-1 py-1 text-left"
              >
                <span className="text-xs text-foreground truncate">{f.firm}</span>
                <div className="h-5 bg-secondary/60 rounded-sm overflow-hidden">
                  <div className="h-full bg-[var(--metric-indigo)] transition-all" style={{ width: `${Math.max(pct, 3)}%` }} />
                </div>
                <span className="text-xs font-semibold text-primary tabular-nums text-right">{f.count}</span>
              </button>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function StatCardsRow({
  data, loading, role,
}: { data?: DashboardData; loading: boolean; role: "recruiter" | "client" | null }) {
  const navigate = useNavigate();
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
      <Card className="p-6 shadow-[var(--shadow-soft)]">
        <h3 className="text-sm font-semibold text-primary mb-1">Geography coverage</h3>
        <p className="text-xs text-muted-foreground mb-4">Candidates by region · click to filter</p>
        <div className="h-44">
          {loading ? <Skeleton className="h-full w-full" /> : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.geography ?? []} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <XAxis dataKey="bucket" tick={{ fontSize: 10, fill: "currentColor" }} stroke="var(--border)" interval={0} />
                <YAxis tick={{ fontSize: 10, fill: "currentColor" }} stroke="var(--border)" allowDecimals={false} />
                <Bar
                  dataKey="count"
                  radius={[4, 4, 0, 0]}
                  cursor="pointer"
                  onClick={(d: { bucket?: string }) => {
                    if (d?.bucket) navigate({ to: "/candidates", search: { location: d.bucket } });
                  }}
                >
                  {(data?.geography ?? []).map((_, i) => (
                    <Cell key={i} fill={["#1570EF", "#B54708", "#067647", "#7A5AF8", "#E31B54"][i % 5]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      <Card className="p-6 shadow-[var(--shadow-soft)]">
        <h3 className="text-sm font-semibold text-primary mb-1">IR function mix</h3>
        <p className="text-xs text-muted-foreground mb-4">Candidate skill distribution · click to filter</p>
        <div className="h-44 flex items-center">
          {loading ? <Skeleton className="h-full w-full" /> : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data?.irFunctions ?? []}
                  dataKey="count" nameKey="name"
                  innerRadius={36} outerRadius={64} paddingAngle={2} stroke="none"
                  cursor="pointer"
                  onClick={(d: { name?: string }) => {
                    if (d?.name) navigate({ to: "/candidates", search: { irFunction: d.name } });
                  }}
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
              <span className="text-4xl font-semibold text-[var(--metric-indigo)] tabular-nums">{data.peCoverage.sourced ?? 0}</span>
              <span className="text-sm text-muted-foreground">/ {data.peCoverage.total ?? 0} firms</span>
            </div>
            <div className="mt-5 h-2 rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full rounded-full bg-[var(--metric-indigo)] transition-all"
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
