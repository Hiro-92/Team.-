const axios = require('axios');
const cheerio = require('cheerio');
const { canonicalizeURL } = require('../utils/url');
const { indexDocument } = require('./indexService');
const { signatureFromDoc } = require('../utils/deduplicate');
const { normalizeLanguageCode } = require('../utils/tokenizer');
const crawlingConfig = require('../config/crawling');

const robotsCache = new Map();

async function fetchRobots(origin, userAgent) {
  if (robotsCache.has(origin)) {
    return robotsCache.get(origin);
  }

  try {
    const response = await axios.get(`${origin}/robots.txt`, {
      timeout: 5000,
      headers: {
        'User-Agent': userAgent
      }
    });

    const rules = parseRobots(response.data);
    robotsCache.set(origin, rules);
    return rules;
  } catch (err) {
    robotsCache.set(origin, { disallow: [] });
    return robotsCache.get(origin);
  }
}

function parseRobots(content = '') {
  const disallow = [];
  const lines = content.split(/\r?\n/);
  let applies = false;

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      return;
    }
    const [directiveRaw, valueRaw] = trimmed.split(':', 2);
    if (!directiveRaw || !valueRaw) return;

    const directive = directiveRaw.toLowerCase();
    const value = valueRaw.trim();

    if (directive === 'user-agent') {
      applies = value === '*' || value.toLowerCase().includes('searchenginerebuildbot');
    } else if (applies && directive === 'disallow' && value) {
      disallow.push(value);
    }
  });

  return { disallow };
}

async function isAllowed(url, obeyRobots, userAgent) {
  if (!obeyRobots) return true;

  try {
    const parsedUrl = new URL(url);
    const origin = `${parsedUrl.protocol}//${parsedUrl.host}`;
    const robots = await fetchRobots(origin, userAgent);
    return !robots.disallow.some((rule) => {
      if (!rule || rule === '/') return true;
      if (rule === '') return false;
      return parsedUrl.pathname.startsWith(rule);
    });
  } catch (err) {
    return false;
  }
}

function extractContent(html, url) {
  const $ = cheerio.load(html);
  const title = $('title').first().text().trim() || url;
  const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
  const links = [];
  const htmlLang = normalizeLanguageCode($('html').attr('lang') || $('html').attr('xml:lang'));

  $('a[href]').each((_, element) => {
    const href = $(element).attr('href');
    if (!href) return;
    try {
      const absolute = new URL(href, url).toString();
      const canonical = canonicalizeURL(absolute);
      if (canonical) {
        links.push(canonical);
      }
    } catch (err) {
      // ignore malformed links
    }
  });

  return { title, text: bodyText, links, lang: htmlLang };
}

async function crawl({
  seeds = [],
  depth = crawlingConfig.maxDepth,
  maxPages = crawlingConfig.maxPages,
  obeyRobots = crawlingConfig.obeyRobots,
  userAgent = crawlingConfig.userAgent
}) {
  const queue = [];
  const visited = new Set();
  const signatures = new Set();
  const crawledDocs = [];
  const summary = {
    crawled: 0,
    skipped: {
      invalid: 0,
      robots: 0,
      duplicates: 0,
      visited: 0,
      errors: 0,
      language: 0
    }
  };

  seeds.forEach((seed) => {
    const canonical = canonicalizeURL(seed);
    if (canonical) {
      queue.push({ url: canonical, depth: 0 });
    } else {
      summary.skipped.invalid += 1;
    }
  });

  while (queue.length > 0 && summary.crawled < maxPages) {
    const next = queue.shift();
    if (next.depth > depth) continue;

    if (visited.has(next.url)) {
      summary.skipped.visited += 1;
      continue;
    }

    const allowed = await isAllowed(next.url, obeyRobots, userAgent);
    if (!allowed) {
      summary.skipped.robots += 1;
      continue;
    }

    visited.add(next.url);

    try {
      const response = await axios.get(next.url, {
        timeout: 10000,
        headers: {
          'User-Agent': userAgent,
          Accept: 'text/html'
        }
      });

      const contentType = response.headers['content-type'] || '';
      if (!contentType.includes('text/html')) {
        summary.skipped.invalid += 1;
        continue;
      }

      const { title, text, links, lang } = extractContent(response.data, next.url);

      const signature = signatureFromDoc({ url: next.url, title });
      if (signatures.has(signature)) {
        summary.skipped.duplicates += 1;
        continue;
      }
      signatures.add(signature);

      const document = await indexDocument({
        url: next.url,
        title,
        text,
        links,
        language: lang
      });

      if (!document) {
        summary.skipped.language += 1;
        continue;
      }

      summary.crawled += 1;
      crawledDocs.push({
        id: document.id,
        url: document.url,
        title: document.title,
        lang: document.lang
      });

      if (next.depth < depth) {
        links.forEach((link) => {
          if (!visited.has(link)) {
            queue.push({ url: link, depth: next.depth + 1 });
          }
        });
      }
    } catch (err) {
      summary.skipped.errors += 1;
    }
  }

  return {
    ...summary,
    documents: crawledDocs
  };
}

module.exports = {
  crawl
};

