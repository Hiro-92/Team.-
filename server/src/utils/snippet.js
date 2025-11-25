const escapeRegExp = (token) =>
  token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function createSnippet(text = '', tokens = [], length = 160) {
  if (!text) return '';
  if (!Array.isArray(tokens) || tokens.length === 0) {
    return text.slice(0, length);
  }

  const lowerText = text.toLowerCase();
  const lowerTokens = tokens.map((t) => t.toLowerCase());

  let start = 0;
  let firstMatchIndex = -1;

  for (const token of lowerTokens) {
    const idx = lowerText.indexOf(token);
    if (idx !== -1 && (firstMatchIndex === -1 || idx < firstMatchIndex)) {
      firstMatchIndex = idx;
    }
  }

  if (firstMatchIndex > length / 3) {
    start = Math.max(0, firstMatchIndex - Math.floor(length / 3));
  }

  let snippet = text.slice(start, start + length);
  if (start > 0) {
    snippet = `…${snippet}`;
  }
  if (start + length < text.length) {
    snippet = `${snippet}…`;
  }

  const escapedTokens = lowerTokens.filter(Boolean).map((token) => escapeRegExp(token));
  if (escapedTokens.length === 0) {
    return snippet;
  }

  const highlightRegex = new RegExp(`(${escapedTokens.join('|')})`, 'gi');

  return snippet.replace(highlightRegex, '<em>$1</em>');
}

module.exports = {
  createSnippet
};

