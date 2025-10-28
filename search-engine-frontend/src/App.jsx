import React, { useState } from "react";

function App() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [crawlUrl, setCrawlUrl] = useState("");

  const handleSearch = async () => {
    if (!query) return;
    const res = await fetch(`/search?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    setResults(data);
  };

  const handleCrawl = async () => {
    if (!crawlUrl) return;
    const res = await fetch(`/crawl?url=${encodeURIComponent(crawlUrl)}`);
    const data = await res.json();
    if (data.success) alert(`크롤링 성공: ${data.title}`);
    else alert(`크롤링 실패`);
    setCrawlUrl("");
  };

  const handleReindex = async () => {
    await fetch("/reindex");
    alert("TF-IDF 인덱스 갱신 완료");
  };

  const handlePagerank = async () => {
    await fetch("/pagerank");
    alert("PageRank 계산 완료");
  };

  return (
    <div style={{ padding: "20px", fontFamily: "Arial" }}>
      <h1>🔍 검색엔진 데모</h1>

      <div>
        <h2>1. 웹사이트 크롤링</h2>
        <input
          type="text"
          placeholder="https://example.com"
          value={crawlUrl}
          onChange={(e) => setCrawlUrl(e.target.value)}
          style={{ width: "400px", padding: "5px" }}
        />
        <button onClick={handleCrawl} style={{ marginLeft: "10px" }}>크롤링</button>
      </div>

      <div style={{ marginTop: "20px" }}>
        <h2>2. 인덱스 및 PageRank</h2>
        <button onClick={handleReindex}>TF-IDF 인덱싱</button>
        <button onClick={handlePagerank} style={{ marginLeft: "10px" }}>PageRank 계산</button>
      </div>

      <div style={{ marginTop: "20px" }}>
        <h2>3. 검색</h2>
        <input
          type="text"
          placeholder="검색어를 입력하세요"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ width: "300px", padding: "5px" }}
        />
        <button onClick={handleSearch} style={{ marginLeft: "10px" }}>검색</button>
      </div>

      <div style={{ marginTop: "30px" }}>
        <h2>검색 결과</h2>
        {results.map((r, idx) => (
          <div key={idx} style={{ padding: "10px", borderBottom: "1px solid #ccc" }}>
            <strong>{r.title}</strong><br />
            <a href={r.url} target="_blank" rel="noopener noreferrer">{r.url}</a><br />
            <small>{r.snippet}</small><br />
            <em>관련도 점수: {r.score.toFixed(4)}</em>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
