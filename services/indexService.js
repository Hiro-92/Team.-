const crypto = require('crypto');
const repo = require('../models/repositories');
const { canonicalizeURL } = require('../utils/url');
const { tokenize, languageDetect, normalizeLanguageCode } = require('../utils/tokenizer');
const { signatureFromDoc } = require('../utils/deduplicate');
const { createDocument } = require('../domain/document');
const { ALLOWED_LANGUAGES } = require('../config/env');

const allowedLanguageSet = new Set(ALLOWED_LANGUAGES);

function computeDocId(canonicalUrl) {
  return crypto.createHash('sha1').update(canonicalUrl).digest('hex');
}

function buildFrequencies(tokens = []) {
  return tokens.reduce((acc, token) => {
    const normalized = token.toLowerCase();
    acc[normalized] = (acc[normalized] || 0) + 1;
    return acc;
  }, {});
}

async function indexDocument({
  url,
  title = '',
  text = '',
  links = [],
  language: languageHint
}) {
  const canonicalUrl = canonicalizeURL(url);
  if (!canonicalUrl) {
    throw new Error(`Invalid URL for indexing: ${url}`);
  }

  const hint = normalizeLanguageCode(languageHint);
  const detected = normalizeLanguageCode(languageDetect(text));
  const lang = hint && allowedLanguageSet.has(hint)
    ? hint
    : (detected && allowedLanguageSet.has(detected) ? detected : null);

  if (!lang) {
    return null;
  }

  const tokens = tokenize(text, lang);
  const tokenFrequencies = buildFrequencies(tokens);
  const docId = computeDocId(canonicalUrl);
  const signature = signatureFromDoc({ url: canonicalUrl, title });

  const document = createDocument({
    id: docId,
    url,
    canonicalUrl,
    title,
    text,
    lang,
    signature,
    tokens: tokenFrequencies,
    links
  });

  await repo.saveDocs([document]);

  const postings = Object.entries(tokenFrequencies).map(([token, termFrequency]) => ({
    token,
    docId,
    termFrequency,
    docLength: document.length
  }));

  if (postings.length > 0) {
    await repo.upsertIndex(postings);
  }

  return document;
}

module.exports = {
  indexDocument
};

