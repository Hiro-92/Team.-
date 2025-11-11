import { useMemo, useState } from 'react';
import './App.css';

const PAGE_SIZE = 10;

function App() {
  const [query, setQuery] = useState('');
  const [strategy, setStrategy] = useState('bm25');
  const [lang, setLang] = useState('en');
  const [results, setResults] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loadingSearch, setLoadingSearch] = useState(false);

  const [seedInput, setSeedInput] = useState('');
  const [depth, setDepth] = useState(1);
  const [maxPages, setMaxPages] = useState(10);
  const [obeyRobots, setObeyRobots] = useState(true);
  const [crawlSummary, setCrawlSummary] = useState(null);
  const [loadingCrawl, setLoadingCrawl] = useState(false);

  const [errorMessage, setErrorMessage] = useState('');

  const totalPages = useMemo(() => {
    if (total === 0) return 0;
    return Math.ceil(total / PAGE_SIZE);
  }, [total]);

  const parsedSeeds = useMemo(
    () =>
      seedInput
        .split(/\s+/)
        .map((item) => item.trim())
        .filter(Boolean),
    [seedInput]
  );

  const runSearch = async (targetPage = 1) => {
    if (!query.trim()) {
      setErrorMessage('Please enter a search query.');
      return;
    }

    setLoadingSearch(true);
    setErrorMessage('');

    try {
      const params = new URLSearchParams({
        query,
        strategy,
        page: targetPage.toString(),
        size: PAGE_SIZE.toString(),
        lang
      });

      const response = await fetch(`/api/search?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Search request failed.');
      }

      const payload = await response.json();
      setResults(payload.items);
      setTotal(payload.total);
      setPage(payload.page);
      if (payload.lang) {
        setLang(payload.lang);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Something went wrong during search.');
    } finally {
      setLoadingSearch(false);
    }
  };

  const handleSubmitSearch = async (event) => {
    event.preventDefault();
    await runSearch(1);
  };

  const handlePageChange = async (delta) => {
    const nextPage = page + delta;
    if (nextPage < 1 || nextPage > totalPages) return;
    await runSearch(nextPage);
  };

  const handleCrawl = async (event) => {
    event.preventDefault();
    if (parsedSeeds.length === 0) {
      setErrorMessage('Provide at least one seed URL to crawl.');
      return;
    }

    setLoadingCrawl(true);
    setErrorMessage('');

    try {
      const response = await fetch('/api/crawl', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          seeds: parsedSeeds,
          depth,
          maxPages,
          obeyRobots
        })
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error?.message || 'Crawl request failed.');
      }

      const payload = await response.json();
      setCrawlSummary(payload);
    } catch (err) {
      setErrorMessage(err.message || 'Unable to start crawl.');
    } finally {
      setLoadingCrawl(false);
    }
  };

  return (
    <div className="app">
      <header>
        <h1>Search Engine Algorithm Demo</h1>
        <p>2025 Fall Algorithm Project by Team궁금하조</p>
      </header>

      {errorMessage && (
        <div className="message message--error">{errorMessage}</div>
      )}

      <section className="panel" aria-label="Crawl control">
        <h2>Crawl</h2>
        <form onSubmit={handleCrawl} className="form">
          <label>
            Seed URLs (space or newline separated)
            <textarea
              value={seedInput}
              onChange={(event) => setSeedInput(event.target.value)}
              placeholder="https://example.com https://example.org"
              rows={3}
            />
          </label>
          <div className="form__row">
            <label>
              Depth
              <input
                type="number"
                min="0"
                max="5"
                value={depth}
                onChange={(event) => setDepth(Number(event.target.value))}
              />
            </label>
            <label>
              Max Pages
              <input
                type="number"
                min="1"
                max="100"
                value={maxPages}
                onChange={(event) => setMaxPages(Number(event.target.value))}
              />
            </label>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={obeyRobots}
                onChange={(event) => setObeyRobots(event.target.checked)}
              />
              Obey robots.txt
            </label>
          </div>
          <button type="submit" disabled={loadingCrawl}>
            {loadingCrawl ? 'Crawling…' : 'Start Crawl'}
          </button>
        </form>
        {crawlSummary && (
          <div className="summary">
            <p>
              Crawled <strong>{crawlSummary.crawled}</strong> pages.
            </p>
            <p>
              Skipped: duplicates {crawlSummary.skipped?.duplicates ?? 0}, robots{' '}
              {crawlSummary.skipped?.robots ?? 0}, language{' '}
              {crawlSummary.skipped?.language ?? 0}, errors{' '}
              {crawlSummary.skipped?.errors ?? 0}
            </p>
          </div>
        )}
      </section>

      <section className="panel" aria-label="Search">
        <h2>Search</h2>
        <form onSubmit={handleSubmitSearch} className="form">
          <label>
            Query
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search the crawl..."
            />
          </label>
          <div className="form__row">
            <label>
              Language
              <select value={lang} onChange={(event) => setLang(event.target.value)}>
                <option value="en">English</option>
                <option value="ko">Korean</option>
              </select>
            </label>
            <label className="radio">
              <input
                type="radio"
                name="strategy"
                value="bm25"
                checked={strategy === 'bm25'}
                onChange={(event) => setStrategy(event.target.value)}
              />
              BM25
            </label>
            <label className="radio">
              <input
                type="radio"
                name="strategy"
                value="tfidf"
                checked={strategy === 'tfidf'}
                onChange={(event) => setStrategy(event.target.value)}
              />
              TF-IDF
            </label>
          </div>
          <button type="submit" disabled={loadingSearch}>
            {loadingSearch ? 'Searching…' : 'Search'}
          </button>
        </form>
      </section>

      <section className="results" aria-live="polite">
        {loadingSearch && <p>Loading search results…</p>}
        {!loadingSearch && results.length === 0 && total === 0 && (
          <p className="placeholder">
            Start by crawling a site or searching the existing index.
          </p>
        )}
        {results.map((item) => (
          <article key={item.url} className="result">
            <a href={item.url} target="_blank" rel="noreferrer">
              {item.title || item.url}
            </a>
            <p className="result__url">{item.url}</p>
            <p
              className="result__snippet"
              dangerouslySetInnerHTML={{ __html: item.snippet }}
            />
            <p className="result__meta">
              Score: {item.score.toFixed(3)} • Lang: {item.lang?.toUpperCase() ?? 'N/A'} •
              Highlights: {item.highlights.join(', ')}
            </p>
          </article>
        ))}

        {totalPages > 1 && (
          <div className="pagination">
            <button
              type="button"
              onClick={() => handlePageChange(-1)}
              disabled={page === 1 || loadingSearch}
            >
              Previous
            </button>
            <span>
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => handlePageChange(1)}
              disabled={page === totalPages || loadingSearch}
            >
              Next
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

export default App;
