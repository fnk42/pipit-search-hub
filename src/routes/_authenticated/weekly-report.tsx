import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/shell/ComingSoon";

export const Route = createFileRoute("/_authenticated/weekly-report")({
  component: () => <ComingSoon title="Weekly Report" description="Curated weekly client report arrives in the next phase." />,
});
