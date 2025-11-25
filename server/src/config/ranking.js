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

module.exports = {
  bm25,
  tfidf,
  defaultStrategy: DEFAULT_RANKING
};

