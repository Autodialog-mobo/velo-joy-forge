import { createFileRoute } from "@tanstack/react-router";
import { StakeholderPlaceholder } from "@/components/StakeholderPlaceholder";
import { buildLocalizedHead } from "@/i18n/seo";

export const Route = createFileRoute("/$lang/manufacturer")({
  head: ({ params }) =>
    buildLocalizedHead({
      lang: params.lang,
      path: "manufacturer",
      title: "Velopass voor fabrikanten — Binnenkort",
      description:
        "Integreer Velopass al bij productie. Geef je dealers een vliegende start.",
      noindex: true,
    }),
  component: () => (
    <StakeholderPlaceholder
      eyebrow="Voor fabrikanten"
      title="Velopass al bij productie geïntegreerd."
      intro="Lever fietsen af met een ingebouwde Frame-ID en vooringevulde fietsdata. Maak het leven van je dealernetwerk eenvoudiger."
    />
  ),
});
