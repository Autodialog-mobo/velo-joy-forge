import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";

const leftFAQs = [
  {
    q: "Wat als iemand de Frame-ID van mijn fiets verwijdert?",
    a: "Bij de registratie van je fiets bewaren we ook het merk en framenummer. Wordt de Frame-ID verwijderd, dan blijft jouw fiets traceerbaar via die combinatie — net zoals een auto zonder kenteken/nummerplaat nog steeds gevonden kan worden via het chassisnummer. De Frame-ID maakt het alleen veel eenvoudiger en sneller.",
  },
  {
    q: "Kan ik een nieuwe Frame-ID bestellen als mijn oude verwijderd of beschadigd is?",
    a: "Ja. Bestel een nieuwe Frame-ID via onze webshop of bij een Velopass-fietswinkel bij jou in de buurt. Na ontvangst log je in op je Velopass, selecteer je de betreffende fiets en klik je op 'Frame-ID vervangen'. Je fietshistorie en alle actieve services blijven bewaard.",
  },
  {
    q: "Hoe draag ik mijn fiets over aan een nieuwe eigenaar?",
    a: "Log in op je Velopass, selecteer de fiets en klik op 'eigendom overdragen'. De nieuwe eigenaar ontvangt een uitnodiging en zet de fiets op zijn naam. De volledige fietshistorie gaat mee — enkel jouw persoonlijke gegevens en privéfoto's blijven privé.",
  },
  {
    q: "Hoe werkt Velopass samen met het Belgisch Nationaal Fietsregister (MyBike)?",
    a: "Je kan je Velopass-code gebruiken om je fiets ook te registreren in MyBike, het Belgisch nationaal fietsregister. Zo ben je dubbel beschermd — in de Internationale Velopass Community én in het Belgische register.",
  },
  {
    q: "Wat is het verschil tussen de Velopass-code en het framenummer?",
    a: "Het zijn twee verschillende nummers. Het framenummer is het serienummer dat de fabrikant heeft ingegraveerd op het frame van je fiets. De Velopass-code staat op de Frame-ID die op je fiets geplakt is en geeft toegang tot je digitaal paspoort. Op bikesearch.velopass.com kan je zoeken met beide.",
  },
];

const rightFAQs = [
  {
    q: "Wat betekenen ALL CLEAR, REPORTED en NOT REGISTERED?",
    a: "Dit zijn the drie statussen in de Velopass Community:\n• ALL CLEAR: de fiets is geregistreerd en niet gemeld als vermist. Alles in orde.\n• REPORTED: de eigenaar heeft de fiets actief gemeld als vermist. De community zoekt mee.\n• NOT REGISTERED: de fiets staat niet in de Velopass-database en is nog niet beveiligd.",
  },
  {
    q: "Wat is het verschil tussen Velopass en het graveren van mijn rijksregisternummer?",
    a: "Graveren brengt blijvende schade aan het frame toe — tenzij door de fabrikant zelf gedaan, vervalt hierdoor je garantie. Bovendien maakt een ingegraveerd rijksregisternummer je fiets moeilijk verkoopbaar. De Velopass Frame-ID is overdraagbaar naar een volgende eigenaar bij verkoop.",
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
];

export function FaqSection() {
  return (
    <section id="faq" style={{ background: "#F5F3EE", padding: "80px 6vw" }}>
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
            <a href="#" style={{ color: "#0D1F3C", textDecoration: "underline", textUnderlineOffset: 3 }}>
              WhatsApp
            </a>{" "}
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
            <Accordion type="multiple" className="w-full">
              {leftFAQs.map((faq, i) => (
                <AccordionItem key={`l-${i}`} value={`l-${i}`} className="border-b border-[rgba(13,31,60,0.1)]">
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
                        <span key={idx}>{line}{idx < faq.a.split("\n").length - 1 ? <br /> : null}</span>
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
            <Accordion type="multiple" className="w-full">
              {rightFAQs.map((faq, i) => (
                <AccordionItem key={`r-${i}`} value={`r-${i}`} className="border-b border-[rgba(13,31,60,0.1)]">
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
                        <span key={idx}>{line}{idx < faq.a.split("\n").length - 1 ? <br /> : null}</span>
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
