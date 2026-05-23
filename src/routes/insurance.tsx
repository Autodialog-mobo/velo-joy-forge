import { createFileRoute } from "@tanstack/react-router";
import { StakeholderPlaceholder } from "@/components/StakeholderPlaceholder";

export const Route = createFileRoute("/insurance")({
  head: () => ({
    meta: [
      { title: "Velopass voor verzekeraars — Binnenkort" },
      { name: "description", content: "Geverifieerde fietsdata, automatische activatie en lagere fraude — voor verzekeraars." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: () => (
    <StakeholderPlaceholder
      eyebrow="Voor verzekeraars"
      title="Geverifieerde fietsdata. Minder fraude."
      intro="Activeer polissen automatisch bij verkoop. Verifieer eigendom via het internationale Velopass-register."
    />
  ),
});
