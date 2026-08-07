// Temporary WhatsApp number switch until 16 August 2026.
// After the cutoff the default (+32 471 60 15 73) is used again.
const DEFAULT_NUMBER = "32471601573";
const TEMP_NUMBER = "324759988969";

function isTempNumberActive(): boolean {
  // Cutoff: 2026-08-17 00:00:00 UTC, i.e. "tot en met 16 augustus".
  const now = new Date();
  const cutoff = new Date("2026-08-17T00:00:00.000Z");
  return now < cutoff;
}

export function getWhatsAppNumber(): string {
  return isTempNumberActive() ? TEMP_NUMBER : DEFAULT_NUMBER;
}

export function getWhatsAppDisplayNumber(): string {
  const digits = getWhatsAppNumber();
  return `+${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 7)} ${digits.slice(7, 9)} ${digits.slice(9)}`;
}
