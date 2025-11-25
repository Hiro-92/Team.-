const path = require('path');
const dotenv = require('dotenv');

dotenv.config({
  path: path.resolve(__dirname, '..', '..', '..', '.env')
});

const toNumberOrDefault = (value, defaultValue) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultValue;
};

const parseLanguages = (value, fallback) => {
  const source = value || fallback;
  return source
    .split(',')
    .map((lang) => lang.trim().toLowerCase())
    .filter((lang) => lang.length > 0);
};

const PORT = toNumberOrDefault(process.env.PORT, 4000);
const DEFAULT_RANKING = (process.env.DEFAULT_RANKING || 'bm25').toLowerCase();
const PAGE_SIZE = toNumberOrDefault(process.env.PAGE_SIZE, 10);
const USE_REPO = (process.env.USE_REPO || 'memory').toLowerCase();
const ALLOWED_LANGUAGES = parseLanguages(process.env.ALLOWED_LANGUAGES || '', 'en,ko');

module.exports = {
  PORT,
  DEFAULT_RANKING,
  PAGE_SIZE,
  USE_REPO,
  ALLOWED_LANGUAGES
};

