import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { StakeholderPlaceholder } from "@/components/StakeholderPlaceholder";
import { buildLocalizedHead } from "@/i18n/seo";
import i18n from "@/i18n/config";

export const Route = createFileRoute("/$lang/manufacturer")({
  head: ({ params }) => {
    const t = i18n.getFixedT(typeof params.lang === "string" ? params.lang : "en", "stakeholders");
    return buildLocalizedHead({
      lang: params.lang,
      path: "manufacturer",
      title: t("manufacturer.meta_title"),
      description: t("manufacturer.meta_description"),
      noindex: true,
    });
  },
  component: ManufacturerPage,
});

function ManufacturerPage() {
  const { t } = useTranslation("stakeholders");
  return (
    <StakeholderPlaceholder
      eyebrow={t("manufacturer.eyebrow")}
      title={t("manufacturer.title")}
      intro={t("manufacturer.intro")}
    />
  );
}
