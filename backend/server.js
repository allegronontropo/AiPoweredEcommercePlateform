import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import OpenAI from 'openai';

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('frontend'));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://compintel:compintel@localhost:5432/compintel',
});

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

const toInt = (v, fallback) => {
  const parsed = Number.parseInt(v, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/competitors', async (_req, res) => {
  const { rows } = await pool.query('SELECT id, name, base_url FROM competitors ORDER BY name');
  res.json(rows);
});

app.get('/api/products', async (req, res) => {
  const limit = toInt(req.query.limit, 100);
  const values = [];
  const clauses = [];

  if (req.query.competitor) {
    values.push(req.query.competitor);
    clauses.push(`c.name = $${values.length}`);
  }

  if (req.query.category) {
    values.push(req.query.category);
    clauses.push(`p.category = $${values.length}`);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  values.push(limit);

  const sql = `
    SELECT p.id, p.title, p.category, p.current_price, p.currency, p.updated_at, c.name AS competitor
    FROM products p
    JOIN competitors c ON c.id = p.competitor_id
    ${where}
    ORDER BY p.updated_at DESC
    LIMIT $${values.length};
  `;

  const { rows } = await pool.query(sql, values);
  res.json(rows);
});

app.get('/api/price-trends', async (req, res) => {
  const days = toInt(req.query.days, 30);
  const values = [days];
  const clauses = [];

  if (req.query.competitor) {
    values.push(req.query.competitor);
    clauses.push(`c.name = $${values.length}`);
  }

  if (req.query.category) {
    values.push(req.query.category);
    clauses.push(`p.category = $${values.length}`);
  }

  const where = clauses.length ? `AND ${clauses.join(' AND ')}` : '';

  const sql = `
    SELECT DATE(ph.observed_at) AS day, ROUND(AVG(ph.price)::numeric, 2) AS avg_price
    FROM price_history ph
    JOIN products p ON p.id = ph.product_id
    JOIN competitors c ON c.id = p.competitor_id
    WHERE ph.observed_at >= NOW() - ($1 || ' days')::interval
    ${where}
    GROUP BY DATE(ph.observed_at)
    ORDER BY day;
  `;

  const { rows } = await pool.query(sql, values);
  res.json(rows);
});

app.get('/api/sentiment-trends', async (req, res) => {
  const days = toInt(req.query.days, 30);
  const values = [days];
  const clauses = [];

  if (req.query.competitor) {
    values.push(req.query.competitor);
    clauses.push(`c.name = $${values.length}`);
  }

  if (req.query.category) {
    values.push(req.query.category);
    clauses.push(`p.category = $${values.length}`);
  }

  const where = clauses.length ? `AND ${clauses.join(' AND ')}` : '';

  const sql = `
    SELECT DATE(s.analyzed_at) AS day, ROUND(AVG(s.score)::numeric, 3) AS avg_sentiment
    FROM sentiment_scores s
    JOIN products p ON p.id = s.product_id
    JOIN competitors c ON c.id = p.competitor_id
    WHERE s.analyzed_at >= NOW() - ($1 || ' days')::interval
    ${where}
    GROUP BY DATE(s.analyzed_at)
    ORDER BY day;
  `;

  const { rows } = await pool.query(sql, values);
  res.json(rows);
});

app.get('/api/alerts', async (req, res) => {
  const days = toInt(req.query.days, 7);
  const sql = `
    WITH ranked AS (
      SELECT p.title, c.name AS competitor, ph.observed_at, ph.price,
        LAG(ph.price) OVER (PARTITION BY ph.product_id ORDER BY ph.observed_at) AS previous_price
      FROM price_history ph
      JOIN products p ON p.id = ph.product_id
      JOIN competitors c ON c.id = p.competitor_id
      WHERE ph.observed_at >= NOW() - ($1 || ' days')::interval
    )
    SELECT title, competitor, observed_at, price, previous_price,
      ROUND(((price - previous_price) / NULLIF(previous_price, 0))::numeric * 100, 2) AS pct_change
    FROM ranked
    WHERE previous_price IS NOT NULL
      AND ABS((price - previous_price) / NULLIF(previous_price, 0)) >= 0.1
    ORDER BY observed_at DESC
    LIMIT 50;
  `;

  const { rows } = await pool.query(sql, [days]);
  res.json(rows);
});

app.post('/api/generate-summary', async (req, res) => {
  if (!openai) {
    return res.status(400).json({ error: 'OPENAI_API_KEY is not configured.' });
  }

  const { highlights = [] } = req.body;

  const prompt = `You are a competitive intelligence analyst for e-commerce.\nSummarize the most important changes and provide recommendations.\nData:\n${JSON.stringify(highlights, null, 2)}`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
  });

  const summary = completion.choices?.[0]?.message?.content ?? 'No summary generated.';

  await pool.query(
    `INSERT INTO ai_summaries (summary_type, period_start, period_end, content, metadata)
     VALUES ('weekly_insight', CURRENT_DATE - INTERVAL '7 days', CURRENT_DATE, $1, $2)`,
    [summary, JSON.stringify({ source: 'openai:gpt-4o-mini' })],
  );

  res.json({ summary });
});

app.get('*', (_req, res) => {
  res.sendFile(new URL('./frontend/index.html', import.meta.url).pathname);
});

const port = toInt(process.env.PORT, 3000);
app.listen(port, () => {
  console.log(`API + dashboard listening on ${port}`);
});
