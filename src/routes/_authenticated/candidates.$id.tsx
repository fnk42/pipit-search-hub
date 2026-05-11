import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getCandidate, updateCandidate, deleteCandidate } from "@/lib/candidates.functions";
import { CandidateForm } from "@/components/candidates/CandidateForm";
import { ActivityTimeline } from "@/components/candidates/ActivityTimeline";
import { StageBadge } from "@/components/candidates/StageBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ArrowLeft, ExternalLink, Trash2 } from "lucide-react";
import { PIPELINE_STAGES } from "@/lib/csv-schemas";
import { toast } from "sonner";
import { format, differenceInDays } from "date-fns";

export const Route = createFileRoute("/_authenticated/candidates/$id")({
  component: CandidateDetailPage,
});

function CandidateDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const get = useServerFn(getCandidate);
  const update = useServerFn(updateCandidate);
  const del = useServerFn(deleteCandidate);

  const { data, isLoading } = useQuery({
    queryKey: ["candidate", id],
    queryFn: () => get({ data: { id } }),
  });

  const updateMut = useMutation({
    mutationFn: (patch: Record<string, unknown>) => update({ data: { id, patch: patch as never } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["candidate", id] });
      qc.invalidateQueries({ queryKey: ["candidates"] });
    },
  });

  const deleteMut = useMutation({
    mutationFn: () => del({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["candidates"] });
      toast.success("Candidate deleted");
      navigate({ to: "/candidates" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!data?.candidate) {
    return (
      <div className="text-center py-10">
        <p className="text-muted-foreground">Candidate not found.</p>
        <Button asChild variant="link"><Link to="/candidates">Back to candidates</Link></Button>
      </div>
    );
  }

  const c = data.candidate;
  const isRecruiter = data.role === "recruiter";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm"><Link to="/candidates"><ArrowLeft className="h-4 w-4 mr-1" /> Candidates</Link></Button>
        {isRecruiter && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4 mr-1" /> Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this candidate?</AlertDialogTitle>
                <AlertDialogDescription>This permanently removes {c.name} and their notes.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => deleteMut.mutate()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-2xl">{c.name}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {c.current_title}{c.current_firm ? ` · ${c.current_firm}` : ""}
                  </p>
                </div>
                {c.linkedin_url && (
                  <a href={c.linkedin_url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary">
                    <ExternalLink className="h-5 w-5" />
                  </a>
                )}
              </div>
            </CardHeader>
            {isRecruiter && (
              <CardContent className="pt-0">
                <div className="flex items-center gap-3 rounded-md border border-border bg-secondary p-3">
                  <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Stage</span>
                  <Select
                    value={c.pipeline_stage}
                    onValueChange={(v) => {
                      updateMut.mutate({ pipeline_stage: v }, {
                        onSuccess: () => toast.success(`Stage moved to ${v}`),
                        onError: (e) => toast.error((e as Error).message),
                      });
                    }}
                  >
                    <SelectTrigger className="h-9 w-[200px] bg-card"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PIPELINE_STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            )}
          </Card>

          {isRecruiter ? (
            <Tabs defaultValue="overview">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
              </TabsList>
              <TabsContent value="overview" className="mt-4">
                <Card><CardContent className="pt-6">
                  <CandidateForm
                    defaultValues={{
                      name: c.name, email: c.email ?? "", phone: c.phone ?? "",
                      current_firm: c.current_firm ?? "", current_title: c.current_title ?? "",
                      pipeline_stage: c.pipeline_stage as never,
                      location_bucket: (c.location_bucket ?? "") as never,
                      ir_functions: c.ir_functions ?? [],
                      sourced_by: ((c as { sourced_by?: string }).sourced_by ?? "GPR Team") as never,
                      owner: (((c as { owner?: string }).owner) ?? "") as never,
                      screen_out_reason: (((c as { screen_out_reason?: string }).screen_out_reason) ?? "") as never,
                      feedback_transformari: (c as { feedback_transformari?: string }).feedback_transformari ?? "",
                      linkedin_url: c.linkedin_url ?? "",
                      notes: c.notes ?? "",
                      date_sourced: c.date_sourced ?? "",
                      client_visible: c.client_visible,
                      shortlisted: c.shortlisted ?? false,
                    }}
                    submitLabel="Save changes"
                    onSubmit={async (v) => {
                      await updateMut.mutateAsync(v as never);
                      toast.success("Saved");
                    }}
                  />
                </CardContent></Card>
              </TabsContent>
              <TabsContent value="activity" className="mt-4">
                <Card><CardContent className="pt-6">
                  <ActivityTimeline items={data.activity as never} />
                </CardContent></Card>
              </TabsContent>
            </Tabs>
          ) : (
            <Card><CardContent className="pt-6 space-y-3 text-sm">
              <Row label="Location" value={c.location_bucket ?? "—"} />
              <Row label="IR functions" value={(c.ir_functions ?? []).join(", ") || "—"} />
              <Row label="Stage" value={c.pipeline_stage} />
            </CardContent></Card>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Quick facts</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Stage</span><StageBadge stage={c.pipeline_stage} />
              </div>
              <Row label="Location" value={c.location_bucket ?? "—"} />
              <div>
                <div className="text-muted-foreground text-xs mb-1.5">IR functions</div>
                <div className="flex flex-wrap gap-1">
                  {(c.ir_functions ?? []).length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                  {(c.ir_functions ?? []).map((f) => (
                    <span key={f} className="text-[11px] rounded-full bg-secondary border border-border px-2 py-0.5">{f}</span>
                  ))}
                </div>
              </div>
              {isRecruiter && (
                <Row label="Client visible" value={c.client_visible ? "Yes" : "No"} accent={c.client_visible} />
              )}
            </CardContent>
          </Card>

          {isRecruiter && (
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Engagement</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Row label="Created" value={format(new Date(c.created_at), "MMM d, yyyy")} />
                <Row label="Last update" value={format(new Date(c.updated_at), "MMM d, yyyy")} />
                <Row label="Days since update" value={`${differenceInDays(new Date(), new Date(c.updated_at))}d`} />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={accent ? "text-accent font-medium" : "text-foreground"}>{value}</span>
    </div>
  );
}
