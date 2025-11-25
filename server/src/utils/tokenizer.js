const stopwordsEn = new Set([
  'the', 'is', 'at', 'of', 'on', 'and', 'a', 'to', 'in', 'for', 'with', 'that', 'this', 'it'
]);

const stopwordsKo = new Set([
  '그리고', '그', '이', '저', '것', '수', '등', '들', '에서', '하다', '하다가'
]);

const hangulRegex = /[\uAC00-\uD7AF]+/g;
const alphaNumRegex = /[a-z0-9]+/g;

function normalizeLanguageCode(code) {
  if (typeof code !== 'string') {
    return null;
  }

  const cleaned = code
    .trim()
    .toLowerCase()
    .replace('_', '-');

  if (!cleaned) {
    return null;
  }

  const [primary] = cleaned.split('-');
  if (primary && primary.length === 2) {
    return primary;
  }

  return null;
}

function languageDetect(text = '') {
  if (typeof text !== 'string' || text.length === 0) {
    return 'unknown';
  }

  const hangulMatches = text.match(hangulRegex);
  if (hangulMatches && hangulMatches.join('').length > text.length * 0.2) {
    return 'ko';
  }

  return 'en';
}

function tokenize(text = '', langHint) {
  if (typeof text !== 'string' || text.length === 0) {
    return [];
  }

  const normalizedLang = normalizeLanguageCode(langHint);
  const lang = normalizedLang || languageDetect(text);
  const lower = text.toLowerCase();
  let tokens = [];

  if (lang === 'ko') {
    const matches = lower.match(hangulRegex);
    if (matches) {
      tokens = matches.flatMap((word) => word.split(/[\s.,!?\"'“”‘’()]+/g));
    }
  } else {
    const matches = lower.match(alphaNumRegex);
    if (matches) {
      tokens = matches;
    }
  }

  if (tokens.length === 0) {
    tokens = lower.split(/\s+/g);
  }

  const stopwords = lang === 'ko' ? stopwordsKo : stopwordsEn;

  return tokens
    .map((token) => token.trim())
    .filter((token) => token.length > 1 && !stopwords.has(token));
}

module.exports = {
  tokenize,
  languageDetect,
  normalizeLanguageCode
};

