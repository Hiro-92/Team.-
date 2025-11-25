const crypto = require('crypto');

/**
 * Issue #3 Fix: Content-based signature generation
 * Uses content hash instead of just URL+title to catch near-duplicates
 */
function signatureFromDoc(doc) {
  if (!doc) return null;

  // Use content for signature (more accurate than URL+title)
  // Take first 1000 chars to balance accuracy vs performance
  const content = doc.text || doc.title || doc.url || '';
  const normalized = content.slice(0, 1000).trim().toLowerCase()
    .replace(/\s+/g, ' '); // Normalize whitespace

  if (!normalized) return null;

  return crypto.createHash('sha1').update(normalized).digest('hex');
}

/**
 * Issue #3 Fix: Compute content similarity using Jaccard similarity
 * Returns similarity score between 0 (no similarity) and 1 (identical)
 */
function contentSimilarity(text1, text2) {
  if (!text1 || !text2) return 0;

  // Tokenize into words
  const tokens1 = new Set(text1.toLowerCase().split(/\s+/).filter(t => t.length > 2));
  const tokens2 = new Set(text2.toLowerCase().split(/\s+/).filter(t => t.length > 2));

  if (tokens1.size === 0 || tokens2.size === 0) return 0;

  // Jaccard similarity: intersection / union
  const intersection = new Set([...tokens1].filter(t => tokens2.has(t)));
  const union = new Set([...tokens1, ...tokens2]);

  return intersection.size / union.size;
}

/**
 * Check if document is near-duplicate based on content similarity
 * Returns true if similarity > threshold (default 90%)
 */
function isNearDuplicate(doc1, doc2, threshold = 0.9) {
  if (!doc1 || !doc2) return false;

  // Quick check: if URLs are same (after canonicalization), it's a duplicate
  if (doc1.canonicalUrl && doc2.canonicalUrl &&
      doc1.canonicalUrl === doc2.canonicalUrl) {
    return true;
  }

  // Content similarity check
  const text1 = (doc1.text || '').slice(0, 2000); // Sample first 2000 chars
  const text2 = (doc2.text || '').slice(0, 2000);

  const similarity = contentSimilarity(text1, text2);

  return similarity >= threshold;
}

function deduplicate(documents = []) {
  const unique = [];
  const duplicates = [];
  const seen = new Set();

  documents.forEach((doc) => {
    const sig = signatureFromDoc(doc);
    if (!sig) {
      unique.push(doc);
      return;
    }

    if (seen.has(sig)) {
      duplicates.push(doc);
    } else {
      seen.add(sig);
      unique.push({ ...doc, signature: sig });
    }
  });

  return { unique, duplicates };
}

module.exports = {
  deduplicate,
  signatureFromDoc,
  contentSimilarity,
  isNearDuplicate
};

