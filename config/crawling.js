const parseBoolean = (value, defaultValue) => {
  if (value === undefined) return defaultValue;
  return ['true', '1', 'yes'].includes(String(value).toLowerCase());
};

const toNumber = (value, defaultValue) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : defaultValue;
};

module.exports = {
  maxDepth: toNumber(process.env.CRAWL_MAX_DEPTH, 2),
  maxPages: toNumber(process.env.CRAWL_MAX_PAGES, 50),
  userAgent: process.env.CRAWL_USER_AGENT || 'SearchEngineRebuildBot/0.1',
  obeyRobots: parseBoolean(process.env.CRAWL_OBEY_ROBOTS, true)
};

