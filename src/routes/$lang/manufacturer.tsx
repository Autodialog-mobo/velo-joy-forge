import { createFileRoute } from "@tanstack/react-router";
import { StakeholderPlaceholder } from "@/components/StakeholderPlaceholder";

export const Route = createFileRoute("/manufacturer")({
  head: () => ({
    meta: [
      { title: "Velopass voor fabrikanten — Binnenkort" },
      { name: "description", content: "Integreer Velopass al bij productie. Geef je dealers een vliegende start." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: () => (
    <StakeholderPlaceholder
      eyebrow="Voor fabrikanten"
      title="Velopass al bij productie geïntegreerd."
      intro="Lever fietsen af met een ingebouwde Frame-ID en vooringevulde fietsdata. Maak het leven van je dealernetwerk eenvoudiger."
    />
  ),
});
