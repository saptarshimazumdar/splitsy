const round = (num, precision = 2) => {
    const factor = Math.pow(10, precision);
    return Math.round((num + Number.EPSILON) * factor) / factor;
}

const validEmpty = (arr) => arr?.length ? arr : undefined;

const toPaise = (amount) => Math.round(Number(amount) * 100);

// Shares add up to the total exactly; the first (total % n) shares get one extra paisa
const splitPaise = (total, n) => {
    if (!n) return [];
    const base = Math.floor(total / n);
    const extra = total - base * n;
    return Array.from({ length: n }, (_, idx) => base + (idx < extra ? 1 : 0));
}

const formatPaise = (paise) => Number((paise / 100).toFixed(2));

// crypto.randomUUID is unavailable on non-secure origins
const newId = () => globalThis.crypto?.randomUUID?.()
    ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

const escapeHtml = (text) => String(text).replace(/[&<>"']/g, ch =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);

const replaceLastOccurrence = (str, find, replace) => {
  const lastIndex = str.lastIndexOf(find); // Find the index of the last match
  
  if (lastIndex === -1) { // If no match is found, return the original string
    return str;
  }
  
  // Rebuild the string: part before the match + replacement + part after the match
  return str.slice(0, lastIndex) + replace + str.slice(lastIndex + find.length);
}