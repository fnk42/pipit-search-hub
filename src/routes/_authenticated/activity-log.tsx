import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/shell/ComingSoon";

export const Route = createFileRoute("/_authenticated/activity-log")({
  component: () => <ComingSoon title="Activity Log" description="Full audit log arrives in the next phase." />,
});
