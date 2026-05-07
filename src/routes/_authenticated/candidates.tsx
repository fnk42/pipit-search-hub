import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/shell/ComingSoon";

export const Route = createFileRoute("/_authenticated/candidates")({
  component: () => <ComingSoon title="Candidates" description="Full candidate table, detail views, and pipeline editing arrive in the next phase." />,
});
