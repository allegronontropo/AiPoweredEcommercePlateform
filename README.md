# AI-Powered Competitive Intelligence & Automated Reporting System

This repository contains an end-to-end starter implementation of an e-commerce competitive intelligence platform built around **n8n**, **PostgreSQL**, **OpenAI**, and a lightweight web dashboard.

## What is included

- **Automation workflows (n8n export JSON)** for scraping, cleaning, AI enrichment, and weekly reporting.
- **PostgreSQL schema** for products, price history, reviews, sentiment, insights, and workflow logs.
- **Node.js API** exposing dashboard-ready endpoints and optional OpenAI-generated summaries.
- **Web dashboard** (served by the API) with filters and charts for pricing and sentiment trends.
- **Docker Compose** to run PostgreSQL, n8n, and the API together.

---

## Architecture

```text
┌─────────────┐     HTTP/Cheeri/Puppeteer      ┌───────────────┐
│ Competitors │ ─────────────────────────────▶ │ n8n Workflows │
└─────────────┘                                 └──────┬────────┘
                                                        │
                                                        ▼
                                                ┌──────────────┐
                                                │ PostgreSQL   │
                                                │ - products   │
                                                │ - prices     │
                                                │ - sentiment  │
                                                │ - insights   │
                                                └──────┬───────┘
                                                       │
                                REST API + aggregation │
                                                       ▼
                                                ┌──────────────┐
                                                │ Node API     │
                                                │ /api/*       │
                                                └──────┬───────┘
                                                       │
                                                       ▼
                                                ┌──────────────┐
                                                │ Dashboard UI │
                                                │ Chart.js     │
                                                └──────────────┘
```

---

## Quick Start

### 1) Prerequisites

- Docker + Docker Compose
- (Optional) OpenAI API key for AI summary generation

### 2) Configure environment

```bash
cp .env.example .env
```

Edit `.env` if needed.

### 3) Start services

```bash
docker compose up -d --build
```

- n8n: `http://localhost:5678`
- API + Dashboard: `http://localhost:3000`
- PostgreSQL: `localhost:5432`

### 4) Import n8n workflows

Open n8n and import files from `n8n/workflows`:

1. `01_daily_scrape_and_ingest.json`
2. `02_daily_enrichment_and_classification.json`
3. `03_weekly_summary_and_alerts.json`

Then configure credentials for PostgreSQL, OpenAI, and notification channels.

---

## Database Model

The schema is in `db/schema.sql` and supports:

- Competitor tracking
- Product catalog snapshots
- Price history over time
- Review sentiment history
- Weekly AI summaries
- Workflow run/error logs

---

## API Endpoints

- `GET /api/health`
- `GET /api/competitors`
- `GET /api/products?competitor=&category=&limit=`
- `GET /api/price-trends?days=&competitor=&category=`
- `GET /api/sentiment-trends?days=&competitor=&category=`
- `GET /api/alerts?days=`
- `POST /api/generate-summary` (uses OpenAI if key configured)

---

## Dashboard Features

- KPI cards: products tracked, average sentiment, weekly alerts
- Competitor/category/date filters
- Price trend line chart
- Sentiment trend bar chart
- Alert table for significant pricing changes

---

## Ethical & Operational Notes

- Respect `robots.txt` and website terms while scraping.
- Apply rate limiting and retry policies in n8n.
- Start with demo sources (e.g., dummyjson) before production targets.
- Store only permitted data.

---

## Suggested Delivery Sequence

1. Run scraping workflow on one source.
2. Validate DB ingestion and trend endpoints.
3. Enable AI enrichment and weekly summary workflow.
4. Validate dashboard with real runs.
5. Add alerts (email/Slack) and deployment hardening.

