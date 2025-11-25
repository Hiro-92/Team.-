const { URL } = require('url');

const defaultPorts = {
  'http:': '80',
  'https:': '443'
};

/**
 * Issue #3 Fix: Enhanced URL canonicalization
 * Normalizes URLs to prevent duplicates from URL variations
 */
function canonicalizeURL(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return null;
  }

  try {
    const url = new URL(rawUrl.trim());

    // 1. Remove fragment/hash (e.g., #section)
    url.hash = '';

    // 2. Normalize case
    url.host = url.host.toLowerCase();
    url.protocol = url.protocol.toLowerCase();

    // 3. Remove default ports
    if (defaultPorts[url.protocol] && url.port === defaultPorts[url.protocol]) {
      url.port = '';
    }

    // 4. Remove tracking parameters (common ones that don't affect content)
    const trackingParams = [
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
      'fbclid', 'gclid', 'ref', 'source', 'campaign_id', '_ga', 'mc_cid', 'mc_eid'
    ];

    trackingParams.forEach(param => url.searchParams.delete(param));

    // 5. Sort remaining query parameters
    if (url.searchParams && Array.from(url.searchParams.keys()).length > 0) {
      const params = Array.from(url.searchParams.entries())
        .sort(([a], [b]) => a.localeCompare(b));
      url.search = '';
      params.forEach(([key, value]) => url.searchParams.append(key, value));
    }

    // 6. Normalize pathname
    let pathname = url.pathname;
    if (!pathname || pathname === '') {
      pathname = '/';
    }

    // Remove double slashes
    pathname = pathname.replace(/\/{2,}/g, '/');

    // Handle /index.html, /index.htm, /default.html variations
    pathname = pathname.replace(/\/(index|default)\.(html?|php|asp|aspx)$/i, '/');

    // Remove trailing slash (except for root)
    if (pathname !== '/' && pathname.endsWith('/')) {
      pathname = pathname.slice(0, -1);
    }

    url.pathname = pathname;

    return url.toString();
  } catch (err) {
    return null;
  }
}

/**
 * Check if URL matches allowed language patterns (Issue #2 fix)
 * Filters out non-English Wikipedia pages and special pages
 */
function isAllowedLanguageURL(url, allowedLanguages = ['en']) {
  if (!url || typeof url !== 'string') {
    return false;
  }

  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname.toLowerCase();
    const hostname = parsed.hostname.toLowerCase();

    // Wikipedia-specific filtering
    if (hostname.includes('wikipedia.org')) {
      // Check for non-English Wikipedia domains (e.g., fr.wikipedia.org, ru.wikipedia.org)
      const subdomain = hostname.split('.')[0];
      if (subdomain !== 'en' && subdomain !== 'www' && subdomain.length === 2) {
        return false; // Non-English Wikipedia
      }

      // Block special Wikipedia pages (these are often navigation/meta pages)
      const specialPrefixes = [
        '/wiki/special:',
        '/wiki/talk:',
        '/wiki/user:',
        '/wiki/user_talk:',
        '/wiki/wikipedia:',
        '/wiki/file:',
        '/wiki/template:',
        '/wiki/help:',
        '/wiki/category:',
        '/wiki/portal:',
        '/wiki/draft:',
        '/wiki/mediawiki:',
        '/wiki/module:'
      ];

      if (specialPrefixes.some(prefix => pathname.startsWith(prefix))) {
        return false;
      }

      // Block language selection pages (Main_Page with ?uselang= or language variant pages)
      if (parsed.search.includes('uselang=') || parsed.search.includes('variant=')) {
        return false;
      }
    }

    // General URL pattern: block common non-English path patterns
    const nonEnglishPatterns = [
      /\/[a-z]{2}\//, // Matches /fr/, /ru/, /de/ etc in path
      /\/[a-z]{2}-[a-z]{2}\//  // Matches /zh-cn/, /pt-br/ etc
    ];

    if (nonEnglishPatterns.some(pattern => pattern.test(pathname))) {
      return false;
    }

    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Check if URL is likely a navigation/utility link rather than content
 * (e.g., login, search, sitemap pages)
 */
function isContentURL(url) {
  if (!url || typeof url !== 'string') {
    return false;
  }

  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname.toLowerCase();

    // Block common non-content pages
    const nonContentPatterns = [
      '/login',
      '/logout',
      '/signin',
      '/signup',
      '/register',
      '/search',
      '/sitemap',
      '/privacy',
      '/terms',
      '/contact',
      '/about',
      '/admin',
      '/api/'
    ];

    if (nonContentPatterns.some(pattern => pathname.includes(pattern))) {
      return false;
    }

    return true;
  } catch (err) {
    return false;
  }
}

module.exports = {
  canonicalizeURL,
  isAllowedLanguageURL,
  isContentURL
};

