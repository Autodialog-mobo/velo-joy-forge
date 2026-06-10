import { createFileRoute } from "@tanstack/react-router";
import { StakeholderPlaceholder } from "@/components/StakeholderPlaceholder";
import { buildLocalizedHead } from "@/i18n/seo";

export const Route = createFileRoute("/$lang/insurance")({
  head: ({ params }) =>
    buildLocalizedHead({
      lang: params.lang,
      path: "insurance",
      title: "Velopass voor verzekeraars — Binnenkort",
      description:
        "Geverifieerde fietsdata, automatische activatie en lagere fraude — voor verzekeraars.",
      noindex: true,
    }),
  component: () => (
    <StakeholderPlaceholder
      eyebrow="Voor verzekeraars"
      title="Geverifieerde fietsdata. Minder fraude."
      intro="Activeer polissen automatisch bij verkoop. Verifieer eigendom via het internationale Velopass-register."
    />
  ),
});
