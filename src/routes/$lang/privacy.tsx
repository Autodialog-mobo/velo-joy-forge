import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useCurrentLang } from "@/i18n/useCurrentLang";
import { Footer } from "@/components/Footer";
import { LangSwitcher } from "@/components/LangSwitcher";
import { buildLocalizedHead } from "@/i18n/seo";
import i18n from "@/i18n/config";

type RichItem = { label: string; body: string };
type Section = {
  title: string;
  body?: string;
  intro?: string;
  list?: string[];
  list_rich?: RichItem[];
  outro?: string;
  outro_prefix?: string;
  outro_email?: string;
  outro_suffix?: string;
  intro_prefix?: string;
  intro_email?: string;
  intro_mid?: string;
  intro_link?: string;
  intro_suffix?: string;
};

export const Route = createFileRoute("/$lang/privacy")({
  head: ({ params }) => {
    const t = i18n.getFixedT(typeof params.lang === "string" ? params.lang : "en", "privacy");
    return buildLocalizedHead({
      lang: params.lang,
      path: "privacy",
      title: t("meta.title"),
      description: t("meta.description"),
    });
  },
  component: PrivacyPage,
});

function PrivacyPage() {
  const lang = useCurrentLang();
  const { t } = useTranslation("privacy");
  const rawSections = t("sections", { returnObjects: true });
  const sections: Section[] = Array.isArray(rawSections) ? (rawSections as Section[]) : [];


  return (
    <>
      <div style={{ position: "absolute", top: 20, right: 24, zIndex: 50 }}>
        <LangSwitcher currentLang={lang} tone="light" />
      </div>
      <main
        style={{
          maxWidth: 800,
          margin: "0 auto",
          padding: "120px 6vw 80px",
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
          {t("eyebrow")}
        </p>
        <h1
          style={{
            fontFamily: "'Syne', sans-serif",
            fontWeight: 700,
            fontSize: "clamp(28px, 3.5vw, 42px)",
            lineHeight: 1.1,
            letterSpacing: "-1px",
            color: "var(--navy)",
            marginBottom: 16,
          }}
        >
          {t("title")}
        </h1>
        <p
          style={{
            fontSize: 16,
            color: "var(--text-muted)",
            lineHeight: 1.65,
            marginBottom: 48,
          }}
        >
          {t("last_updated")}
        </p>

        {sections.map((section, idx) => (
          <SectionBlock key={idx} section={section} lang={lang} />
        ))}
      </main>
      <Footer />
    </>
  );
}

function SectionBlock({ section, lang }: { section: Section; lang: string }) {
  return (
    <section style={{ marginBottom: 40 }}>
      <h2
        style={{
          fontFamily: "'Syne', sans-serif",
          fontSize: 18,
          fontWeight: 700,
          color: "var(--navy)",
          marginBottom: 12,
          letterSpacing: "-0.2px",
        }}
      >
        {section.title}
      </h2>
      <div
        style={{
          fontSize: 15,
          color: "var(--text-mid)",
          lineHeight: 1.7,
        }}
      >
        {section.body && <p style={{ margin: 0 }}>{section.body}</p>}
        {section.intro && <p style={{ margin: 0 }}>{section.intro}</p>}
        {section.list && (
          <ul style={ulStyle}>
            {section.list.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        )}
        {section.list_rich && (
          <ul style={ulStyle}>
            {section.list_rich.map((item, i) => (
              <li key={i}>
                <strong>{item.label}</strong> {item.body}
              </li>
            ))}
          </ul>
        )}
        {section.outro && <p style={{ margin: "10px 0 0" }}>{section.outro}</p>}
        {section.outro_prefix && section.outro_email && (
          <p style={{ margin: "10px 0 0" }}>
            {section.outro_prefix}{" "}
            <a
              href={`mailto:${section.outro_email}`}
              style={{ color: "var(--green)", textDecoration: "underline" }}
            >
              {section.outro_email}
            </a>{" "}
            {section.outro_suffix}
          </p>
        )}
        {section.intro_prefix && section.intro_email && (
          <p style={{ margin: 0 }}>
            {section.intro_prefix}{" "}
            <a
              href={`mailto:${section.intro_email}`}
              style={{ color: "var(--green)", textDecoration: "underline" }}
            >
              {section.intro_email}
            </a>{" "}
            {section.intro_mid}{" "}
            <Link
              to="/$lang/contact"
              params={{ lang }}
              style={{ color: "var(--green)", textDecoration: "underline" }}
            >
              {section.intro_link}
            </Link>
            {section.intro_suffix}
          </p>
        )}
      </div>
    </section>
  );
}

const ulStyle: React.CSSProperties = {
  listStyle: "disc",
  paddingLeft: 20,
  marginTop: 10,
  marginBottom: 10,
  display: "flex",
  flexDirection: "column",
  gap: 6,
};
