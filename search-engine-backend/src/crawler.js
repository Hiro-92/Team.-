// crawler.js
const fetch = require("node-fetch");
const cheerio = require("cheerio");

async function crawlPage(url, tokenize) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "SearchEngineDemoBot/1.0"
    }
  });

  if (!res.ok) throw new Error(`Failed to fetch ${url}`);
  const html = await res.text();
  const $ = cheerio.load(html);

  const title = $("title").text().trim();
  const content = $("body").text().trim();
  const tokens = tokenize(content);

  return {
    id: Date.now().toString(),
    url,
    title,
    content,
    tokens,
    tfidf: {},
    pagerank: 0,
  };
}

module.exports = { crawlPage };
