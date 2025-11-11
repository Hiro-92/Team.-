const request = require('supertest');
const nock = require('nock');
const app = require('../../server');
const repo = require('../../models/repositories');

describe('Search API end-to-end', () => {
  beforeAll(() => {
    nock.disableNetConnect();
    nock.enableNetConnect(/127\.0\.0\.1/);
  });

  beforeEach(async () => {
    await repo.clear();
    nock.cleanAll();
  });

  afterAll(() => {
    nock.enableNetConnect();
    nock.restore();
  });

  test('crawls, indexes, and searches documents', async () => {
    const base = 'http://testsite.com';

    nock(base)
      .get('/start')
      .reply(
        200,
        `
        <html>
          <head><title>Test Start Page</title></head>
          <body>
            <p>This is a demo page about building a search engine in JavaScript.</p>
            <a href="/second">Next Page</a>
          </body>
        </html>
      `,
        {
          'Content-Type': 'text/html'
        }
      );

    nock(base)
      .get('/second')
      .reply(
        200,
        `
        <html>
          <head><title>Second Page</title></head>
          <body>
            <p>The second demo document highlights ranking with BM25 and TF-IDF.</p>
          </body>
        </html>
      `,
        {
          'Content-Type': 'text/html'
        }
      );

    const crawlRes = await request(app)
      .post('/api/crawl')
      .send({
        seeds: [`${base}/start`],
        depth: 1,
        maxPages: 5,
        obeyRobots: false
      })
      .expect(200);

    expect(crawlRes.body.crawled).toBeGreaterThanOrEqual(2);
    expect(crawlRes.body.skipped.language).toBeDefined();
    expect(crawlRes.body.skipped.language).toBeGreaterThanOrEqual(0);

    const searchRes = await request(app)
      .get('/api/search')
      .query({
        query: 'demo search engine',
        strategy: 'bm25',
        page: 1,
        size: 10,
        lang: 'en'
      })
      .expect(200);

    expect(searchRes.body.total).toBeGreaterThan(0);
    expect(searchRes.body.items.length).toBeGreaterThan(0);
    expect(searchRes.body.lang).toBe('en');
    expect(
      searchRes.body.items.every((item) => item.lang === 'en')
    ).toBe(true);

    const [firstResult] = searchRes.body.items;
    expect(firstResult.url).toBeDefined();
    expect(firstResult.title).toBeDefined();
    expect(firstResult.snippet).toMatch(/<em>demo<\/em>|<em>search<\/em>/i);
    expect(firstResult.highlights.length).toBeGreaterThan(0);

    const searchKoRes = await request(app)
      .get('/api/search')
      .query({
        query: 'demo',
        lang: 'ko',
        page: 1,
        size: 10
      })
      .expect(200);

    expect(searchKoRes.body.lang).toBe('ko');
    expect(searchKoRes.body.total).toBe(0);
    expect(searchKoRes.body.items).toHaveLength(0);
  });
});

