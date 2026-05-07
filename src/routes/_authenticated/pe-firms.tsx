import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/shell/ComingSoon";

export const Route = createFileRoute("/_authenticated/pe-firms")({
  component: () => <ComingSoon title="PE Firms" description="Firm universe management arrives in the next phase." />,
});
