import { createFileRoute } from "@tanstack/react-router";
import { StakeholderPlaceholder } from "@/components/StakeholderPlaceholder";

export const Route = createFileRoute("/$lang/leasing")({
  head: () => ({
    meta: [
      { title: "Velopass voor leasemaatschappijen — Binnenkort" },
      { name: "description", content: "Realtime inzicht in fietsdata, contracten en restbudget — voor leasemaatschappijen." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: () => (
    <StakeholderPlaceholder
      eyebrow="Voor leasemaatschappijen"
      title="Eén platform. Volledige controle."
      intro="Realtime inzicht in fietsdata, contractinfo en resterend leasebudget — direct verbonden met het dealernetwerk."
    />
  ),
});
