import { createFileRoute } from "@tanstack/react-router";
import { StakeholderPlaceholder } from "@/components/StakeholderPlaceholder";
import { buildLocalizedHead } from "@/i18n/seo";
import { isLang, DEFAULT_LANG, type Lang } from "@/i18n/config";

const LEASING_META: Record<Lang, { title: string; description: string }> = {
  nl: {
    title: "Velopass voor leasemaatschappijen — Binnenkort",
    description:
      "Realtime inzicht in fietsdata, contracten en restbudget — voor leasemaatschappijen.",
  },
  en: {
    title: "Velopass for leasing companies — Coming soon",
    description:
      "Real-time insight into bike data, contracts and remaining budget — for leasing companies.",
  },
  fr: {
    title: "Velopass pour les sociétés de leasing — Bientôt disponible",
    description:
      "Vue en temps réel sur les données vélo, les contrats et le budget restant — pour les sociétés de leasing.",
  },
  de: {
    title: "Velopass für Leasinggesellschaften — Demnächst",
    description:
      "Echtzeit-Einblick in Fahrraddaten, Verträge und Restbudget — für Leasinggesellschaften.",
  },
  es: {
    title: "Velopass para empresas de renting — Muy pronto",
    description:
      "Visión en tiempo real de los datos de la bici, los contratos y el presupuesto restante — para empresas de renting.",
  },
};

export const Route = createFileRoute("/$lang/leasing")({
  head: ({ params }) => {
    const lang: Lang = isLang(params.lang) ? params.lang : DEFAULT_LANG;
    const m = LEASING_META[lang];
    return buildLocalizedHead({
      lang,
      path: "leasing",
      title: m.title,
      description: m.description,
      noindex: true,
    });
  },
  component: () => (
    <StakeholderPlaceholder
      eyebrow="Voor leasemaatschappijen"
      title="Eén platform. Volledige controle."
      intro="Realtime inzicht in fietsdata, contractinfo en resterend leasebudget — direct verbonden met het dealernetwerk."
    />
  ),
});
