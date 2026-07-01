import { createFileRoute, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { BUNDLES } from "@/lib/bundles";
import { LangSwitcher } from "@/components/LangSwitcher";


// =============================================================
// Margetoelichting — private, unlisted page for shops
// -------------------------------------------------------------
// URL: /m/AJZkAqItiw4HN9Gq1ahkLJOaB9dc3WjOmmsCsKh6hds
// Reachable ONLY via direct link in email. Not in sitemap,
// not in nav, noindex/nofollow, disallowed in robots.txt.
// =============================================================

// --- Editable config -----------------------------------------
const CREATED_ON: [number, number, number] = [1, 7, 2026];
const VALID_UNTIL: [number, number, number] = [30, 9, 2026];
const PURCHASE_PRICE_EXCL_VAT_CENTS = 350; // €3,50 excl. btw
const VAT_RATE = 0.21;
// -------------------------------------------------------------

const TOKEN = "AJZkAqItiw4HN9Gq1ahkLJOaB9dc3WjOmmsCsKh6hds";

type Lang = "nl" | "fr" | "de" | "en" | "es";


const MONTHS: Record<Lang, string[]> = {
  nl: ["januari","februari","maart","april","mei","juni","juli","augustus","september","oktober","november","december"],
  fr: ["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"],
  de: ["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"],
  en: ["January","February","March","April","May","June","July","August","September","October","November","December"],
  es: ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"],
};

const LOCALE: Record<Lang, string> = {
  nl: "nl-BE", fr: "fr-BE", de: "de-DE", en: "en-GB", es: "es-ES",
};

const T = {
  nl: {
    metaTitle: "Margetoelichting — Velopass",
    createdOn: "Opgemaakt op", validUntil: "Geldig tot",
    h1: "Margetoelichting Frame-ID",
    lede: (vat: string, price: string) => <>Een transparant overzicht van de Frame-ID bundels zoals ze op de Velopass-webshop staan, en de marge die je als vakhandel per bundel realiseert. Alle marges zijn berekend excl. btw ({vat}), op basis van een inkoopprijs van <strong>{price}</strong> per Frame-ID.</>,
    notice: <><strong>Belangrijk:</strong> de marges hieronder gelden voor de Frame-ID <em>zonder plaatsing door de winkel</em>. De prijs voor het aanbrengen van de Frame-ID op de fiets bepaal je zelf en komt bovenop de hier getoonde productmarge.</>,
    whyTitle: "Waarom het werkt",
    why1: <><strong>Je klant blijft je klant.</strong> De Frame-ID bindt je klant aan jouw winkel: hij komt terug voor onderhoud, herstelling en zijn volgende fiets. Je verdient niet in de eerste plaats aan de Frame-ID zelf — je verdient aan de klant die blijft. Elke Frame-ID die je meegeeft, is een klant die je vasthoudt.</>,
    why2: <><strong>Snelle omloop.</strong> Aan de kassa neemt de klant de Frame-ID zelf uit het display — voor een van zijn eigen fietsen, of als geschenk: geen verkoopgesprek nodig, geen moeite: een impulsartikel dat meegaat met elke klant die langskomt.</>,
    bundlesTitle: "De bundels in één oogopslag",
    framing: "De marge op de Frame-ID is mooi meegenomen. Maar de echte winst zit in de klant die terugkomt — voor alles wat daarna volgt.",
    footnote: (vat: string, mult: string, price: string) => <>Verkoopprijs = vaste adviesprijs aan de eindklant (incl. {vat} btw). Marge berekend als (verkoopprijs ÷ {mult} − {price} inkoop) × aantal Frame-ID's. Dit is de <strong>productmarge zonder plaatsing</strong>; een eventueel plaatsingstarief reken je apart aan.</>,
    rolloutTitle: "Nu los, straks in bundels",
    rollout1: (price: string) => <>Vandaag geef je losse Frame-ID's mee aan exact dezelfde inkoopprijs van <strong>{price} excl. btw</strong> per Frame-ID.</>,
    rollout2: "De voorverpakte bundels (1 / 2 / 5, klaar als schapartikel met scanbare artikel-barcode in je kassasysteem) rollen we stap voor stap uit, te beginnen bij een eerste groep winkels. Zodra de proefperiode succesvol is afgerond, wordt bestellen en leveren van de bundels breder beschikbaar.",
    rollout3: "De margelogica is in beide vormen identiek — alleen de verpakking verschilt. Of je nu een losse Frame-ID meegeeft of straks een voorverpakte bundel verkoopt: dezelfde inkoop, dezelfde marge per Frame-ID.",
    footerQ: "Vragen over deze toelichting? Neem contact op via ",
    pack: (n: number) => `${n}-pack`,
    qty: (n: number) => `${n} Frame-ID${n > 1 ? "'s" : ""}`,
    priceIncl: "Verkoopprijs incl. btw",
    priceExcl: "Verkoopprijs excl. btw",
    yourMargin: "Jouw marge",
    ofPriceExcl: "van verkoopprijs excl. btw",
    perUnit: (v: string) => `${v} marge / Frame-ID`,
    mostChosen: "Meest gekozen",
  },
  fr: {
    metaTitle: "Explication de la marge — Velopass",
    createdOn: "Établi le", validUntil: "Valable jusqu'au",
    h1: "Marge Frame-ID",
    lede: (vat: string, price: string) => <>Un aperçu transparent des packs Frame-ID tels qu'ils figurent sur la boutique Velopass, et de la marge que vous réalisez par pack en tant que revendeur. Toutes les marges sont calculées HTVA ({vat}), sur base d'un prix d'achat de <strong>{price}</strong> par Frame-ID.</>,
    notice: <><strong>Important :</strong> les marges ci-dessous s'appliquent au Frame-ID <em>sans pose par le magasin</em>. Le tarif pour l'apposition du Frame-ID sur le vélo est fixé par vos soins et s'ajoute à la marge produit indiquée ici.</>,
    whyTitle: "Pourquoi ça marche",
    why1: <><strong>Votre client reste votre client.</strong> Le Frame-ID lie votre client à votre magasin : il revient pour l'entretien, les réparations et son prochain vélo. Vous ne gagnez pas d'abord sur le Frame-ID lui-même — vous gagnez sur le client qui reste. Chaque Frame-ID remis est un client fidélisé.</>,
    why2: <><strong>Rotation rapide.</strong> À la caisse, le client prend lui-même le Frame-ID dans le présentoir — pour l'un de ses vélos ou en cadeau : aucun argumentaire de vente, aucun effort : un article d'impulsion qui repart avec chaque client qui passe.</>,
    bundlesTitle: "Les packs en un coup d'œil",
    framing: "La marge sur le Frame-ID est agréable à prendre. Mais le vrai gain se trouve dans le client qui revient — pour tout ce qui suit.",
    footnote: (vat: string, mult: string, price: string) => <>Prix de vente = prix conseillé fixe au client final (TVAC {vat}). Marge calculée comme (prix de vente ÷ {mult} − {price} achat) × nombre de Frame-ID. Il s'agit de la <strong>marge produit sans pose</strong> ; un éventuel tarif de pose se facture séparément.</>,
    rolloutTitle: "En vrac aujourd'hui, en packs bientôt",
    rollout1: (price: string) => <>Aujourd'hui, vous remettez des Frame-ID à l'unité depuis votre stock en vrac (minimum 50 pièces, prévu à l'origine pour les vélos leasing) — au même prix d'achat de <strong>{price} HTVA</strong> par Frame-ID.</>,
    rollout2: "Les packs préconditionnés (1 / 2 / 5, prêts pour le rayon) se déploient progressivement, en commençant par un premier groupe de magasins. Une fois la phase pilote réussie, la commande et la livraison des packs seront élargies.",
    rollout3: "La logique de marge est identique dans les deux formes — seul l'emballage change. Que vous remettiez un Frame-ID à l'unité ou vendiez bientôt un pack préconditionné : même achat, même marge par Frame-ID.",
    footerQ: "Des questions sur cette explication ? Contactez ",
    pack: (n: number) => `Pack de ${n}`,
    qty: (n: number) => `${n} Frame-ID`,
    priceIncl: "Prix de vente TVAC",
    priceExcl: "Prix de vente HTVA",
    yourMargin: "Votre marge",
    ofPriceExcl: "du prix de vente HTVA",
    perUnit: (v: string) => `${v} marge / Frame-ID`,
    mostChosen: "Le plus choisi",
  },
  de: {
    metaTitle: "Margen-Erläuterung — Velopass",
    createdOn: "Erstellt am", validUntil: "Gültig bis",
    h1: "Frame-ID Marge",
    lede: (vat: string, price: string) => <>Eine transparente Übersicht der Frame-ID-Bundles wie sie im Velopass-Shop stehen, und der Marge, die Sie als Fachhändler pro Bundle erzielen. Alle Margen sind netto ({vat}) berechnet, basierend auf einem Einkaufspreis von <strong>{price}</strong> pro Frame-ID.</>,
    notice: <><strong>Wichtig:</strong> die Margen unten gelten für die Frame-ID <em>ohne Montage durch den Händler</em>. Den Preis für das Anbringen der Frame-ID am Fahrrad bestimmen Sie selbst, er kommt zur hier gezeigten Produktmarge hinzu.</>,
    whyTitle: "Warum es funktioniert",
    why1: <><strong>Ihr Kunde bleibt Ihr Kunde.</strong> Die Frame-ID bindet den Kunden an Ihr Geschäft: er kommt zurück für Wartung, Reparatur und sein nächstes Fahrrad. Sie verdienen nicht in erster Linie an der Frame-ID selbst — Sie verdienen am Kunden, der bleibt. Jede Frame-ID, die Sie mitgeben, ist ein Kunde, den Sie halten.</>,
    why2: <><strong>Schneller Umschlag.</strong> An der Kasse nimmt der Kunde die Frame-ID selbst aus dem Display — für eines seiner Fahrräder oder als Geschenk: kein Verkaufsgespräch nötig, kein Aufwand: ein Impulsartikel, der mit jedem Kunden mitgeht.</>,
    bundlesTitle: "Die Bundles auf einen Blick",
    framing: "Die Marge auf die Frame-ID ist ein schöner Bonus. Aber der echte Gewinn liegt beim Kunden, der zurückkommt — für alles, was danach kommt.",
    footnote: (vat: string, mult: string, price: string) => <>Verkaufspreis = feste UVP an den Endkunden (inkl. {vat} MwSt.). Marge berechnet als (Verkaufspreis ÷ {mult} − {price} Einkauf) × Anzahl Frame-ID. Dies ist die <strong>Produktmarge ohne Montage</strong>; ein etwaiges Montage-Entgelt berechnen Sie separat.</>,
    rolloutTitle: "Jetzt lose, bald in Bundles",
    rollout1: (price: string) => <>Heute geben Sie einzelne Frame-ID aus Ihrem Bulk-Bestand mit (Mindestabnahme 50 Stück, ursprünglich für Leasing-Räder) — zum exakt gleichen Einkaufspreis von <strong>{price} netto</strong> pro Frame-ID.</>,
    rollout2: "Die vorverpackten Bundles (1 / 2 / 5, regalfertig) rollen wir schrittweise aus, beginnend mit einer ersten Gruppe von Händlern. Sobald die Testphase erfolgreich abgeschlossen ist, wird die Bestellung und Lieferung der Bundles breiter verfügbar.",
    rollout3: "Die Margenlogik ist in beiden Formen identisch — nur die Verpackung ändert sich. Ob Sie eine einzelne Frame-ID mitgeben oder bald ein vorverpacktes Bundle verkaufen: gleicher Einkauf, gleiche Marge pro Frame-ID.",
    footerQ: "Fragen zu dieser Erläuterung? Kontakt: ",
    pack: (n: number) => `${n}er-Pack`,
    qty: (n: number) => `${n} Frame-ID`,
    priceIncl: "Verkaufspreis inkl. MwSt.",
    priceExcl: "Verkaufspreis netto",
    yourMargin: "Ihre Marge",
    ofPriceExcl: "vom Nettoverkaufspreis",
    perUnit: (v: string) => `${v} Marge / Frame-ID`,
    mostChosen: "Am häufigsten gewählt",
  },
  en: {
    metaTitle: "Margin explainer — Velopass",
    createdOn: "Issued on", validUntil: "Valid until",
    h1: "Frame-ID margin",
    lede: (vat: string, price: string) => <>A transparent overview of the Frame-ID bundles as listed on the Velopass shop, and the margin you realise per bundle as a specialist retailer. All margins are calculated excl. VAT ({vat}), based on a purchase price of <strong>{price}</strong> per Frame-ID.</>,
    notice: <><strong>Important:</strong> the margins below apply to the Frame-ID <em>without installation by the shop</em>. The price for applying the Frame-ID to the bike is set by you and comes on top of the product margin shown here.</>,
    whyTitle: "Why it works",
    why1: <><strong>Your customer stays your customer.</strong> The Frame-ID ties your customer to your shop: they come back for maintenance, repairs and their next bike. You don't primarily earn on the Frame-ID itself — you earn on the customer who stays. Every Frame-ID you hand out is a customer you retain.</>,
    why2: <><strong>Fast turnover.</strong> At the till the customer picks the Frame-ID from the display themselves — for one of their own bikes, or as a gift: no sales pitch needed, no effort: an impulse item that walks out with every customer who drops by.</>,
    bundlesTitle: "The bundles at a glance",
    framing: "The margin on the Frame-ID is a nice bonus. But the real win sits with the customer who comes back — for everything that follows.",
    footnote: (vat: string, mult: string, price: string) => <>Sale price = fixed RRP to the end customer (incl. {vat} VAT). Margin computed as (sale price ÷ {mult} − {price} purchase) × number of Frame-IDs. This is the <strong>product margin without installation</strong>; any installation fee is billed separately.</>,
    rolloutTitle: "Loose today, bundled soon",
    rollout1: (price: string) => <>Today you hand out loose Frame-IDs from your bulk stock (minimum 50 pieces, originally for lease bikes) — at the exact same purchase price of <strong>{price} excl. VAT</strong> per Frame-ID.</>,
    rollout2: "The pre-packaged bundles (1 / 2 / 5, ready as shelf items) roll out step by step, starting with a first group of shops. Once the pilot phase is successfully completed, ordering and delivery of the bundles becomes more broadly available.",
    rollout3: "The margin logic is identical in both forms — only the packaging changes. Whether you hand out a loose Frame-ID or later sell a pre-packaged bundle: same purchase, same margin per Frame-ID.",
    footerQ: "Questions about this explainer? Contact ",
    pack: (n: number) => `${n}-pack`,
    qty: (n: number) => `${n} Frame-ID${n > 1 ? "s" : ""}`,
    priceIncl: "Sale price incl. VAT",
    priceExcl: "Sale price excl. VAT",
    yourMargin: "Your margin",
    ofPriceExcl: "of sale price excl. VAT",
    perUnit: (v: string) => `${v} margin / Frame-ID`,
    mostChosen: "Most chosen",
  },
  es: {
    metaTitle: "Explicación del margen — Velopass",
    createdOn: "Emitido el", validUntil: "Válido hasta",
    h1: "Margen Frame-ID",
    lede: (vat: string, price: string) => <>Un resumen transparente de los packs Frame-ID tal como aparecen en la tienda Velopass, y del margen que obtienes por pack como distribuidor especializado. Todos los márgenes se calculan sin IVA ({vat}), con un precio de compra de <strong>{price}</strong> por Frame-ID.</>,
    notice: <><strong>Importante:</strong> los márgenes siguientes se aplican al Frame-ID <em>sin colocación por la tienda</em>. El precio de la colocación del Frame-ID en la bicicleta lo fijas tú y se suma al margen de producto mostrado aquí.</>,
    whyTitle: "Por qué funciona",
    why1: <><strong>Tu cliente sigue siendo tu cliente.</strong> El Frame-ID vincula al cliente con tu tienda: vuelve para el mantenimiento, las reparaciones y su próxima bicicleta. No ganas principalmente con el Frame-ID en sí — ganas con el cliente que se queda. Cada Frame-ID que entregas es un cliente que fidelizas.</>,
    why2: <><strong>Rotación rápida.</strong> En caja el cliente coge el Frame-ID del expositor por sí mismo — para una de sus bicicletas o como regalo: sin argumentario de venta, sin esfuerzo: un artículo de impulso que sale con cada cliente que pasa.</>,
    bundlesTitle: "Los packs de un vistazo",
    framing: "El margen del Frame-ID es un bonito extra. Pero la verdadera ganancia está en el cliente que vuelve — por todo lo que viene después.",
    footnote: (vat: string, mult: string, price: string) => <>Precio de venta = PVP fijo al cliente final (IVA {vat} incl.). Margen calculado como (precio de venta ÷ {mult} − {price} compra) × número de Frame-IDs. Este es el <strong>margen de producto sin colocación</strong>; cualquier tarifa de colocación se factura por separado.</>,
    rolloutTitle: "Hoy sueltos, pronto en packs",
    rollout1: (price: string) => <>Hoy entregas Frame-IDs sueltos de tu stock a granel (mínimo 50 unidades, originalmente para bicicletas de leasing) — al mismo precio de compra de <strong>{price} sin IVA</strong> por Frame-ID.</>,
    rollout2: "Los packs preempaquetados (1 / 2 / 5, listos como artículo de lineal) se despliegan paso a paso, empezando por un primer grupo de tiendas. Una vez completada con éxito la fase piloto, el pedido y entrega de los packs estará más ampliamente disponible.",
    rollout3: "La lógica de margen es idéntica en ambas formas — solo cambia el embalaje. Ya sea que entregues un Frame-ID suelto o vendas próximamente un pack preempaquetado: misma compra, mismo margen por Frame-ID.",
    footerQ: "¿Preguntas sobre esta explicación? Contacta ",
    pack: (n: number) => `Pack de ${n}`,
    qty: (n: number) => `${n} Frame-ID`,
    priceIncl: "Precio de venta con IVA",
    priceExcl: "Precio de venta sin IVA",
    yourMargin: "Tu margen",
    ofPriceExcl: "del precio de venta sin IVA",
    perUnit: (v: string) => `${v} margen / Frame-ID`,
    mostChosen: "Más elegido",
  },
} as const;

function formatDate([d, m, y]: [number, number, number], lang: Lang) {
  return `${d} ${MONTHS[lang][m - 1]} ${y}`;
}

const eur = (cents: number, lang: Lang) =>
  new Intl.NumberFormat(LOCALE[lang], {
    style: "currency", currency: "EUR",
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(cents / 100);

function exclVat(inclCents: number): number {
  return Math.round(inclCents / (1 + VAT_RATE));
}

export const Route = createFileRoute("/m/$token")({
  ssr: false,
  beforeLoad: ({ params }) => {
    if (params.token !== TOKEN) throw notFound();
  },
  head: () => ({
    meta: [
      { title: "Margetoelichting — Velopass" },
      { name: "robots", content: "noindex, nofollow, noarchive, nosnippet" },
      { name: "googlebot", content: "noindex, nofollow" },
    ],
  }),
  component: MargePage,
});

function VelopassLogo() {
  return (
    <div style={styles.logo}>
      <svg width="32" height="32" viewBox="0 0 100 100" aria-hidden="true" style={{ display: "block" }}>
        <rect width="100" height="100" rx="22" fill="#2ECC8A" />
        <path d="M24 54 L42 72 L76 30" fill="none" stroke="#0D1F3C" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span style={styles.logoWord}>
        velopass<span style={styles.logoPro}>pro</span>
      </span>
    </div>
  );
}


function MargePage() {
  const [lang, setLang] = useState<Lang>("nl");
  const t = T[lang];
  const createdOn = formatDate(CREATED_ON, lang);
  const validUntil = formatDate(VALID_UNTIL, lang);
  const vatPct = `${Math.round(VAT_RATE * 100)}%`;
  const vatMult = (1 + VAT_RATE).toFixed(2);
  const purchaseStr = eur(PURCHASE_PRICE_EXCL_VAT_CENTS, lang);

  const rows = BUNDLES.map((b) => {
    const totalExcl = exclVat(b.price);
    const perUnitExcl = totalExcl / b.stickers;
    const purchaseTotal = PURCHASE_PRICE_EXCL_VAT_CENTS * b.stickers;
    const marginTotal = totalExcl - purchaseTotal;
    const marginPerUnit = marginTotal / b.stickers;
    const pct = Math.round((marginTotal / totalExcl) * 100);
    return {
      key: b.key, stickers: b.stickers, priceIncl: b.price, priceExcl: totalExcl,
      perUnitExcl, marginTotal, marginPerUnit, pct, featured: !!b.featured,
    };
  });

  return (
    <div style={styles.page}>
      <style>{`
        @media (min-width: 900px) {
          h1[data-marge-h1] { white-space: nowrap; font-size: 36px !important; letter-spacing: -0.8px !important; }
        }
      `}</style>
      <header style={styles.topBar}>
        <div style={styles.topBarInner}>
          <VelopassLogo />
          <div style={styles.topBarRight}>
            <div style={styles.dateLine}>
              {t.createdOn} <strong>{createdOn}</strong> · {t.validUntil} <strong>{validUntil}</strong>
            </div>
            <LangSwitcher currentLang={lang} tone="dark" onSelect={setLang} />
          </div>
        </div>
      </header>
      <div style={styles.container}>
        <h1 style={styles.h1} data-marge-h1>{t.h1}</h1>
        <p style={styles.lede}>{t.lede(vatPct, purchaseStr)}</p>

        <div style={styles.notice}>{t.notice}</div>

        <section style={styles.section}>
          <h2 style={styles.h2}>{t.whyTitle}</h2>
          <ul style={styles.list}>
            <li>{t.why1}</li>
            <li>{t.why2}</li>
          </ul>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>{t.bundlesTitle}</h2>
          <div style={styles.grid}>
            {rows.map((r) => (
              <BundleCard
                key={r.key}
                bundleKey={r.key}
                stickers={r.stickers}
                marginCents={r.marginTotal}
                marginPerUnitCents={Math.round(r.marginPerUnit)}
                priceInclCents={r.priceIncl}
                priceExclCents={r.priceExcl}
                pctNum={r.pct}
                title={t.pack(r.stickers)}
                qty={t.qty(r.stickers)}
                priceIncl={eur(r.priceIncl, lang)}
                priceExcl={eur(r.priceExcl, lang)}
                margin={eur(r.marginTotal, lang)}
                perUnit={t.perUnit(eur(r.marginPerUnit, lang))}
                pct={`${r.pct}%`}
                featured={r.featured}
                labels={{
                  priceIncl: t.priceIncl,
                  priceExcl: t.priceExcl,
                  yourMargin: t.yourMargin,
                  ofPriceExcl: t.ofPriceExcl,
                  mostChosen: t.mostChosen,
                }}
              />
            ))}
          </div>
          <p style={styles.framing} data-testid="framing">{t.framing}</p>
          <p style={styles.small}>{t.footnote(vatPct, vatMult, purchaseStr)}</p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>{t.rolloutTitle}</h2>
          <p style={styles.p}>{t.rollout1(purchaseStr)}</p>
          <p style={styles.p}>{t.rollout2}</p>
          <p style={styles.p}>{t.rollout3}</p>
        </section>

        <footer style={styles.footer}>
          <div>
            {t.footerQ}
            <a href="mailto:support@velopass.com" style={styles.link}>support@velopass.com</a>.
          </div>
          <div style={styles.footerDates}>
            {t.createdOn} {createdOn} · {t.validUntil} {validUntil}
          </div>
        </footer>
      </div>
    </div>
  );
}

function BundleCard(props: {
  bundleKey: string; stickers: number; marginCents: number; marginPerUnitCents: number;
  priceInclCents: number; priceExclCents: number; pctNum: number;
  title: string; qty: string; priceIncl: string; priceExcl: string;
  margin: string; perUnit: string; pct: string; featured?: boolean;
  labels: { priceIncl: string; priceExcl: string; yourMargin: string; ofPriceExcl: string; mostChosen: string };
}) {
  return (
    <div
      data-testid="bundle-card"
      data-bundle-key={props.bundleKey}
      data-stickers={props.stickers}
      data-margin-cents={props.marginCents}
      data-margin-per-unit-cents={props.marginPerUnitCents}
      data-price-incl-cents={props.priceInclCents}
      data-price-excl-cents={props.priceExclCents}
      data-pct={props.pctNum}
      style={{ ...styles.card, ...(props.featured ? styles.cardFeatured : null) }}
    >
      {props.featured && <div style={styles.badge}>{props.labels.mostChosen}</div>}
      <div style={styles.cardSize}>{props.title}</div>
      <div style={styles.cardQty}>{props.qty}</div>

      <div style={styles.cardPriceRow}>
        <div style={styles.cardPriceLabel}>{props.labels.priceIncl}</div>
        <div style={styles.cardPriceValue} data-testid="price-incl">{props.priceIncl}</div>
      </div>

      <div style={styles.cardRow}>
        <span>{props.labels.priceExcl}</span>
        <span data-testid="price-excl">{props.priceExcl}</span>
      </div>
      <div style={styles.cardMarginBlock}>
        <div style={styles.cardMarginLabel}>{props.labels.yourMargin}</div>
        <div style={styles.cardMarginValue} data-testid="margin-value">{props.margin}</div>
        <div style={styles.cardMarginSub} data-testid="margin-pct">{props.pct} {props.labels.ofPriceExcl}</div>
      </div>
      <div style={styles.cardPerUnit} data-testid="margin-per-unit">{props.perUnit}</div>
    </div>
  );
}

const NACHT = "#0D1F3C";
const GROEN = "#2ECC8A";
const OFFWHITE = "#F5F3EE";
const INK = "#0D1F3C";
const MUTED = "#5C6B84";
const BORDER = "#E4DFD4";

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", background: OFFWHITE, color: INK, fontFamily: "'DM Sans', system-ui, sans-serif", padding: "0 0 80px" },
  container: { maxWidth: 880, margin: "0 auto", padding: "0 20px" },
  topBar: { background: "rgba(13,31,60,0.97)", borderBottom: "1px solid rgba(46,204,138,0.15)", marginBottom: 48 },
  topBarInner: { maxWidth: 880, margin: "0 auto", padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 },
  topBarRight: { display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" },
  logo: { display: "flex", alignItems: "center", gap: 10 },
  logoWord: { fontFamily: "'Syne', 'DM Sans', sans-serif", fontWeight: 700, fontSize: 17, letterSpacing: -0.3, color: "#fff" },
  logoPro: { fontSize: 10, fontWeight: 600, color: GROEN, letterSpacing: 1.5, textTransform: "uppercase", marginLeft: 2, verticalAlign: "super" },
  dateLine: { fontSize: 13, color: "rgba(255,255,255,0.55)" },
  langSelector: { display: "inline-flex", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 6, overflow: "hidden", background: "rgba(255,255,255,0.04)" },
  langBtn: { background: "transparent", border: "none", color: "rgba(255,255,255,0.6)", fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: 12, fontWeight: 600, letterSpacing: 0.5, padding: "6px 10px", cursor: "pointer" },
  langBtnActive: { background: GROEN, color: NACHT },
  h1: { fontFamily: "'Syne', 'DM Sans', sans-serif", fontWeight: 800, fontSize: 32, lineHeight: 1.1, letterSpacing: -0.5, margin: "0 0 16px", color: NACHT },
  lede: { fontSize: 18, lineHeight: 1.55, color: MUTED, margin: "0 0 40px", maxWidth: 640 },
  section: { marginBottom: 48 },
  h2: { fontFamily: "'Syne', 'DM Sans', sans-serif", fontWeight: 700, fontSize: 22, margin: "0 0 20px", color: NACHT },
  p: { fontSize: 16, lineHeight: 1.65, margin: "0 0 12px" },
  small: { fontSize: 13, color: MUTED, marginTop: 16 },
  framing: { marginTop: 20, padding: "16px 20px", background: "#fff", borderLeft: `4px solid ${GROEN}`, borderRadius: 10, fontSize: 15, lineHeight: 1.55, color: INK, fontStyle: "italic" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 },
  card: { background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 14, padding: 24, position: "relative", display: "flex", flexDirection: "column", gap: 8 },
  cardFeatured: { borderColor: GROEN, boxShadow: `0 0 0 3px ${GROEN}22` },
  badge: { position: "absolute", top: -10, right: 16, background: GROEN, color: NACHT, fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", padding: "4px 10px", borderRadius: 999 },
  cardSize: { fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 18, color: NACHT },
  cardQty: { fontSize: 13, color: MUTED, marginBottom: 12 },
  cardRow: { display: "flex", justifyContent: "space-between", fontSize: 14, color: INK, padding: "4px 0" },
  cardMarginBlock: { marginTop: 12, padding: "14px 0 8px", borderTop: `1px dashed ${BORDER}` },
  cardMarginLabel: { fontSize: 12, color: MUTED, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  cardMarginValue: { fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: 28, fontWeight: 600, color: GROEN, lineHeight: 1 },
  cardMarginSub: { fontSize: 12, color: MUTED, marginTop: 4 },
  cardPriceRow: { display: "flex", flexDirection: "column", gap: 2, marginBottom: 8 },
  cardPriceLabel: { fontSize: 12, color: MUTED, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600 },
  cardPriceValue: { fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: 32, fontWeight: 700, color: NACHT, lineHeight: 1.1, letterSpacing: -0.5 },
  cardPerUnit: { fontSize: 12, color: MUTED, marginTop: 8 },
  list: { margin: 0, paddingLeft: 20, lineHeight: 1.7, fontSize: 16 },
  footer: { marginTop: 64, paddingTop: 20, borderTop: `1px solid ${BORDER}`, fontSize: 13, color: MUTED, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 },
  footerDates: { color: MUTED },
  notice: { background: "#fff", border: `1px solid ${BORDER}`, borderLeft: `4px solid ${GROEN}`, borderRadius: 10, padding: "14px 18px", fontSize: 14, lineHeight: 1.55, color: INK, marginBottom: 40 },
  link: { color: NACHT, textDecoration: "underline" },
};
