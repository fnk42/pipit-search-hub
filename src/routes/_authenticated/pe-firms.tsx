import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Skeleton } from "@/components/ui/skeleton";
import { PeFirmsTable } from "@/components/pe-firms/PeFirmsTable";
import { AddPeFirmDialog } from "@/components/pe-firms/AddPeFirmDialog";
import { listPeFirms } from "@/lib/pe-firms.functions";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_authenticated/pe-firms")({
  component: PeFirmsPage,
});

function PeFirmsPage() {
  const { role } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (role === "client") navigate({ to: "/dashboard" });
  }, [role, navigate]);

  const fn = useServerFn(listPeFirms);
  const { data, isLoading } = useQuery({
    queryKey: ["pe-firms"],
    queryFn: () => fn(),
    enabled: role === "recruiter",
  });

  if (role !== "recruiter") return null;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-primary">PE firms</h1>
          <p className="text-sm text-muted-foreground mt-1">Verified PE universe. Add manually or upload via Import.</p>
        </div>
        <AddPeFirmDialog />
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <PeFirmsTable rows={(data ?? []) as never} />
      )}
    </div>
  );
}
