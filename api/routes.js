const express = require('express');
const searchController = require('../controllers/searchController');
const crawlController = require('../controllers/crawlController');

const router = express.Router();

router.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

router.get('/search', searchController.search);
router.post('/crawl', crawlController.crawl);

module.exports = router;

