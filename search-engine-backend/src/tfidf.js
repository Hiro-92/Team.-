// tfidf.js
function getVocabulary(documents) {
  const vocabSet = new Set();
  documents.forEach((doc) => {
    doc.tokens.forEach((t) => vocabSet.add(t));
  });
  return Array.from(vocabSet);
}

function computeTFIDF(documents, vocabulary) {
  const N = documents.length;
  const df = {};
  const tfidfMap = {};
  const idfMap = {};

  // Document Frequency 계산
  vocabulary.forEach((term) => {
    df[term] = documents.filter((doc) => doc.tokens.includes(term)).length;
    idfMap[term] = Math.log((N + 1) / (df[term] + 1)) + 1; // smoothing
  });

  // 각 문서에 대해 TF-IDF 계산
  documents.forEach((doc) => {
    const tfidf = {};
    const tokenCount = doc.tokens.length;
    vocabulary.forEach((term) => {
      const tf = doc.tokens.filter((w) => w === term).length / tokenCount;
      tfidf[term] = tf * idfMap[term];
    });
    tfidfMap[doc.id] = tfidf;
  });

  return { docTFIDF: tfidfMap, idfMap };
}

function getDocumentVectors(documents) {
  return documents.map((doc) => doc.tfidf);
}

module.exports = { getVocabulary, computeTFIDF, getDocumentVectors };
