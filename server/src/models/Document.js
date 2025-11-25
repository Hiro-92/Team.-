function createDocument({
  id,
  url,
  canonicalUrl,
  title,
  text,
  lang,
  signature,
  tokens = {},
  links = [],
  fetchedAt = new Date().toISOString()
}) {
  if (!id || !url) {
    throw new Error('Document requires id and url');
  }

  const docTokens = tokens;
  const length = Object.values(docTokens).reduce((acc, value) => acc + value, 0);

  return {
    id,
    url,
    canonicalUrl: canonicalUrl || url,
    title: title || '',
    text: text || '',
    lang: lang || 'en',
    signature,
    tokens: docTokens,
    links,
    length,
    fetchedAt
  };
}

module.exports = {
  createDocument
};

