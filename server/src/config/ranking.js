const { DEFAULT_RANKING } = require('./env');

const toNumber = (value, defaultValue) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : defaultValue;
};

const bm25 = {
  k1: toNumber(process.env.BM25_K1, 1.5),
  b: toNumber(process.env.BM25_B, 0.75)
};

const tfidf = {
  smoothing: toNumber(process.env.TFIDF_SMOOTHING, 1),
  maxBoost: toNumber(process.env.TFIDF_MAX_BOOST, 3)
};

// Issue #4: Relevance filtering and quality signals
const relevance = {
  minMatchedTerms: toNumber(process.env.MIN_MATCHED_TERMS, 1), // Require at least 1 query term (lenient for single-term queries)
  minTermFrequency: toNumber(process.env.MIN_TERM_FREQUENCY, 1), // Each term must appear at least 1 time
  titleBoost: toNumber(process.env.TITLE_BOOST, 1.5), // Boost score if query terms in title
  minScore: toNumber(process.env.MIN_SCORE, 0.01) // Minimum score to be included in results (very lenient)
};

module.exports = {
  bm25,
  tfidf,
  relevance,
  defaultStrategy: DEFAULT_RANKING
};

