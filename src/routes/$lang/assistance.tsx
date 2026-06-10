import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { StakeholderPlaceholder } from "@/components/StakeholderPlaceholder";
import { buildLocalizedHead } from "@/i18n/seo";
import i18n from "@/i18n/config";

export const Route = createFileRoute("/$lang/assistance")({
  head: ({ params }) => {
    const t = i18n.getFixedT(typeof params.lang === "string" ? params.lang : "en", "stakeholders");
    return buildLocalizedHead({
      lang: params.lang,
      path: "assistance",
      title: t("assistance.meta_title"),
      description: t("assistance.meta_description"),
      noindex: true,
    });
  },
  component: AssistancePage,
});

function AssistancePage() {
  const { t } = useTranslation("stakeholders");
  return (
    <StakeholderPlaceholder
      eyebrow={t("assistance.eyebrow")}
      title={t("assistance.title")}
      intro={t("assistance.intro")}
    />
  );
}
