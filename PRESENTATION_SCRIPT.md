# Search Engine Project - Presentation Script

## Opening (30 seconds)

"Hello everyone! Today we're going to show you our search engine project - a demo-scale implementation that recreates how Google's crawler and ranking systems actually work.

We started with a simple question: **How does a search engine really work?** And instead of just reading about it, we decided to build one from scratch."

---

## What We Built (1 minute)

"Our search engine has three main components:

**First, the Crawler** - Give it a seed URL, and it automatically:
- Fetches HTML pages
- Follows links to discover new content
- Respects depth limits and robots.txt
- Filters out non-English pages
- Removes duplicate content

**Second, the Indexer** - It processes each page by:
- Extracting clean content (removing navigation, ads, scripts)
- Detecting the language
- Building an inverted index for fast lookups
- Creating document signatures to catch duplicates

**Third, the Ranker** - When you search, it:
- Ranks results using BM25 and TF-IDF algorithms
- Applies quality filters (title matches, term frequency)
- Implements PageRank for authority scoring
- Returns relevant snippets with highlighted keywords"

---

## Demo Time (2-3 minutes)

"Let me show you how it works:

**[OPEN THE FRONTEND]**

First, I'll crawl some Wikipedia pages starting from 'Search Engine':
- Seed URL: https://en.wikipedia.org/wiki/Search_engine
- Depth: 2 levels
- Max pages: 50

**[START CRAWL]**

While that's running, you can see the real-time stats showing what's happening:
- Pages successfully crawled
- Duplicates detected and skipped
- Non-English pages filtered out
- Any errors encountered

**[WAIT FOR CRAWL TO COMPLETE]**

Great! We just indexed 45 pages. Now let's search:

**[SEARCH: 'search engine algorithm']**

Look at these results - they're ranked by:
1. How many query terms match
2. How frequently terms appear
3. Whether terms appear in the title
4. The page's PageRank score (authority)

You can see the relevance score, highlighted keywords, and contextual snippets for each result."

---

## Technical Highlights (1 minute)

"What makes this interesting from an engineering perspective:

**We solved 5 major challenges:**

1. **HTML Noise Reduction** - We extract only semantic content (articles, paragraphs) and filter out navigation, scripts, and ads - improving search quality by 30%.

2. **Language Filtering** - Dual-layer approach: URL pattern filtering BEFORE crawling plus language detection AFTER - reducing non-English pages from 40% to just 2%.

3. **Duplicate Detection** - Enhanced URL canonicalization (removes tracking params, trailing slashes) plus content-based similarity matching - detecting 92% of duplicates.

4. **Smart Relevance Ranking** - Multi-layer quality filters: minimum term frequency, matched terms requirements, score thresholds, and title boost - improving precision from 28% to 82%.

5. **Error Recovery** - Exponential backoff retry logic with smart error categorization - improving crawl success rate from 10% to 68%.

**Plus a bonus:** We implemented PageRank - the same algorithm that made Google successful in 1998 - to identify authoritative pages and boost them in results."

---

## Architecture (30 seconds)

"The architecture is clean and modular:

- **Backend**: Node.js + Express with services for crawling, indexing, ranking, and search
- **Frontend**: React + Vite with a simple, responsive UI
- **Storage**: Configurable - in-memory for speed or file-based for persistence
- **Testing**: Jest with unit and end-to-end tests

Everything is configurable through environment variables - you can tune the ranking parameters, crawl depth, language filters, and more."

---

## Results & Metrics (30 seconds)

"Let me show you some real numbers:

- **Crawl success rate**: 10% → 68% (6.8x improvement)
- **Search precision**: 28% → 88% (with PageRank enabled)
- **Duplicate detection**: 92% accuracy
- **Non-English filtering**: 98% effective
- **Performance**: Sub-100ms search latency for 1000+ documents

All of this running on a simple Node.js server."

---

## What We Learned (1 minute)

"Building this taught us that search engines are all about trade-offs:

- **Precision vs Recall**: Show 10 perfect results or 100 okay ones?
- **Speed vs Accuracy**: Fast keyword matching or slow semantic analysis?
- **Simplicity vs Features**: Basic BM25 or complex multi-signal ranking?

We also learned to appreciate what Google does at scale:
- They crawl billions of pages, we crawl hundreds
- They use 200+ ranking signals, we use 10+
- They handle all languages, we filter to English

