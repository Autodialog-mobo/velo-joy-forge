import { createFileRoute } from "@tanstack/react-router";
import { StakeholderPlaceholder } from "@/components/StakeholderPlaceholder";
import { buildLocalizedHead } from "@/i18n/seo";

export const Route = createFileRoute("/$lang/assistance")({
  head: ({ params }) =>
    buildLocalizedHead({
      lang: params.lang,
      path: "assistance",
      title: "Velopass voor pechhulpverleners — Binnenkort",
      description:
        "Eén scan, volledig beeld van de fiets. Snellere interventies voor pechhulpverleners.",
      noindex: true,
    }),
  component: () => (
    <StakeholderPlaceholder
      eyebrow="Voor pechhulpverleners"
      title="Eén scan. Volledig beeld."
      intro="Bij interventie meteen toegang tot fiets, eigenaar en actieve services — overal in Europa."
    />
  ),
});
