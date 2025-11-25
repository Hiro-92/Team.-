const crypto = require('crypto');

function signatureFromDoc(doc) {
  if (!doc) return null;
  const base = `${doc.url || ''}|${doc.title || ''}`.trim().toLowerCase();
  if (!base) return null;
  return crypto.createHash('sha1').update(base).digest('hex');
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
  signatureFromDoc
};

