import { createFileRoute } from "@tanstack/react-router";
import { StakeholderPlaceholder } from "@/components/StakeholderPlaceholder";
import { buildLocalizedHead } from "@/i18n/seo";

export const Route = createFileRoute("/$lang/leasing")({
  head: ({ params }) =>
    buildLocalizedHead({
      lang: params.lang,
      path: "leasing",
      title: "Velopass voor leasemaatschappijen — Binnenkort",
      description:
        "Realtime inzicht in fietsdata, contracten en restbudget — voor leasemaatschappijen.",
      noindex: true,
    }),
  component: () => (
    <StakeholderPlaceholder
      eyebrow="Voor leasemaatschappijen"
      title="Eén platform. Volledige controle."
      intro="Realtime inzicht in fietsdata, contractinfo en resterend leasebudget — direct verbonden met het dealernetwerk."
    />
  ),
});
