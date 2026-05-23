import { createFileRoute } from "@tanstack/react-router";
import { StakeholderPlaceholder } from "@/components/StakeholderPlaceholder";

export const Route = createFileRoute("/assistance")({
  head: () => ({
    meta: [
      { title: "Velopass voor pechhulpverleners — Binnenkort" },
      { name: "description", content: "Eén scan, volledig beeld van de fiets. Snellere interventies voor pechhulpverleners." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: () => (
    <StakeholderPlaceholder
      eyebrow="Voor pechhulpverleners"
      title="Eén scan. Volledig beeld."
      intro="Bij interventie meteen toegang tot fiets, eigenaar en actieve services — overal in Europa."
    />
  ),
});
