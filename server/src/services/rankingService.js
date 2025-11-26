const { bm25, tfidf, relevance, pagerank, defaultStrategy } = require('../config/ranking');
const { computePageRank } = require('./pagerankService');

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

/**
 * Issue #4 Fix: Enhanced ranking with quality filters
 * Issue #6 Fix: PageRank boost for authority signals
 * - Minimum matched terms requirement
 * - Minimum term frequency threshold
 * - Title boost for query term matches
 * - Minimum score threshold
 * - PageRank boost for authoritative documents
 */
async function rank(queryTokens = [], docVectors = {}, strategy = defaultStrategy, options = {}) {
  const { documents, docFrequency, stats } = docVectors;
  if (!documents || documents.size === 0) {
    return [];
  }

  const scoringFn = strategy === 'tfidf' ? tfIdfScore : bm25Score;
  const uniqueTokens = Array.from(new Set(queryTokens.map((token) => token.toLowerCase())));

  // Issue #6: Compute PageRank if enabled
  let pagerankScores = new Map();
  if (pagerank.enabled && !options.skipPageRank) {
    const result = await computePageRank({
      dampingFactor: pagerank.dampingFactor,
      maxIterations: pagerank.maxIterations,
      convergenceThreshold: pagerank.convergenceThreshold
    });
    pagerankScores = result.ranks;
  }

  const results = [];

  documents.forEach((vector, docId) => {
    let score = 0;
    const matchedTokens = [];
    let totalTermFrequency = 0;

    uniqueTokens.forEach((token) => {
      const df = docFrequency.get(token) || 0;
      const termFrequency = vector.termFrequencies[token];
      if (!termFrequency || df === 0) return;

      // Issue #4: Check minimum term frequency (only for multi-term queries)
      if (uniqueTokens.length > 1 && termFrequency < relevance.minTermFrequency) {
        return; // Skip terms that appear too infrequently
      }

      score += scoringFn({
        termFrequency,
        docLength: vector.docLength,
        df,
        stats
      });
      matchedTokens.push(token);
      totalTermFrequency += termFrequency;
    });

    // Issue #4: Filter 1 - Require minimum matched terms (only for multi-term queries)
    if (uniqueTokens.length >= relevance.minMatchedTerms && matchedTokens.length < relevance.minMatchedTerms) {
      return; // Skip if not enough query terms matched
    }

    // Issue #4: Filter 2 - Require minimum score
    if (score < relevance.minScore) {
      return; // Skip low-scoring documents
    }

    // Issue #4: Quality Signal - Title boost
    if (vector.document && vector.document.title) {
      const titleLower = vector.document.title.toLowerCase();
      const titleMatches = matchedTokens.filter(token => titleLower.includes(token));
      if (titleMatches.length > 0) {
        // Boost score if query terms appear in title
        score *= relevance.titleBoost;
      }
    }

    // Issue #6: Quality Signal - PageRank boost
    if (pagerank.enabled && pagerankScores.has(docId)) {
      const prScore = pagerankScores.get(docId);
      // Apply PageRank boost: higher PR = higher boost (1.0 to pagerank.boost)
      const prBoost = 1.0 + (prScore * (pagerank.boost - 1.0));
      score *= prBoost;
    }

    if (score > 0) {
      results.push({
        docId,
        score,
        tokens: matchedTokens,
        matchedTermCount: matchedTokens.length,
        totalTermFrequency,
        pagerank: pagerankScores.get(docId) || 0,
        document: vector.document
      });
    }
  });

  return results.sort((a, b) => b.score - a.score);
}

module.exports = {
  rank
};

