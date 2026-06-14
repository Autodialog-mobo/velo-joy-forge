import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useCurrentLang } from "@/i18n/useCurrentLang";
import { Footer } from "@/components/Footer";
import { LangSwitcher } from "@/components/LangSwitcher";
import { buildLocalizedHead } from "@/i18n/seo";
import i18n from "@/i18n/config";

type Section = { title: string; body?: string; list?: string[] };
type Faq = { q: string; a: string };

export const Route = createFileRoute("/$lang/guides/buying-second-hand")({
  head: ({ params }) => {
    const lang = typeof params.lang === "string" ? params.lang : "en";
    const t = i18n.getFixedT(lang, "guides");
    const meta = buildLocalizedHead({
      lang: params.lang,
      path: "guides/buying-second-hand",
      title: t("buying_second_hand.meta.title"),
      description: t("buying_second_hand.meta.description"),
      ogType: "article",
    });

    // FAQPage + Article JSON-LD for rich results.
    const rawFaq = t("buying_second_hand.faq", { returnObjects: true });
    const faqList: Faq[] = Array.isArray(rawFaq) ? (rawFaq as Faq[]) : [];
    const faqLd = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqList.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    };

    return {
      ...meta,
      scripts: [
        { type: "application/ld+json", children: JSON.stringify(faqLd) },
      ],
    };
  },
  component: BuyingSecondHandGuide,
});

function BuyingSecondHandGuide() {
  const lang = useCurrentLang();
  const { t } = useTranslation("guides");
  const base = "buying_second_hand";
  const rawSections = t(`${base}.sections`, { returnObjects: true });
  const sections: Section[] = Array.isArray(rawSections) ? (rawSections as Section[]) : [];
  const rawFaq = t(`${base}.faq`, { returnObjects: true });
  const faq: Faq[] = Array.isArray(rawFaq) ? (rawFaq as Faq[]) : [];

  return (
    <>
      <button
        onClick={() => window.history.back()}
        style={{
          position: "absolute",
          top: 20,
          left: 24,
          zIndex: 50,
          background: "none",
          border: "none",
          color: "var(--navy)",
          fontSize: 14,
          fontWeight: 500,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "4px 0",
        }}
      >
        ← {t(`${base}.back`)}
      </button>
      <div style={{ position: "absolute", top: 20, right: 24, zIndex: 50 }}>
        <LangSwitcher currentLang={lang} tone="light" />
      </div>
      <div
        style={{
          maxWidth: 760,
          margin: "0 auto",
          padding: "120px 6vw 60px",
          minHeight: "100vh",
        }}
      >
        <p
          style={{
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: "1.2px",
            textTransform: "uppercase",
            color: "var(--green)",
            marginBottom: 14,
          }}
        >
          {t(`${base}.eyebrow`)}
        </p>
        <h1
          style={{
            fontFamily: "'Syne', sans-serif",
            fontWeight: 700,
            fontSize: "clamp(30px, 4vw, 46px)",
            lineHeight: 1.1,
            letterSpacing: "-1px",
            color: "var(--navy)",
            marginBottom: 20,
          }}
        >
          {t(`${base}.title`)}
        </h1>
        <p
          style={{
            fontSize: 18,
            color: "var(--text-mid)",
            lineHeight: 1.6,
            marginBottom: 32,
          }}
        >
          {t(`${base}.intro`)}
        </p>

        <aside
          style={{
            background: "color-mix(in srgb, var(--green) 8%, transparent)",
            border: "1px solid color-mix(in srgb, var(--green) 25%, transparent)",
            borderRadius: 14,
            padding: "20px 22px",
            marginBottom: 40,
          }}
        >
          <p
            style={{
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "1px",
              textTransform: "uppercase",
              color: "var(--green)",
              margin: "0 0 8px",
            }}
          >
            {t(`${base}.tldr_title`)}
          </p>
          <p style={{ margin: 0, fontSize: 15.5, lineHeight: 1.65, color: "var(--navy)" }}>
            {t(`${base}.tldr`)}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 16 }}>
            <Link
              to="/$lang/bike-check"
              params={{ lang }}
              style={{
                background: "var(--green)",
                color: "white",
                padding: "10px 18px",
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              {t(`${base}.cta_primary`)} →
            </Link>
            <Link
              to="/$lang/stolen"
              params={{ lang }}
              style={{
                background: "white",
                color: "var(--navy)",
                padding: "10px 18px",
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 600,
                textDecoration: "none",
                border: "1px solid color-mix(in srgb, var(--navy) 15%, transparent)",
              }}
            >
              {t(`${base}.cta_secondary`)}
            </Link>
          </div>
        </aside>

        {sections.map((s, i) => (
          <section key={i} style={{ marginBottom: 36 }}>
            <h2
              style={{
                fontFamily: "'Syne', sans-serif",
                fontSize: 22,
                fontWeight: 700,
                color: "var(--navy)",
                marginBottom: 12,
                letterSpacing: "-0.3px",
              }}
            >
              {s.title}
            </h2>
            {s.body && (
              <p style={{ margin: 0, fontSize: 16, lineHeight: 1.7, color: "var(--text-mid)" }}>
                {s.body}
              </p>
            )}
            {s.list && (
              <ul
                style={{
                  listStyle: "disc",
                  paddingLeft: 22,
                  marginTop: 10,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  fontSize: 16,
                  lineHeight: 1.65,
                  color: "var(--text-mid)",
                }}
              >
                {s.list.map((item, j) => (
                  <li key={j}>{item}</li>
                ))}
              </ul>
            )}
          </section>
        ))}

        {faq.length > 0 && (
          <section style={{ marginTop: 56 }}>
            <h2
              style={{
                fontFamily: "'Syne', sans-serif",
                fontSize: 26,
                fontWeight: 700,
                color: "var(--navy)",
                marginBottom: 20,
                letterSpacing: "-0.3px",
              }}
            >
              {t(`${base}.faq_title`)}
            </h2>
            {faq.map((f, i) => (
              <details
                key={i}
                style={{
                  borderTop: "1px solid color-mix(in srgb, var(--navy) 10%, transparent)",
                  padding: "16px 0",
                }}
              >
                <summary
                  style={{
                    cursor: "pointer",
                    fontSize: 16,
                    fontWeight: 600,
                    color: "var(--navy)",
                    listStyle: "none",
                  }}
                >
                  {f.q}
                </summary>
                <p
                  style={{
                    margin: "10px 0 0",
                    fontSize: 15.5,
                    lineHeight: 1.7,
                    color: "var(--text-mid)",
                  }}
                >
                  {f.a}
                </p>
              </details>
            ))}
          </section>
        )}
      </div>
      <Footer />
    </>
  );
}
