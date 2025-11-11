const express = require('express');
const morgan = require('morgan');
const { PORT } = require('./config/env');
const apiRoutes = require('./api/routes');

const app = express();

app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

app.use('/api', apiRoutes);

app.use((err, req, res, next) => {
  // eslint-disable-next-line no-console
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({
    error: {
      message: err.message || 'Internal Server Error',
      code: err.code || 'INTERNAL_ERROR'
    }
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Search engine API running on port ${PORT}`);
  });
}

module.exports = app;

