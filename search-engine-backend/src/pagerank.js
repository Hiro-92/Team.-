// pagerank.js
const cheerio = require("cheerio");

function extractLinks(doc, allUrls) {
  const $ = cheerio.load(doc.content);
  const links = [];
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (href && allUrls.includes(href)) {
      links.push(href);
    }
  });
  return links;
}

function computePageRank(documents, maxIter = 20, d = 0.85) {
  const urls = documents.map((doc) => doc.url);
  const linksMap = {};
  const N = urls.length;

  // 링크 수집
  documents.forEach((doc) => {
    linksMap[doc.url] = extractLinks(doc, urls);
  });

  const ranks = {};
  urls.forEach((url) => (ranks[url] = 1 / N));

  for (let iter = 0; iter < maxIter; iter++) {
    const newRanks = {};
    urls.forEach((url) => {
      let sum = 0;
      urls.forEach((u) => {
        if (linksMap[u].includes(url)) {
          sum += ranks[u] / linksMap[u].length;
        }
      });
      newRanks[url] = (1 - d) / N + d * sum;
    });
    Object.assign(ranks, newRanks);
  }
  return ranks;
}

module.exports = { computePageRank };
