import { useEffect, useRef, useState, type CSSProperties } from "react";
import { loadGoogleMaps } from "@/lib/google-places";

export type ParsedPlace = {
  name: string;
  street: string;
  postal: string;
  city: string;
  country: string;
};

interface Props {
  id: string;
  className?: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  onPlaceSelected: (p: ParsedPlace) => void;
  includedPrimaryTypes?: string[];
  includedRegionCodes?: string[];
  autoComplete?: string;
  required?: boolean;
  language?: string;
}

// Loosely-typed shims for the Places (New) browser API
type Suggestion = {
  placePrediction?: {
    mainText?: { text?: string };
    secondaryText?: { text?: string };
    text?: { text?: string };
    toPlace: () => {
      fetchFields: (opts: { fields: string[] }) => Promise<unknown>;
      displayName?: string;
      addressComponents?: Array<{
        longText?: string;
        shortText?: string;
        types?: string[];
      }>;
    };
  };
};

function parseAddressComponents(
  components: Array<{ longText?: string; shortText?: string; types?: string[] }>,
): Omit<ParsedPlace, "name"> {
  const get = (t: string) => components.find((c) => c.types?.includes(t));
  const streetNumber = get("street_number")?.longText ?? "";
  const route = get("route")?.longText ?? "";
  const postal = get("postal_code")?.longText ?? "";
  const city =
    get("locality")?.longText ??
    get("postal_town")?.longText ??
    get("administrative_area_level_2")?.longText ??
    "";
  const country = get("country")?.shortText ?? "";
  const street = [route, streetNumber].filter(Boolean).join(" ").trim();
  return { street, postal, city, country };
}

export function PlacesAutocompleteInput(props: Props) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const sessionTokenRef = useRef<unknown>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const fetchSug = async (input: string) => {
    if (input.trim().length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    try {
      await loadGoogleMaps();
      const g = (window as unknown as {
        google: {
          maps: {
            importLibrary: (n: string) => Promise<{
              AutocompleteSuggestion: {
                fetchAutocompleteSuggestions: (req: unknown) => Promise<{
                  suggestions: Suggestion[];
                }>;
              };
              AutocompleteSessionToken: new () => unknown;
            }>;
          };
        };
      }).google;
      const { AutocompleteSuggestion, AutocompleteSessionToken } =
        await g.maps.importLibrary("places");
      if (!sessionTokenRef.current) {
        sessionTokenRef.current = new AutocompleteSessionToken();
      }
      const req: Record<string, unknown> = {
        input,
        sessionToken: sessionTokenRef.current,
        language: props.language ?? "nl",
      };
      if (props.includedPrimaryTypes?.length) {
        req.includedPrimaryTypes = props.includedPrimaryTypes;
      }
      if (props.includedRegionCodes?.length) {
        req.includedRegionCodes = props.includedRegionCodes;
      }
      const { suggestions: sug } =
        await AutocompleteSuggestion.fetchAutocompleteSuggestions(req);
      setSuggestions(sug ?? []);
      setOpen((sug ?? []).length > 0);
    } catch (err) {
      console.warn("[places] autocomplete failed", err);
    }
  };

  const onChangeInput = (v: string) => {
    props.onChange(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSug(v), 220);
  };

  const onPick = async (s: Suggestion) => {
    setOpen(false);
    const p = s.placePrediction;
    if (!p) return;
    try {
      const place = p.toPlace();
      await place.fetchFields({
        fields: ["displayName", "formattedAddress", "addressComponents"],
      });
      const parsed = parseAddressComponents(place.addressComponents ?? []);
      props.onPlaceSelected({
        name: place.displayName ?? p.mainText?.text ?? "",
        ...parsed,
      });
      sessionTokenRef.current = null;
    } catch (err) {
      console.warn("[places] fetchFields failed", err);
    }
  };

  const dropdownStyle: CSSProperties = {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    marginTop: 4,
    zIndex: 30,
    background: "var(--surface, #fff)",
    border: "1px solid rgba(0,0,0,0.12)",
    borderRadius: 10,
    boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
    listStyle: "none",
    padding: 4,
    margin: 0,
    maxHeight: 280,
    overflowY: "auto",
  };
  const itemStyle: CSSProperties = {
    padding: "8px 10px",
    borderRadius: 6,
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 14,
    lineHeight: 1.3,
  };
  const secStyle: CSSProperties = {
    fontSize: 12,
    color: "var(--text-muted, #666)",
    marginTop: 2,
  };

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <input
        id={props.id}
        className={props.className}
        placeholder={props.placeholder}
        value={props.value}
        onChange={(e) => onChangeInput(e.target.value)}
        onFocus={() => {
          if (suggestions.length) setOpen(true);
        }}
        autoComplete={props.autoComplete ?? "off"}
        required={props.required}
      />
      {open && suggestions.length > 0 && (
        <ul style={dropdownStyle} role="listbox">
          {suggestions.map((s, i) => {
            const p = s.placePrediction;
            if (!p) return null;
            const main = p.mainText?.text ?? p.text?.text ?? "";
            const sec = p.secondaryText?.text ?? "";
            return (
              <li
                key={i}
                role="option"
                aria-selected="false"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onPick(s);
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "rgba(0,0,0,0.04)")
                }
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                style={itemStyle}
              >
                <div>{main}</div>
                {sec && <div style={secStyle}>{sec}</div>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
