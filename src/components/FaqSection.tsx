import { Fragment, useEffect, useState, type ReactNode } from "react";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useCurrentLang } from "@/i18n/useCurrentLang";
import type { Lang } from "@/i18n/config";

type Faq = { q: string; a: string };

const linkStyle = {
  color: "#0D1F3C",
  textDecoration: "underline",
  textUnderlineOffset: 3,
  fontWeight: 500,
} as const;

const LINK_RE =
  /(\[[^\]]+\]\([^)]+\))|(mailto:[^\s)]+)|(https?:\/\/[^\s)]+)|((?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s)]*)?)|(\/[a-zA-Z0-9/_#-]+)/g;

function renderHref(target: string, label: string, key: number, lang: Lang): ReactNode {
  if (target.startsWith("/")) {
    const [path, hash] = target.split("#");
    const prefixed = `/${lang}${path}`;
    return (
      <Link key={key} to={prefixed as string} hash={hash} style={linkStyle}>
        {label}
      </Link>
    );
  }
  if (target.startsWith("mailto:") || target.startsWith("tel:")) {
    return <a key={key} href={target} style={linkStyle}>{label}</a>;
  }
  const href = /^https?:\/\//.test(target) ? target : `https://${target}`;
  return (
    <a key={key} href={href} target="_blank" rel="noopener noreferrer" style={linkStyle}>
      {label}
    </a>
  );
}

function renderToken(token: string, key: number, lang: Lang): ReactNode {
  const md = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token);
  if (md) return renderHref(md[2], md[1], key, lang);
  if (token.startsWith("mailto:")) {
    return <a key={key} href={token} style={linkStyle}>{token.slice(7)}</a>;
  }
  if (/^https?:\/\//.test(token)) {
    return (
      <a key={key} href={token} target="_blank" rel="noopener noreferrer" style={linkStyle}>
        {token.replace(/^https?:\/\//, "")}
      </a>
    );
  }
  if (token.startsWith("/")) return renderHref(token, token, key, lang);
  return (
    <a key={key} href={`https://${token}`} target="_blank" rel="noopener noreferrer" style={linkStyle}>
      {token}
    </a>
  );
}

function renderLine(line: string, lang: Lang): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let i = 0;
  for (const m of line.matchAll(LINK_RE)) {
    const start = m.index ?? 0;
    if (start > last) out.push(<Fragment key={`t-${i++}`}>{line.slice(last, start)}</Fragment>);
    out.push(renderToken(m[0], i++, lang));
    last = start + m[0].length;
  }
  if (last < line.length) out.push(<Fragment key={`t-${i++}`}>{line.slice(last)}</Fragment>);
  return out;
}

function FaqColumn({
  faqs,
  value,
  onChange,
  side,
  lang,
}: {
  faqs: Faq[];
  value: string[];
  onChange: (v: string[]) => void;
  side: "l" | "r";
  lang: Lang;
}) {
  return (
    <div
      style={{
        background: "#FFFFFF",
        border: "1px solid rgba(13,31,60,0.1)",
        borderRadius: 12,
        padding: "16px 20px",
      }}
    >
      <Accordion type="multiple" className="w-full" value={value} onValueChange={onChange}>
        {faqs.map((faq, i) => (
          <AccordionItem key={`faq-${side}-${i}`} value={`faq-${side}-${i}`} id={`faq-${side}-${i}`} className="border-b border-[rgba(13,31,60,0.1)]">
            <AccordionTrigger
              className="text-left"
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 500,
                fontSize: 15,
                color: "#0D1F3C",
                lineHeight: 1.4,
                padding: "16px 0",
              }}
            >
              {faq.q}
            </AccordionTrigger>
            <AccordionContent
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 400,
                fontSize: 14,
                color: "#5A7090",
                lineHeight: 1.7,
              }}
            >
              {faq.a.split("\n").map((line, idx, arr) =>
                line.startsWith("•") ? (
                  <div key={idx} style={{ display: "flex", gap: 8, marginTop: 4 }}>
                    <span style={{ color: "#2ECC8A", fontWeight: 600 }}>•</span>
                    <span>{line.slice(1).trim()}</span>
                  </div>
                ) : (
                  <span key={idx}>{renderLine(line, lang)}{idx < arr.length - 1 ? <br /> : null}</span>
                ),
              )}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}

export function FaqSection() {
  const lang = useCurrentLang();
  const { t } = useTranslation(["faq", "common"]);
  const [openLeft, setOpenLeft] = useState<string[]>([]);
  const [openRight, setOpenRight] = useState<string[]>([]);

  const leftRaw = t("faq:left", { returnObjects: true });
  const rightRaw = t("faq:right", { returnObjects: true });
  const leftFAQs: Faq[] = Array.isArray(leftRaw) ? (leftRaw as Faq[]) : [];
  const rightFAQs: Faq[] = Array.isArray(rightRaw) ? (rightRaw as Faq[]) : [];


  useEffect(() => {
    if (leftFAQs.length === 0 && rightFAQs.length === 0) return;
    const applyHash = () => {
      const h = window.location.hash.replace("#", "");
      if (h.startsWith("faq-l-")) setOpenLeft((prev) => (prev.includes(h) ? prev : [...prev, h]));
      else if (h.startsWith("faq-r-")) setOpenRight((prev) => (prev.includes(h) ? prev : [...prev, h]));
      if (h.startsWith("faq-")) {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            document.getElementById(h)?.scrollIntoView({ block: "center" });
          });
        });
      }
    };
    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, [leftFAQs.length, rightFAQs.length]);

  const syncHash = (val: string[]) => {
    const last = val[val.length - 1];
    if (last) {
      history.replaceState(null, "", `#${last}`);
    } else {
      history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  };

  return (
    <section id="faq" style={{ background: "#FFFFFF", padding: "80px 6vw" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <p
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 600,
              fontSize: 12,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "#2ECC8A",
              marginBottom: 12,
            }}
          >
            {t("faq:section.eyebrow")}
          </p>
          <h2
            style={{
              fontFamily: "'Syne', sans-serif",
              fontWeight: 700,
              fontSize: "clamp(26px, 3.5vw, 36px)",
              color: "#0D1F3C",
              lineHeight: 1.15,
              marginBottom: 12,
            }}
          >
            {t("faq:section.title")}
          </h2>
          <p
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 400,
              fontSize: 15,
              color: "#5A7090",
              maxWidth: 480,
              margin: "0 auto",
              lineHeight: 1.6,
            }}
          >
            {t("faq:section.support_prefix")}{" "}
            <Link to="/$lang/contact" params={{ lang }} hash="wa-form" style={{ color: "#0D1F3C", textDecoration: "underline", textUnderlineOffset: 3 }}>
              {t("faq:section.support_whatsapp")}
            </Link>{" "}
            {t("faq:section.support_or_mail")}{" "}
            <a href="mailto:support@velopass.com" style={{ color: "#0D1F3C", textDecoration: "underline", textUnderlineOffset: 3 }}>
              support@velopass.com
            </a>
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
            gap: 24,
          }}
        >
          <FaqColumn faqs={leftFAQs} value={openLeft} onChange={(v) => { setOpenLeft(v); syncHash(v); }} side="l" lang={lang} />
          <FaqColumn faqs={rightFAQs} value={openRight} onChange={(v) => { setOpenRight(v); syncHash(v); }} side="r" lang={lang} />
        </div>
      </div>
    </section>
  );
}
