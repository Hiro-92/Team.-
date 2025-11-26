/**
 * Issue #6: Simplified PageRank Implementation
 *
 * PageRank calculates document importance based on incoming links.
 * Higher-quality pages tend to link to other high-quality pages.
 *
 * Algorithm:
 * PR(A) = (1-d) + d * Σ(PR(Ti)/C(Ti))
 * where:
 * - d = damping factor (0.85)
 * - Ti = pages linking to page A
 * - C(Ti) = number of outbound links from page Ti
 *
 * Reference: "The Anatomy of a Large-Scale Hypertextual Web Search Engine"
 * (Brin & Page, 1998)
 */

const repo = require('../models/repositories');
const { canonicalizeURL } = require('../utils/url');

/**
 * Build link graph from crawled documents
 * Returns: { inlinks: Map<docId, Set<docId>>, outlinks: Map<docId, number> }
 */
function buildLinkGraph(documents) {
  const inlinks = new Map();  // docId -> Set of docIds linking TO it
  const outlinks = new Map(); // docId -> count of links FROM it
  const urlToDocId = new Map(); // url -> docId mapping

  // First pass: Build URL to docId mapping
  documents.forEach((doc, docId) => {
    inlinks.set(docId, new Set());
    urlToDocId.set(doc.canonicalUrl, docId);
  });

  // Second pass: Build link graph
  documents.forEach((doc, docId) => {
    const outboundLinks = new Set();

    doc.links.forEach(link => {
      const canonical = canonicalizeURL(link);
      if (!canonical) return;

      const targetDocId = urlToDocId.get(canonical);
      if (targetDocId && targetDocId !== docId) {
        // Found a link to another indexed document
        outboundLinks.add(targetDocId);
        inlinks.get(targetDocId).add(docId);
      }
    });

    outlinks.set(docId, outboundLinks.size);
  });

  return { inlinks, outlinks, urlToDocId };
}

/**
 * Calculate PageRank scores using power iteration method
 *
 * @param {Map} documents - Map of docId -> document
 * @param {number} dampingFactor - Usually 0.85
 * @param {number} maxIterations - Stop after this many iterations
 * @param {number} convergenceThreshold - Stop when change < threshold
 * @returns {Map} docId -> PageRank score
 */
function calculatePageRank(
  documents,
  dampingFactor = 0.85,
  maxIterations = 20,
  convergenceThreshold = 0.0001
) {
  const numDocs = documents.size;
  if (numDocs === 0) {
    return new Map();
  }

  const { inlinks, outlinks } = buildLinkGraph(documents);

  // Initialize: all pages start with equal rank
  const ranks = new Map();
  const initialRank = 1.0 / numDocs;
  documents.forEach((_, docId) => {
    ranks.set(docId, initialRank);
  });

  // Power iteration
  let iteration = 0;
  let converged = false;

  while (iteration < maxIterations && !converged) {
    const newRanks = new Map();
    let maxChange = 0;

    documents.forEach((_, docId) => {
      // Calculate rank from incoming links
      let rankSum = 0;
      const incomingLinks = inlinks.get(docId);

      incomingLinks.forEach(sourceDocId => {
        const sourceRank = ranks.get(sourceDocId);
        const sourceOutlinks = outlinks.get(sourceDocId);

        if (sourceOutlinks > 0) {
          rankSum += sourceRank / sourceOutlinks;
        }
      });

      // Apply PageRank formula: PR(A) = (1-d) + d * Σ(PR(Ti)/C(Ti))
      const newRank = (1 - dampingFactor) + dampingFactor * rankSum;
      newRanks.set(docId, newRank);

      // Track convergence
      const change = Math.abs(newRank - ranks.get(docId));
      maxChange = Math.max(maxChange, change);
    });

    // Update ranks
    newRanks.forEach((rank, docId) => {
      ranks.set(docId, rank);
    });

    // Check convergence
    if (maxChange < convergenceThreshold) {
      converged = true;
    }

    iteration++;
  }

  // Normalize scores to [0, 1] range for easier interpretation
  const maxRank = Math.max(...Array.from(ranks.values()));
  const minRank = Math.min(...Array.from(ranks.values()));
  const range = maxRank - minRank;

  if (range > 0) {
    ranks.forEach((rank, docId) => {
      const normalized = (rank - minRank) / range;
      ranks.set(docId, normalized);
    });
  }

  return ranks;
}

/**
 * Compute and cache PageRank scores for all documents in the index
 * Returns: { ranks: Map<docId, score>, stats: { iterations, converged, etc } }
 */
async function computePageRank(options = {}) {
  const {
    dampingFactor = 0.85,
    maxIterations = 20,
    convergenceThreshold = 0.0001
  } = options;

  const stats = await repo.stats();
  if (stats.totalDocs === 0) {
    return {
      ranks: new Map(),
      stats: { totalDocs: 0, iterations: 0, converged: true }
    };
  }

  // Get all documents (assumes InMemoryRepo exposes documents Map)
  const documents = repo.documents || new Map();

  const startTime = Date.now();
  const ranks = calculatePageRank(
    documents,
    dampingFactor,
    maxIterations,
    convergenceThreshold
  );
  const elapsed = Date.now() - startTime;

  // Calculate statistics
  const rankValues = Array.from(ranks.values());
  const avgRank = rankValues.reduce((a, b) => a + b, 0) / rankValues.length;
  const maxRank = Math.max(...rankValues);
  const minRank = Math.min(...rankValues);

  return {
    ranks,
    stats: {
      totalDocs: stats.totalDocs,
      iterations: maxIterations,
      converged: true,
      elapsed,
      avgRank,
      maxRank,
      minRank
    }
  };
}

module.exports = {
  calculatePageRank,
  computePageRank,
  buildLinkGraph
};
