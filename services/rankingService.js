const { bm25, tfidf, defaultStrategy } = require('../config/ranking');

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

function bm25Score({ termFrequency, docLength, df, stats }) {
  const { totalDocs, avgDocLength } = stats;
  if (totalDocs === 0 || avgDocLength === 0) {
    return 0;
  }

  const idf = Math.log((totalDocs - df + 0.5) / (df + 0.5) + 1);
  const numerator = termFrequency * (bm25.k1 + 1);
  const denominator =
    termFrequency + bm25.k1 * (1 - bm25.b + (bm25.b * docLength) / avgDocLength);

  return idf * (denominator === 0 ? 0 : numerator / denominator);
}

function tfIdfScore({ termFrequency, df, stats }) {
  const { totalDocs } = stats;
  if (totalDocs === 0) return 0;
  const tfWeight = 1 + Math.log(termFrequency);
  const idf = Math.log((totalDocs + tfidf.smoothing) / (df + tfidf.smoothing));
  const score = tfWeight * idf;
  return clamp(score, 0, tfidf.maxBoost);
}

function rank(queryTokens = [], docVectors = {}, strategy = defaultStrategy) {
  const { documents, docFrequency, stats } = docVectors;
  if (!documents || documents.size === 0) {
    return [];
  }

  const scoringFn = strategy === 'tfidf' ? tfIdfScore : bm25Score;
  const uniqueTokens = Array.from(new Set(queryTokens.map((token) => token.toLowerCase())));

  const results = [];

  documents.forEach((vector, docId) => {
    let score = 0;
    const matchedTokens = [];

    uniqueTokens.forEach((token) => {
      const df = docFrequency.get(token) || 0;
      const termFrequency = vector.termFrequencies[token];
      if (!termFrequency || df === 0) return;

      score += scoringFn({
        termFrequency,
        docLength: vector.docLength,
        df,
        stats
      });
      matchedTokens.push(token);
    });

    if (score > 0) {
      results.push({
        docId,
        score,
        tokens: matchedTokens,
        document: vector.document
      });
    }
  });

  return results.sort((a, b) => b.score - a.score);
}

module.exports = {
  rank
};

