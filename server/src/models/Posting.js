function createPosting({ token, docId, termFrequency, docLength }) {
  if (!token || !docId) {
    throw new Error('Posting requires token and docId');
  }

  return {
    token,
    docId,
    termFrequency,
    docLength
  };
}

module.exports = {
  createPosting
};

