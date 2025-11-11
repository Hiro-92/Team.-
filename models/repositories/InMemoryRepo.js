const Repository = require('./Repository');
const { exportData } = require('../../utils/dataExporter');

class InMemoryRepo extends Repository {
  constructor() {
    super();
    this.documents = new Map();
    this.invertedIndex = new Map();
    this.totalDocLength = 0;
  }

  async saveDocs(docs = []) {
    docs.forEach((doc) => {
      const existing = this.documents.get(doc.id);
      if (existing) {
        this.totalDocLength -= existing.length || 0;
      }

      this.documents.set(doc.id, doc);
      this.totalDocLength += doc.length || 0;
    });

    exportData({
      documents: this.documents,
      invertedIndex: this.invertedIndex
    });

    return docs;
  }

  async getById(id) {
    return this.documents.get(id) || null;
  }

  async upsertIndex(postings = []) {
    postings.forEach((posting) => {
      const { token, docId, termFrequency, docLength } = posting;
      if (!token || !docId) return;

      const normalized = token.toLowerCase();

      if (!this.invertedIndex.has(normalized)) {
        this.invertedIndex.set(normalized, { df: 0, postings: new Map() });
      }

      const indexEntry = this.invertedIndex.get(normalized);
      if (!indexEntry.postings.has(docId)) {
        indexEntry.df += 1;
      }

      indexEntry.postings.set(docId, {
        termFrequency,
        docLength
      });
    });

    exportData({
      documents: this.documents,
      invertedIndex: this.invertedIndex
    });
  }

  async searchTokens(tokens = []) {
    const result = new Map();
    tokens.forEach((token) => {
      const normalized = token.toLowerCase();
      if (this.invertedIndex.has(normalized)) {
        const { df, postings } = this.invertedIndex.get(normalized);
        result.set(normalized, {
          df,
          postings: Array.from(postings.entries()).map(([docId, payload]) => ({
            docId,
            termFrequency: payload.termFrequency,
            docLength: payload.docLength
          }))
        });
      }
    });
    return result;
  }

  async stats() {
    const totalDocs = this.documents.size;
    return {
      totalDocs,
      avgDocLength: totalDocs === 0 ? 0 : this.totalDocLength / totalDocs
    };
  }

  async clear() {
    this.documents.clear();
    this.invertedIndex.clear();
    this.totalDocLength = 0;

    exportData({
      documents: this.documents,
      invertedIndex: this.invertedIndex
    });
  }
}

const instance = new InMemoryRepo();

module.exports = instance;
module.exports.InMemoryRepo = InMemoryRepo;

