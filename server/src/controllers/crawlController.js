const crawlingConfig = require('../config/crawling');
const crawlService = require('../services/crawlService');

async function crawl(req, res, next) {
  try {
    const { seeds, depth, maxPages, obeyRobots } = req.body || {};

    if (!Array.isArray(seeds) || seeds.length === 0) {
      return res.status(400).json({
        error: {
          message: 'Seeds array is required',
          code: 'BAD_REQUEST'
        }
      });
    }

    const summary = await crawlService.crawl({
      seeds,
      depth: depth ?? crawlingConfig.maxDepth,
      maxPages: maxPages ?? crawlingConfig.maxPages,
      obeyRobots: obeyRobots ?? crawlingConfig.obeyRobots
    });

    return res.status(200).json(summary);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  crawl
};

