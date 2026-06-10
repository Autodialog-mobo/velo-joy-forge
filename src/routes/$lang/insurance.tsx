import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { StakeholderPlaceholder } from "@/components/StakeholderPlaceholder";
import { buildLocalizedHead } from "@/i18n/seo";
import i18n from "@/i18n/config";

export const Route = createFileRoute("/$lang/insurance")({
  head: ({ params }) => {
    const t = i18n.getFixedT(typeof params.lang === "string" ? params.lang : "en", "stakeholders");
    return buildLocalizedHead({
      lang: params.lang,
      path: "insurance",
      title: t("insurance.meta_title"),
      description: t("insurance.meta_description"),
      noindex: true,
    });
  },
  component: InsurancePage,
});

function InsurancePage() {
  const { t } = useTranslation("stakeholders");
  return (
    <StakeholderPlaceholder
      eyebrow={t("insurance.eyebrow")}
      title={t("insurance.title")}
      intro={t("insurance.intro")}
    />
  );
}