But the **core algorithms are the same** - and that's what we wanted to understand."

---

## Challenges & Solutions (1 minute)

"The biggest challenge? **The crawl error rate was 90%!**

Our solution:
- Implemented exponential backoff retry logic
- Categorized errors (permanent vs temporary)
- Increased timeouts for slow servers
- Result: 90% errors → 32% errors (acceptable range)

Second challenge: **Search results were full of noise**

Our solution:
- Remove HTML boilerplate (navigation, scripts)
- Require minimum term frequency
- Boost title matches
- Filter low-quality results
- Result: Precision improved from 28% to 88%"

---

## Live Q&A Preparation

**Q: Why not use an existing search library?**
"Great question! We wanted to understand how search really works under the hood. Using a library would be faster, but building from scratch taught us about BM25, PageRank, duplicate detection, and the engineering trade-offs involved."

**Q: How does it compare to Google?**
"Google is obviously way more sophisticated - they use neural networks, personalization, 200+ ranking signals, and crawl billions of pages. We're working at demo scale with classic algorithms. But the fundamental concepts - crawling, indexing, ranking - are the same."

**Q: Can it search the entire web?**
"Not practically! Our architecture works for thousands of pages, not billions. Scaling to Google's level would require distributed systems, massive infrastructure, and years of optimization. This is a proof-of-concept to demonstrate understanding."

**Q: What about privacy/GDPR?**
"This is a demo project for local testing. In production, you'd need robots.txt compliance (which we have), rate limiting, GDPR consent, data retention policies, and more."

---

## Closing (30 seconds)

"To wrap up:

We built a **working search engine** that crawls the web, indexes content, and returns ranked results - all using the same core algorithms that power Google.

We tackled **real engineering challenges**: error handling, duplicate detection, relevance ranking, and performance optimization.

And most importantly, we **learned by doing** - understanding not just *what* these algorithms do, but *why* they matter and *how* to implement them.

Thank you! Happy to answer any questions."

---

## Technical Deep-Dive (If Time Permits)

### BM25 Ranking Formula
"BM25 is a probabilistic ranking function. Here's the intuition:
- **Term Frequency**: How often does the query term appear? (More = better)
- **Document Length**: Shorter documents get a boost (dense content)
- **Inverse Document Frequency**: Rare terms are more valuable than common ones

The k1 and b parameters control saturation and length normalization."

### PageRank Algorithm
"PageRank models a 'random surfer':
- Start at a random page
- Click links randomly (85% of the time)
- Jump to a random page (15% of the time)
- The probability you end up at page X is its PageRank

We use power iteration to compute this - it converges in 10-15 iterations for our scale."

### Duplicate Detection
"We use a hybrid approach:
1. **URL canonicalization**: Remove tracking params, normalize paths
2. **Content hashing**: SHA-1 hash of first 1000 characters
3. **Jaccard similarity**: Token-based similarity for near-duplicates

This catches 92% of duplicates with minimal false positives."

---

## Demo Checklist

**Before Presentation:**
- [ ] Start backend server (`npm run dev:server`)
- [ ] Start frontend (`npm run dev:client`)
- [ ] Clear any existing data
- [ ] Test crawl with 1-2 seed URLs
- [ ] Prepare backup crawl results (in case of network issues)
- [ ] Have IMPROVEMENTS.md open for reference
- [ ] Have sample search queries ready

**Sample Seed URLs:**
- https://en.wikipedia.org/wiki/Search_engine
- https://en.wikipedia.org/wiki/Information_retrieval
- https://en.wikipedia.org/wiki/Web_crawler

**Sample Search Queries:**
- "search engine algorithm"
- "web crawler"
- "information retrieval"
- "ranking algorithm"

**Backup Plan (if live demo fails):**
- Show pre-crawled data in `server/data/documents.csv`
- Walk through code in `server/src/services/`
- Show test results from Jest
- Explain architecture with README diagrams

---

## Time Allocations (Total: 10 minutes)

- Opening: 0:30
- What We Built: 1:00
- Demo: 2:30
- Technical Highlights: 1:00
- Architecture: 0:30
- Results: 0:30
- What We Learned: 1:00
- Challenges: 1:00
- Q&A: 2:00
- Closing: 0:30

**Adjust based on your actual time limit!**
