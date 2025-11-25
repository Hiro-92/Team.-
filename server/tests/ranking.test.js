const { rank } = require('../src/services/rankingService');

function buildVectors() {
  const documents = new Map([
    [
      'doc1',
      {
        docLength: 100,
        termFrequencies: { search: 5, engine: 3 },
        document: { id: 'doc1', title: 'Search Engines Basics', text: '...' }
      }
    ],
    [
      'doc2',
      {
        docLength: 80,
        termFrequencies: { search: 2, engine: 1 },
        document: { id: 'doc2', title: 'Modern Web Search', text: '...' }
      }
    ],
    [
      'doc3',
      {
        docLength: 60,
        termFrequencies: { search: 1 },
        document: { id: 'doc3', title: 'Search Tips', text: '...' }
      }
    ]
  ]);

  const docFrequency = new Map([
    ['search', 3],
    ['engine', 2]
  ]);

  const stats = {
    totalDocs: 3,
    avgDocLength: (100 + 80 + 60) / 3
  };

  return { documents, docFrequency, stats };
}

describe('rankingService.rank', () => {
  test('orders documents consistently with BM25', () => {
    const vectors = buildVectors();
    const results = rank(['search', 'engine'], vectors, 'bm25');

    expect(results).toHaveLength(3);
    expect(results[0].docId).toBe('doc1');
    expect(results[1].docId).toBe('doc2');
    expect(results[2].docId).toBe('doc3');
    expect(results[0].score).toBeGreaterThan(results[1].score);
    expect(results[1].score).toBeGreaterThan(results[2].score);
  });

  test('orders documents consistently with TF-IDF', () => {
    const vectors = buildVectors();
    const results = rank(['search', 'engine'], vectors, 'tfidf');

    expect(results).toHaveLength(2);
    expect(results[0].docId).toBe('doc1');
    expect(results[1].docId).toBe('doc2');
    expect(results[0].score).toBeGreaterThan(results[1].score);
    expect(results[1].score).toBeGreaterThan(0);
  });
});

