// utils.js
function cosineSimilarity(vecA, vecB) {
  let dot = 0;
  let normA = 0;
  let normB = 0;

  const terms = new Set([...Object.keys(vecA), ...Object.keys(vecB)]);
  for (let term of terms) {
    const a = vecA[term] || 0;
    const b = vecB[term] || 0;
    dot += a * b;
    normA += a * a;
    normB += b * b;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

module.exports = { cosineSimilarity };
