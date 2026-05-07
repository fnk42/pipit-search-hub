import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/shell/ComingSoon";

export const Route = createFileRoute("/_authenticated/settings")({
  component: () => <ComingSoon title="Settings" description="Engagement and team settings arrive in the next phase." />,
});
