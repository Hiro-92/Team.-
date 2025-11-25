const { DEFAULT_RANKING } = require('../config/env');
const searchService = require('../services/searchService');

async function search(req, res, next) {
  try {
    const { query, strategy, page, size, lang } = req.query;
    if (!query || query.trim().length === 0) {
      return res.status(400).json({
        error: {
          message: 'Query parameter is required',
          code: 'BAD_REQUEST'
        }
      });
    }

    const results = await searchService.search(query, {
      strategy: strategy || DEFAULT_RANKING,
      page,
      size,
      lang
    });

    return res.json(results);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  search
};

