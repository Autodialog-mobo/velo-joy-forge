import { Fragment, useEffect, useState, type ReactNode } from "react";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Link } from "@tanstack/react-router";

const linkStyle = {
  color: "#0D1F3C",
  textDecoration: "underline",
  textUnderlineOffset: 3,
  fontWeight: 500,
} as const;

// Tokens detected (in order of regex alternatives):
//  1) [label](target)        markdown link
//  2) mailto:foo@bar         email
//  3) https?://...           external URL
//  4) bare domain (e.g. bikesearch.velopass.com[/path])
//  5) absolute internal path (e.g. /gestolen, /bikesearch#hash)
const LINK_RE =
  /(\[[^\]]+\]\([^)]+\))|(mailto:[^\s)]+)|(https?:\/\/[^\s)]+)|((?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s)]*)?)|(\/[a-zA-Z0-9/_#-]+)/g;

function renderHref(target: string, label: string, key: number): ReactNode {
  if (target.startsWith("/")) {
    const [path, hash] = target.split("#");
    return (
      <Link key={key} to={path} hash={hash} style={linkStyle}>
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

function renderToken(token: string, key: number): ReactNode {
  const md = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token);
  if (md) return renderHref(md[2], md[1], key);
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
  if (token.startsWith("/")) return renderHref(token, token, key);
  return (
    <a key={key} href={`https://${token}`} target="_blank" rel="noopener noreferrer" style={linkStyle}>
      {token}
    </a>
  );
}

function renderLine(line: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let i = 0;
  for (const m of line.matchAll(LINK_RE)) {
    const start = m.index ?? 0;
    if (start > last) out.push(<Fragment key={`t-${i++}`}>{line.slice(last, start)}</Fragment>);
    out.push(renderToken(m[0], i++));
    last = start + m[0].length;
  }
  if (last < line.length) out.push(<Fragment key={`t-${i++}`}>{line.slice(last)}</Fragment>);
  return out;
}

const leftFAQs = [
  {
    q: "Wat als iemand de Frame-ID van mijn fiets verwijdert?",
    a: "Ten eerste is dat niet eenvoudig: de Frame-ID is ontworpen om te beschadigen bij een verwijderingspoging — het materiaal brokkelt in stukjes uiteen en beschadigt ook de lak van het frame. Elke poging laat duidelijke sporen achter.\n\nMaar ook al zou iemand erin slagen: bij de registratie bewaren we ook het merk en framenummer van je fiets. Je fiets blijft altijd traceerbaar via die combinatie — net zoals een auto zonder kenteken nog steeds gevonden kan worden via het chassisnummer. De Frame-ID maakt het enkel sneller en eenvoudiger.\n\nBovendien blokkeert Velopass elke poging om een al geregistreerde fiets opnieuw te registreren op basis van die merk + framenummer combinatie. Een dief kan jouw fiets dus niet opnieuw registreren op zijn naam.\n\nWil je zelf controleren of jouw fiets geregistreerd is? Zoek via merk + framenummer op [Fiets controleren →](/fiets-controleren)",
  },
  {
    q: "Kan ik een nieuwe Frame-ID bestellen als mijn oude verwijderd of beschadigd is?",
    a: "Ja. Bestel een nieuwe Frame-ID via onze webshop of bij een Velopass-fietswinkel bij jou in de buurt. Na ontvangst log je in op je Velopass, selecteer je de betreffende fiets en klik je op 'Frame-ID vervangen'. Je fietshistorie en alle actieve services blijven bewaard.",
  },
  {
    q: "Hoe draag ik mijn fiets over aan een nieuwe eigenaar?",
    a: "Log in op je Velopass, selecteer de fiets en klik op 'eigendom overdragen'. Je ontvangt een pincode via e-mail. Geef die pincode aan de nieuwe eigenaar — hij voert die in en zet de fiets op zijn naam. De volledige fietshistorie gaat mee — enkel jouw persoonlijke gegevens en privéfoto's blijven privé.",
  },
  {
    q: "Hoe werkt Velopass samen met het Belgisch Nationaal Fietsregister (MyBike)?",
    a: "Je kan je Velopass-code gebruiken om je fiets ook te registreren in MyBike, het Belgisch nationaal fietsregister. Zo ben je dubbel beschermd — in de Velopass Community én in het officiële register.",
  },
  {
    q: "Wat is het verschil tussen de Velopass-code en het framenummer?",
    a: "Het zijn twee verschillende nummers. Het framenummer is het serienummer dat de fabrikant heeft ingegraveerd op het frame van je fiets. De Velopass-code staat op de Frame-ID die op je fiets geplakt is en geeft toegang tot je digitaal paspoort. Op bikesearch.velopass.com kan je zoeken met beide.",
  },
];

const rightFAQs = [
  {
    q: "Wat betekenen ALL CLEAR, REPORTED en NOT REGISTERED?",
    a: "Dit zijn de drie statussen in de Velopass Community:\n• ALL CLEAR: de fiets is geregistreerd en niet gemeld als vermist. Alles in orde.\n• REPORTED: de eigenaar heeft de fiets actief gemeld. De community zoekt mee.\n• NOT REGISTERED: de fiets staat niet in de Velopass-database en is nog niet beveiligd.",
  },
  {
    q: "Waarom wordt er niet meer gegraveerd en wat is het verschil met Velopass?",
    a: "Graveren is nagenoeg volledig verdwenen — en dat is logisch. Moderne fietsen van carbon of aluminium worden beschadigd door een graveermachine. Bij carbon is graveren zelfs fataal voor de framestructuur. Bij e-bikes lopen er bovendien interne kabels door de buizen.\n\nVroeger werd je rijksregisternummer ingegraveerd — dat is een privacyrisico. Je persoonlijke ID lag letterlijk zichtbaar op je fiets.\n\nDe Velopass Frame-ID vervangt dit volledig:\n• Geen schade aan het frame — de sticker plakt, krast niet\n• Geen persoonlijke data op de sticker — wie scant ziet enkel de status (vrij of gemeld), nooit jouw gegevens\n• Fraudebestendig — het materiaal brokkelt in stukjes als iemand eraan prutst\n• Overdraagbaar — bij verkoop draag je het digitale paspoort over naar de nieuwe eigenaar, zonder opnieuw te registreren\n• Digitaal paspoort — aankoopbewijs, serienummer en onderhoudshistorie allemaal op één plek",
  },
  {
    q: "Ik probeer in te loggen maar het lukt niet.",
    a: "De app in de App Store en Google Play is de Velopass Pro app — uitsluitend voor fietswinkels. Als fietser log je in via velopass.com. Klik op 'Inloggen' rechtsboven of ga naar app.velopass.com/login.",
  },
  {
    q: "Ik koop een tweedehands fiets met een Velopass Frame-ID. Wat moet ik doen?",
    a: "Twee stappen. Vóór de aankoop: controleer de status van de fiets op bikesearch.velopass.com — zo weet je zeker dat de fiets niet als gestolen of vermist staat. Na de aankoop: vraag de vorige eigenaar om het eigendom aan jou over te dragen via zijn Velopass-account. Daarna staat de fiets officieel op jouw naam.",
  },
  {
    q: "Hoe koppel ik een fietswinkel aan mijn Velopass?",
    a: "Als je fiets via een Velopass-fietswinkel geregistreerd werd, is die winkel al automatisch gekoppeld. Wil je een andere winkel kiezen of een winkel toevoegen? Dat doe je in je Velopass-account onder 'Mijn fietswinkel'. Je kan dit op elk moment wijzigen.",
  },
  {
    q: "Ik kan mijn fiets niet registreren.",
    a: "Er zijn twee situaties waarvoor de registratie anders verloopt:\n\nBegint je Velopass-code met VP? Dan ben je waarschijnlijk in Frankrijk gekocht. In Frankrijk is fietsregistratie wettelijk verplicht en moet die door de verkoper — de fietswinkel — gebeuren. De winkel registreert de fiets bij verkoop; jij kan dit niet zelf online doen. Neem contact op met je fietswinkel als de registratie nog niet is gebeurd.\n\nIs het een leasefiets? Leasefietsen zijn geregistreerd op naam van de leasingmaatschappij (bij Joule is dit een uitzondering — daar heb je wel een eigen account). Je hebt in dat geval geen eigen Velopass-account, maar de fietswinkel kan je fiets uitlezen en onderhoud toevoegen. Is je fiets verloren of gestolen? Geef dit door aan de leasingmaatschappij — zij kunnen de fiets als verloren melden.",
  },
];

export function FaqSection() {
  const [openLeft, setOpenLeft] = useState<string[]>([]);
  const [openRight, setOpenRight] = useState<string[]>([]);

  useEffect(() => {
    const applyHash = () => {
      const h = window.location.hash.replace("#", "");
      if (h.startsWith("faq-l-")) setOpenLeft([h]);
      else if (h.startsWith("faq-r-")) setOpenRight([h]);
      if (h.startsWith("faq-")) {
        // give accordion a tick to expand before scrolling
        requestAnimationFrame(() => {
          document.getElementById(h)?.scrollIntoView({ block: "center" });
        });
      }
    };
    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, []);

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
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <p
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 600,
              fontSize: 12,
              letterSpacing: "0.12em",
              textTransform: "uppercase" as const,
              color: "#2ECC8A",
              marginBottom: 12,
            }}
          >
            VEELGESTELDE VRAGEN
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
            Alles wat je wil weten
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
            Staat jouw vraag er niet bij? Contacteer ons via{" "}
            <Link to="/contact" hash="wa-form" style={{ color: "#0D1F3C", textDecoration: "underline", textUnderlineOffset: 3 }}>
              WhatsApp
            </Link>{" "}
            of mail naar{" "}
            <a href="mailto:support@velopass.com" style={{ color: "#0D1F3C", textDecoration: "underline", textUnderlineOffset: 3 }}>
              support@velopass.com
            </a>
          </p>
        </div>

        {/* Two columns */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
            gap: 24,
          }}
        >
          {/* Left column */}
          <div
            style={{
              background: "#FFFFFF",
              border: "1px solid rgba(13,31,60,0.1)",
              borderRadius: 12,
              padding: "16px 20px",
            }}
          >
            <Accordion type="multiple" className="w-full" value={openLeft} onValueChange={(v) => { setOpenLeft(v); syncHash(v); }}>
              {leftFAQs.map((faq, i) => (
                <AccordionItem key={`faq-l-${i}`} value={`faq-l-${i}`} id={`faq-l-${i}`} className="border-b border-[rgba(13,31,60,0.1)]">
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
                    {faq.a.split("\n").map((line, idx) =>
                      line.startsWith("•") ? (
                        <div key={idx} style={{ display: "flex", gap: 8, marginTop: 4 }}>
                          <span style={{ color: "#2ECC8A", fontWeight: 600 }}>•</span>
                          <span>{line.slice(1).trim()}</span>
                        </div>
                      ) : (
                        <span key={idx}>{renderLine(line)}{idx < faq.a.split("\n").length - 1 ? <br /> : null}</span>
                      )
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>

          {/* Right column */}
          <div
            style={{
              background: "#FFFFFF",
              border: "1px solid rgba(13,31,60,0.1)",
              borderRadius: 12,
              padding: "16px 20px",
            }}
          >
            <Accordion type="multiple" className="w-full" value={openRight} onValueChange={(v) => { setOpenRight(v); syncHash(v); }}>
              {rightFAQs.map((faq, i) => (
                <AccordionItem key={`faq-r-${i}`} value={`faq-r-${i}`} id={`faq-r-${i}`} className="border-b border-[rgba(13,31,60,0.1)]">
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
                    {faq.a.split("\n").map((line, idx) =>
                      line.startsWith("•") ? (
                        <div key={idx} style={{ display: "flex", gap: 8, marginTop: 4 }}>
                          <span style={{ color: "#2ECC8A", fontWeight: 600 }}>•</span>
                          <span>{line.slice(1).trim()}</span>
                        </div>
                      ) : (
                        <span key={idx}>{renderLine(line)}{idx < faq.a.split("\n").length - 1 ? <br /> : null}</span>
                      )
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </div>
    </section>
  );
}
