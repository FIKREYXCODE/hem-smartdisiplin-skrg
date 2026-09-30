export function positionTitle(value: unknown) {
  return String(value || "")
    .replace(/\s*[([\-–—/]?\s*\bDG\s*[-/]?\s*\d+[A-Z]?\b\s*[)\]]?/gi, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/\s*[\-–—/]\s*$/, "")
    .trim();
}
