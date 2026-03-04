CREATE TABLE IF NOT EXISTS competitors (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  base_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id BIGSERIAL PRIMARY KEY,
  competitor_id INT NOT NULL REFERENCES competitors(id) ON DELETE CASCADE,
  external_product_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  url TEXT,
  image_url TEXT,
  current_price NUMERIC(12,2),
  currency TEXT DEFAULT 'USD',
  stock_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (competitor_id, external_product_id)
);

CREATE TABLE IF NOT EXISTS price_history (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  price NUMERIC(12,2) NOT NULL,
  currency TEXT DEFAULT 'USD'
);

CREATE TABLE IF NOT EXISTS reviews (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  source_review_id TEXT,
  rating NUMERIC(3,2),
  review_text TEXT,
  reviewer_name TEXT,
  review_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (product_id, source_review_id)
);

CREATE TABLE IF NOT EXISTS sentiment_scores (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  score NUMERIC(5,4) NOT NULL,
  label TEXT NOT NULL,
  model_name TEXT,
  analyzed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_summaries (
  id BIGSERIAL PRIMARY KEY,
  summary_type TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workflow_runs (
  id BIGSERIAL PRIMARY KEY,
  workflow_name TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  records_processed INT DEFAULT 0,
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_products_competitor_category ON products(competitor_id, category);
CREATE INDEX IF NOT EXISTS idx_price_history_product_observed_at ON price_history(product_id, observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_sentiment_product_analyzed_at ON sentiment_scores(product_id, analyzed_at DESC);

INSERT INTO competitors (name, base_url)
VALUES
  ('DemoMart', 'https://dummyjson.com/products'),
  ('ShopSphere', 'https://example.com/shop'),
  ('ValueHub', 'https://example.com/value')
ON CONFLICT (name) DO NOTHING;

INSERT INTO products (competitor_id, external_product_id, title, description, category, url, image_url, current_price, currency)
SELECT c.id, 'd-101', 'Smartphone Alpha', 'Mid-range smartphone', 'smartphones', 'https://example.com/a', 'https://picsum.photos/200', 499.00, 'USD'
FROM competitors c WHERE c.name='DemoMart'
ON CONFLICT (competitor_id, external_product_id) DO NOTHING;

INSERT INTO products (competitor_id, external_product_id, title, description, category, url, image_url, current_price, currency)
SELECT c.id, 's-201', 'Wireless Earbuds Pro', 'ANC earbuds', 'audio', 'https://example.com/b', 'https://picsum.photos/201', 129.00, 'USD'
FROM competitors c WHERE c.name='ShopSphere'
ON CONFLICT (competitor_id, external_product_id) DO NOTHING;

INSERT INTO products (competitor_id, external_product_id, title, description, category, url, image_url, current_price, currency)
SELECT c.id, 'v-301', 'Gaming Laptop X', 'High performance laptop', 'laptops', 'https://example.com/c', 'https://picsum.photos/202', 1499.00, 'USD'
FROM competitors c WHERE c.name='ValueHub'
ON CONFLICT (competitor_id, external_product_id) DO NOTHING;

INSERT INTO price_history (product_id, observed_at, price, currency)
SELECT p.id, NOW() - (g.day_offset || ' days')::interval, 
  ROUND((p.current_price * (1 + ((random() - 0.5) / 5)))::numeric, 2),
  p.currency
FROM products p
CROSS JOIN LATERAL generate_series(1, 30) AS g(day_offset);

INSERT INTO sentiment_scores (product_id, score, label, model_name, analyzed_at)
SELECT p.id,
  ROUND(LEAST(1, GREATEST(-1, sin((p.id + g.day_offset) / 3.0)))::numeric, 3) AS score,
  CASE
    WHEN LEAST(1, GREATEST(-1, sin((p.id + g.day_offset) / 3.0))) > 0.2 THEN 'positive'
    WHEN LEAST(1, GREATEST(-1, sin((p.id + g.day_offset) / 3.0))) < -0.2 THEN 'negative'
    ELSE 'neutral'
  END,
  'seed-deterministic',
  NOW() - (g.day_offset || ' days')::interval
FROM products p
CROSS JOIN LATERAL generate_series(1, 30) AS g(day_offset);
