import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listCandidates, setShortlist } from "@/lib/candidates.functions";
import { useAuth } from "@/lib/auth-context";
import { CandidatesTable } from "@/components/candidates/CandidatesTable";
import { CandidateFilters, defaultFilters, type Filters } from "@/components/candidates/CandidateFilters";
import { AddCandidateDialog } from "@/components/candidates/AddCandidateDialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Star, StarOff, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/candidates")({
  component: CandidatesPage,
});

type Tab = "master" | "shortlist";

function CandidatesPage() {
  const { role } = useAuth();
  const isRecruiter = role === "recruiter";
  const [tab, setTab] = useState<Tab>("master");
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const qc = useQueryClient();

  const list = useServerFn(listCandidates);
  const shortlistFn = useServerFn(setShortlist);

  // Always fetch the master list; client only ever sees shortlist (server-side via client_visible RLS).
  const { data, isLoading } = useQuery({
    queryKey: ["candidates", filters],
    queryFn: () => list({
      data: {
        search: filters.search || undefined,
        stage: (filters.stage || undefined) as never,
        location: (filters.location || undefined) as never,
        irFunction: (filters.irFunction || undefined) as never,
        clientVisible: filters.clientVisible,
        shortlisted: "all",
      },
    }),
  });

  const allRows = (data ?? []) as Array<{ id: string; shortlisted: boolean } & Record<string, unknown>>;
  const shortlistedCount = useMemo(() => allRows.filter((c) => c.shortlisted).length, [allRows]);
  const visibleRows = useMemo(
    () => (isRecruiter && tab === "shortlist" ? allRows.filter((c) => c.shortlisted) : allRows),
    [allRows, tab, isRecruiter],
  );

  const bulkMut = useMutation({
    mutationFn: (shortlisted: boolean) =>
      shortlistFn({ data: { ids: Array.from(selected), shortlisted } }),
    onSuccess: (_res, shortlisted) => {
      qc.invalidateQueries({ queryKey: ["candidates"] });
      toast.success(`${selected.size} ${shortlisted ? "added to" : "removed from"} shortlist`);
      setSelected(new Set());
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleRow = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };
  const toggleAll = () => {
    if (selected.size === visibleRows.length) setSelected(new Set());
    else setSelected(new Set(visibleRows.map((r) => r.id)));
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Candidates</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isLoading ? "Loading…" : `${visibleRows.length} ${visibleRows.length === 1 ? "candidate" : "candidates"}`}
          </p>
        </div>
        {isRecruiter && (
          <div className="flex items-center gap-2">
            <Button asChild variant="outline">
              <Link to="/import"><Upload className="h-4 w-4 mr-1" /> Import CSV</Link>
            </Button>
            <AddCandidateDialog />
          </div>
        )}
      </div>

      {isRecruiter && (
        <Tabs value={tab} onValueChange={(v) => { setTab(v as Tab); setSelected(new Set()); }}>
          <TabsList>
            <TabsTrigger value="master">Master list ({allRows.length})</TabsTrigger>
            <TabsTrigger value="shortlist">
              <Star className="h-3.5 w-3.5 mr-1.5" />
              Shortlist ({shortlistedCount})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      <CandidateFilters value={filters} onChange={setFilters} role={isRecruiter ? "recruiter" : "client"} />

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : (
        <CandidatesTable
          rows={visibleRows as never}
          role={isRecruiter ? "recruiter" : "client"}
          selected={selected}
          onToggleRow={toggleRow}
          onToggleAll={toggleAll}
        />
      )}

      {isRecruiter && selected.size > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 shadow-[var(--shadow-card)]">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <span className="h-4 w-px bg-border mx-1" />
          <Button size="sm" variant="outline" onClick={() => bulkMut.mutate(true)} disabled={bulkMut.isPending}>
            <Star className="h-3.5 w-3.5 mr-1.5" /> Add to shortlist
          </Button>
          <Button size="sm" variant="outline" onClick={() => bulkMut.mutate(false)} disabled={bulkMut.isPending}>
            <StarOff className="h-3.5 w-3.5 mr-1.5" /> Remove
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
