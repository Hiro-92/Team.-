class Repository {
  async saveDocs() {
    throw new Error('saveDocs not implemented');
  }

  async getById() {
    throw new Error('getById not implemented');
  }

  async searchTokens() {
    throw new Error('searchTokens not implemented');
  }

  async upsertIndex() {
    throw new Error('upsertIndex not implemented');
  }

  async stats() {
    throw new Error('stats not implemented');
  }

  async clear() {
    throw new Error('clear not implemented');
  }
}

module.exports = Repository;

