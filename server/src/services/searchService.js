const repo = require('../models/repositories');
const { tokenize, normalizeLanguageCode } = require('../utils/tokenizer');
const { createSnippet } = require('../utils/snippet');
const { PAGE_SIZE, ALLOWED_LANGUAGES } = require('../config/env');
const { rank } = require('./rankingService');

async function fetchDocuments(docIds = []) {
  const results = new Map();
  for (const docId of docIds) {
    const document = await repo.getById(docId);
    if (document) {
      results.set(docId, document);
    }
  }
  return results;
}

function paginate(items, page, size) {
  const start = (page - 1) * size;
  const end = start + size;
  return items.slice(start, end);
}

async function search(query, options = {}) {
  const strategy = (options.strategy || '').toLowerCase() || undefined;
  const page = Number(options.page) > 0 ? Number(options.page) : 1;
  const size = Number(options.size) > 0 ? Number(options.size) : PAGE_SIZE;
  const fallbackLang = ALLOWED_LANGUAGES[0] || 'en';
  const requestedLang = normalizeLanguageCode(options.lang);
  const lang = requestedLang && ALLOWED_LANGUAGES.includes(requestedLang)
    ? requestedLang
    : fallbackLang;

  const queryTokens = tokenize(query || '', lang);
  if (queryTokens.length === 0) {
    return {
      total: 0,
      page,
      size,
      items: [],
      lang
    };
  }

  const postingsMap = await repo.searchTokens(queryTokens);
  if (!postingsMap || postingsMap.size === 0) {
    return {
      total: 0,
      page,
      size,
      items: [],
      lang
    };
  }

  const docAccum = new Map();
  const docIds = new Set();

  postingsMap.forEach((entry, token) => {
    entry.postings.forEach((posting) => {
      docIds.add(posting.docId);
      if (!docAccum.has(posting.docId)) {
        docAccum.set(posting.docId, {
          docLength: posting.docLength,
          termFrequencies: {}
        });
      }
      const aggregate = docAccum.get(posting.docId);
      aggregate.termFrequencies[token] = posting.termFrequency;
      aggregate.docLength = posting.docLength;
    });
  });

  const documents = await fetchDocuments(Array.from(docIds));
  const docFrequency = new Map();
  let totalDocLength = 0;

  for (const [docId, aggregate] of docAccum.entries()) {
    const document = documents.get(docId);
    if (!document || document.lang !== lang) {
      docAccum.delete(docId);
      continue;
    }

    aggregate.document = document;
    totalDocLength += aggregate.docLength;

    Object.keys(aggregate.termFrequencies).forEach((token) => {
      docFrequency.set(token, (docFrequency.get(token) || 0) + 1);
    });
  }

  if (docAccum.size === 0) {
    return {
      total: 0,
      page,
      size,
      items: [],
      lang
    };
  }

  const stats = {
    totalDocs: docAccum.size,
    avgDocLength: totalDocLength === 0 ? 0 : totalDocLength / docAccum.size
  };

  const ranked = await rank(queryTokens, {
    documents: docAccum,
    docFrequency,
    stats
  }, strategy, options);

  const total = ranked.length;
  const paginated = paginate(ranked, page, size);

  const items = paginated.map((entry) => {
    const { document, score, tokens, pagerank: prScore } = entry;
    const snippet = createSnippet(document.text, queryTokens);
    return {
      url: document.url,
      title: document.title,
      snippet,
      score,
      pagerank: prScore,
      highlights: tokens,
      lang: document.lang
    };
  });

  return {
    total,
    page,
    size,
    items,
    lang
  };
}

module.exports = {
  search
};

