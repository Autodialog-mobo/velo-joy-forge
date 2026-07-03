import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

type Shop = {
  name: string;
  address: string;
  city: string;
  brands?: string[];
};

export function ShopPanel({ shop, onClose }: { shop: Shop; onClose: () => void }) {
  const { t } = useTranslation("home");
  const [isMobile, setIsMobile] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startY = useRef<number | null>(null);
  const sheetRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Reset drag when shop changes
  useEffect(() => {
    setDragY(0);
    setDragging(false);
    startY.current = null;
  }, [shop]);

  // Lock body scroll while mobile sheet is open
  useEffect(() => {
    if (!isMobile) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isMobile]);

  // Close on Esc
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (!isMobile) return;
    startY.current = e.clientY;
    setDragging(true);
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!isMobile || startY.current == null) return;
    const dy = Math.max(0, e.clientY - startY.current);
    setDragY(dy);
  };

  const onPointerUp = () => {
    if (!isMobile) return;
    const height = sheetRef.current?.offsetHeight ?? 400;
    if (dragY > height * 0.3) {
      setDragY(height);
      setTimeout(onClose, 180);
    } else {
      setDragY(0);
    }
    setDragging(false);
    startY.current = null;
  };

  const sheetStyle: React.CSSProperties = isMobile
    ? {
        transform: `translateY(${dragY}px)`,
        transition: dragging ? "none" : "transform 0.28s cubic-bezier(0.32,0.72,0,1)",
      }
    : {};

  return (
    <>
      {isMobile && (
        <div
          className="sf-panel-backdrop"
          onClick={onClose}
          style={{ opacity: Math.max(0, 1 - dragY / 400) }}
        />
      )}
      <div className={`sf-panel ${isMobile ? "sf-panel-sheet" : ""}`} style={sheetStyle} ref={sheetRef}>
        {isMobile && (
          <div
            className="sf-panel-grab"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            <span className="sf-panel-handle" />
          </div>
        )}
        <button
          type="button"
          className="sf-panel-close"
          onClick={onClose}
          aria-label={t("community.panel_close_aria")}
        >
          ×
        </button>
        <div className="sf-panel-body">
          <div className="sf-panel-tag">● {t("community.auto_scan_tag")}</div>
          <h3 className="sf-panel-name">{shop.name}</h3>
          <p className="sf-panel-addr">{shop.address}</p>
          <p className="sf-panel-msg">
            {t("community.panel_message")}
          </p>
          {shop.brands && shop.brands.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#5A7090", marginBottom: 8 }}>
                {t("community.panel_brands")}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {shop.brands.map((b) => (
                  <span key={b} style={{ fontSize: 12, padding: "4px 10px", borderRadius: 999, background: "#F5F3EE", color: "#0D1F3C", border: "1px solid rgba(13,31,60,0.08)" }}>
                    {b}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div className="sf-panel-actions" style={{ marginTop: 24 }}>
            <a
              className="sf-panel-btn primary"
              target="_blank"
              rel="noreferrer"
              href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(shop.address)}`}
            >
              {t("community.panel_directions")}
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
