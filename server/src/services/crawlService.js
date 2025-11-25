const axios = require('axios');
const cheerio = require('cheerio');
const { canonicalizeURL, isAllowedLanguageURL, isContentURL } = require('../utils/url');
const { indexDocument } = require('./indexService');
const { signatureFromDoc } = require('../utils/deduplicate');
const { normalizeLanguageCode } = require('../utils/tokenizer');
const crawlingConfig = require('../config/crawling');

const robotsCache = new Map();

/**
 * Issue #5 Fix: Retry logic with exponential backoff
 * Retries failed requests with increasing delays
 */
async function fetchWithRetry(url, options, maxRetries = 3) {
  let lastError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await axios.get(url, options);
      return { success: true, response, attempt };
    } catch (error) {
      lastError = error;

      // Don't retry on 404 (not found) or 403 (forbidden) - these won't change
      if (error.response && [404, 403, 410].includes(error.response.status)) {
        return {
          success: false,
          error,
          statusCode: error.response.status,
          shouldSkip: true,
          attempt
        };
      }

      // Exponential backoff: 1s, 2s, 4s
      if (attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  return {
    success: false,
    error: lastError,
    statusCode: lastError?.response?.status,
    shouldSkip: false,
    attempt: maxRetries
  };
}

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

  // Remove noise elements before extraction (Issue #1 fix)
  $('script, style, nav, footer, header, aside, iframe, noscript').remove();
  $('[role="navigation"], [role="banner"], [role="complementary"]').remove();

  // Extract title
  const title = $('title').first().text().trim() || url;

  // Extract main content - prioritize semantic HTML5 tags
  let text = '';
  const mainContent = $('main, article, [role="main"]').first();

  if (mainContent.length > 0) {
    // Found semantic content area
    text = mainContent.text();
  } else {
    // Fallback: extract from paragraphs and headings only (skip noise)
    const contentElements = $('p, h1, h2, h3, h4, h5, h6, li, td, th');
    const paragraphs = contentElements.map((_, el) => $(el).text().trim()).get();
    text = paragraphs.filter(p => p.length > 0).join(' ');
  }

  // Clean whitespace
  text = text.replace(/\s+/g, ' ').trim();

  // Extract links
  const links = [];
  const htmlLang = normalizeLanguageCode($('html').attr('lang') || $('html').attr('xml:lang'));

  $('a[href]').each((_, element) => {
    const href = $(element).attr('href');
    if (!href) return;
    try {
      const absolute = new URL(href, url).toString();
      const canonical = canonicalizeURL(absolute);

      // Issue #2 fix: Filter URLs by language and content type
      if (canonical && isAllowedLanguageURL(canonical) && isContentURL(canonical)) {
        links.push(canonical);
      }
    } catch (err) {
      // ignore malformed links
    }
  });

  return { title, text, links, lang: htmlLang };
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
      language: 0,
      filteredURL: 0,  // Issue #2: Track URLs filtered by language/content type
      notFound: 0,     // Issue #5: 404 errors
      forbidden: 0,    // Issue #5: 403 errors
      timeout: 0,      // Issue #5: Timeout errors
      retried: 0       // Issue #5: Successfully retried requests
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

    // Issue #5: Use retry logic with exponential backoff
    const result = await fetchWithRetry(next.url, {
      timeout: 15000, // Increased from 10s to 15s
      headers: {
        'User-Agent': userAgent,
        Accept: 'text/html',
        'Accept-Language': 'en-US,en;q=0.9' // Prefer English content
      }
    }, 3); // Max 3 retries

    // Handle fetch result with error categorization
    if (!result.success) {
      if (result.statusCode === 404) {
        summary.skipped.notFound += 1;
      } else if (result.statusCode === 403) {
        summary.skipped.forbidden += 1;
      } else if (result.error?.code === 'ECONNABORTED' || result.error?.code === 'ETIMEDOUT') {
        summary.skipped.timeout += 1;
      } else {
        summary.skipped.errors += 1;
      }
      continue;
    }

    // Track successful retries
    if (result.attempt > 0) {
      summary.skipped.retried += 1;
    }

    const response = result.response;
    const contentType = response.headers['content-type'] || '';
    if (!contentType.includes('text/html')) {
      summary.skipped.invalid += 1;
      continue;
    }

    try {
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

