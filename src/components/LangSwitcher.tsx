import { useState, useRef, useEffect } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { ChevronDown } from "lucide-react";
import { SUPPORTED_LANGS, LANG_LABELS, isLang, type Lang } from "@/i18n/config";
import { setLangCookie } from "@/lib/lang.functions";

export function LangSwitcher({ currentLang }: { currentLang: Lang }) {
  const { t } = useTranslation("common");
  const navigate = useNavigate();
  const persist = useServerFn(setLangCookie);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function swap(next: Lang) {
    setOpen(false);
    void persist({ data: { lang: next } }).catch(() => {});
    // Replace the /<lang>/ prefix in the current pathname.
    const segs = pathname.split("/").filter(Boolean);
    if (segs.length > 0 && isLang(segs[0])) segs[0] = next;
    else segs.unshift(next);
    void navigate({ to: "/" + segs.join("/"), replace: false });
  }

  const current = LANG_LABELS[currentLang];

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t("lang_switcher.current")}
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 10px",
          borderRadius: 8,
          background: "transparent",
          border: "1px solid rgba(255,255,255,0.18)",
          color: "inherit",
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 13,
          fontWeight: 500,
          cursor: "pointer",
          lineHeight: 1,
        }}
      >
        <span aria-hidden="true">{current.flag}</span>
        <span style={{ textTransform: "uppercase", letterSpacing: 0.5 }}>{currentLang}</span>
        <ChevronDown size={14} aria-hidden="true" />
      </button>
      {open && (
        <ul
          role="listbox"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            minWidth: 160,
            margin: 0,
            padding: 6,
            listStyle: "none",
            background: "#0D1F3C",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 10,
            boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
            zIndex: 50,
          }}
        >
          {SUPPORTED_LANGS.map((code) => (
            <li key={code}>
              <button
                type="button"
                role="option"
                aria-selected={code === currentLang}
                onClick={() => swap(code)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  background: code === currentLang ? "rgba(46,204,138,0.15)" : "transparent",
                  color: "#fff",
                  border: "none",
                  padding: "8px 10px",
                  borderRadius: 6,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  cursor: "pointer",
                  fontSize: 13,
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                <span aria-hidden="true">{LANG_LABELS[code].flag}</span>
                <span>{LANG_LABELS[code].label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
