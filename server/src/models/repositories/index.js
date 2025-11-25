require('../../config/env');

const repo = process.env.USE_REPO === 'file'
  ? require('./FileRepo')
  : require('./InMemoryRepo');

module.exports = repo;