import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listCandidates } from "@/lib/candidates.functions";
import { useAuth } from "@/lib/auth-context";
import { CandidatesTable } from "@/components/candidates/CandidatesTable";
import { CandidateFilters, defaultFilters, type Filters } from "@/components/candidates/CandidateFilters";
import { AddCandidateDialog } from "@/components/candidates/AddCandidateDialog";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/candidates")({
  component: CandidatesPage,
});

function CandidatesPage() {
  const { role } = useAuth();
  const isRecruiter = role === "recruiter";
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const list = useServerFn(listCandidates);
  const { data, isLoading } = useQuery({
    queryKey: ["candidates", filters],
    queryFn: () => list({
      data: {
        search: filters.search || undefined,
        stage: (filters.stage || undefined) as never,
        location: (filters.location || undefined) as never,
        irFunction: (filters.irFunction || undefined) as never,
        clientVisible: filters.clientVisible,
      },
    }),
  });

  const rows = data ?? [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Candidates</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isLoading ? "Loading…" : `${rows.length} ${rows.length === 1 ? "candidate" : "candidates"}`}
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

      <CandidateFilters value={filters} onChange={setFilters} role={isRecruiter ? "recruiter" : "client"} />

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : (
        <CandidatesTable rows={rows as never} role={isRecruiter ? "recruiter" : "client"} />
      )}
    </div>
  );
}
