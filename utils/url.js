const { URL } = require('url');

const defaultPorts = {
  'http:': '80',
  'https:': '443'
};

function canonicalizeURL(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return null;
  }

  try {
    const url = new URL(rawUrl.trim());
    url.hash = '';
    url.host = url.host.toLowerCase();
    url.protocol = url.protocol.toLowerCase();

    if (defaultPorts[url.protocol] && url.port === defaultPorts[url.protocol]) {
      url.port = '';
    }

    if (url.searchParams && Array.from(url.searchParams.keys()).length > 0) {
      const params = Array.from(url.searchParams.entries())
        .sort(([a], [b]) => a.localeCompare(b));
      url.search = '';
      params.forEach(([key, value]) => url.searchParams.append(key, value));
    }

    let pathname = url.pathname;
    if (!pathname || pathname === '') {
      pathname = '/';
    }
    url.pathname = pathname.replace(/\/{2,}/g, '/');

    if (url.pathname !== '/' && url.pathname.endsWith('/')) {
      url.pathname = url.pathname.slice(0, -1);
    }

    return url.toString();
  } catch (err) {
    return null;
  }
}

module.exports = {
  canonicalizeURL
};

