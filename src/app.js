const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());
app.use('/qr', express.static('public/qr'));

app.get('/health', (_req, res) => res.json({ ok: true }));

app.use('/api/v1/admin', require('./routes/admin.routes'));
app.use('/api/v1/producer', require('./routes/producer.routes'));
app.use('/api/v1/processor', require('./routes/processor.routes'));
app.use('/api/v2/processor', require('./routes/processorV2.routes'));
app.use('/api/v1/distributor', require('./routes/distributor.routes'));
app.use('/api/v1/warehouse', require('./routes/warehouse.routes'));
app.use('/api/v1/retailer', require('./routes/retailer.routes'));
app.use('/api/v1/public', require('./routes/public.routes'));
app.use('/api/v1/reports', require('./routes/report.routes'));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
