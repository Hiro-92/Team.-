const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const DOCUMENTS_JSON = path.join(DATA_DIR, 'documents.json');
const DOCUMENTS_CSV = path.join(DATA_DIR, 'documents.csv');
const INDEX_JSON = path.join(DATA_DIR, 'index.json');
const INDEX_CSV = path.join(DATA_DIR, 'index.csv');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function writeJSON(filePath, payload) {
  ensureDataDir();
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf-8');
}

function escapeCSV(value) {
  if (value === null || value === undefined) {
    return '';
  }
  const str = String(value);
  if (str.includes('"') || str.includes(',') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function writeCSV(filePath, headers, rows) {
  ensureDataDir();
  const csvLines = [
    headers.map(escapeCSV).join(','),
    ...rows.map((row) => row.map(escapeCSV).join(','))
  ];
  fs.writeFileSync(filePath, csvLines.join('\n'), 'utf-8');
}

function normalizeDocuments(documents) {
  if (!documents) return [];
  if (documents instanceof Map) {
    return Array.from(documents.values());
  }
  if (Array.isArray(documents)) {
    return documents;
  }
  return Object.values(documents);
}

function normalizeIndex(invertedIndex) {
  if (!invertedIndex) return [];

  if (invertedIndex instanceof Map) {
    return Array.from(invertedIndex.entries()).map(([token, entry]) => {
      const postingsMap = entry.postings instanceof Map
        ? entry.postings
        : new Map(Object.entries(entry.postings || {}));
      return {
        token,
        df: entry.df || postingsMap.size,
        postings: Array.from(postingsMap.entries()).map(([docId, payload]) => ({
          docId,
          termFrequency: payload.termFrequency,
          docLength: payload.docLength
        }))
      };
    });
  }

  return Object.entries(invertedIndex).map(([token, entry]) => ({
    token,
    df: entry.df || Object.keys(entry.postings || {}).length,
    postings: Object.entries(entry.postings || {}).map(([docId, payload]) => ({
      docId,
      termFrequency: payload.termFrequency,
      docLength: payload.docLength
    }))
  }));
}

function exportData({ documents, invertedIndex }) {
  const docs = normalizeDocuments(documents);
  const indexEntries = normalizeIndex(invertedIndex);

  writeJSON(DOCUMENTS_JSON, docs);
  writeJSON(INDEX_JSON, indexEntries);

  const documentRows = docs.map((doc) => [
    doc.id,
    doc.url,
    doc.canonicalUrl,
    doc.title,
    doc.lang || doc.language || '',
    doc.length || 0,
    doc.fetchedAt || ''
  ]);
  writeCSV(
    DOCUMENTS_CSV,
    ['id', 'url', 'canonicalUrl', 'title', 'lang', 'length', 'fetchedAt'],
    documentRows
  );

  const indexRows = indexEntries.flatMap((entry) =>
    entry.postings.map((posting) => [
      entry.token,
      posting.docId,
      posting.termFrequency,
      posting.docLength
    ])
  );
  writeCSV(
    INDEX_CSV,
    ['token', 'docId', 'termFrequency', 'docLength'],
    indexRows
  );
}

module.exports = {
  exportData
};

