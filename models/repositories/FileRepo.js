const fs = require('fs');
const path = require('path');
const Repository = require('./Repository');
const { exportData } = require('../../utils/dataExporter');

class FileRepo extends Repository {
  constructor(options = {}) {
    super();
    this.filePath =
      options.filePath ||
      path.join(process.cwd(), 'data', 'store.json');
    this.store = {
      documents: {},
      invertedIndex: {},
      totalDocLength: 0
    };

    this._load();
  }

  _load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        if (raw) {
          this.store = JSON.parse(raw);
        }
      } else {
        this._persist();
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('Failed to load repository store, starting fresh.', err);
      this.store = {
        documents: {},
        invertedIndex: {},
        totalDocLength: 0
      };
    }
  }

  _persist() {
    const directory = path.dirname(this.filePath);
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
    }
    fs.writeFileSync(this.filePath, JSON.stringify(this.store, null, 2), 'utf-8');
    exportData({
      documents: this.store.documents,
      invertedIndex: this.store.invertedIndex
    });
  }

  async saveDocs(docs = []) {
    docs.forEach((doc) => {
      const existing = this.store.documents[doc.id];
      if (existing) {
        this.store.totalDocLength -= existing.length || 0;
      }
      this.store.documents[doc.id] = doc;
      this.store.totalDocLength += doc.length || 0;
    });
    this._persist();
    return docs;
  }

  async getById(id) {
    return this.store.documents[id] || null;
  }

  async upsertIndex(postings = []) {
    postings.forEach((posting) => {
      const { token, docId, termFrequency, docLength } = posting;
      if (!token || !docId) return;

      const normalized = token.toLowerCase();
      if (!this.store.invertedIndex[normalized]) {
        this.store.invertedIndex[normalized] = {
          df: 0,
          postings: {}
        };
      }

      const indexEntry = this.store.invertedIndex[normalized];
      if (!indexEntry.postings[docId]) {
        indexEntry.df += 1;
      }

      indexEntry.postings[docId] = {
        termFrequency,
        docLength
      };
    });

    this._persist();
  }

  async searchTokens(tokens = []) {
    const result = new Map();
    tokens.forEach((token) => {
      const normalized = token.toLowerCase();
      const entry = this.store.invertedIndex[normalized];
      if (entry) {
        result.set(normalized, {
          df: entry.df,
          postings: Object.entries(entry.postings).map(([docId, payload]) => ({
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
    const documentsCount = Object.keys(this.store.documents).length;
    return {
      totalDocs: documentsCount,
      avgDocLength: documentsCount === 0 ? 0 : this.store.totalDocLength / documentsCount
    };
  }

  async clear() {
    this.store = {
      documents: {},
      invertedIndex: {},
      totalDocLength: 0
    };
    this._persist();
  }
}

const instance = new FileRepo();

module.exports = instance;
module.exports.FileRepo = FileRepo;

