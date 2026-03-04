const { useEffect, useMemo, useRef, useState } = React;

function sortByDay(rows) {
  return [...rows].sort((a, b) => new Date(a.day) - new Date(b.day));
}

function latestWindow(rows, size) {
  const sorted = sortByDay(rows);
  return sorted.slice(Math.max(0, sorted.length - size));
}

function robustBounds(values) {
  if (!values.length) return { min: 0, max: 100 };
  if (values.length < 8) {
    const min = Math.min(...values);
    const max = Math.max(...values);
    const pad = Math.max(3, (max - min) * 0.1);
    return { min: Math.max(0, Math.floor(min - pad)), max: Math.ceil(max + pad) };
  }
  const sorted = [...values].sort((a, b) => a - b);
  const start = Math.floor(sorted.length * 0.1);
  const end = Math.ceil(sorted.length * 0.9);
  const trimmed = sorted.slice(start, end);
  const tMin = Math.min(...trimmed);
  const tMax = Math.max(...trimmed);
  const pad = Math.max(5, (tMax - tMin) * 0.15);
  return { min: Math.max(0, Math.floor(tMin - pad)), max: Math.ceil(tMax + pad) };
}

function createGradient(ctx, area) {
  const gradient = ctx.createLinearGradient(0, area.bottom, 0, area.top);
  gradient.addColorStop(0, 'rgba(59, 130, 246, 0.04)');
  gradient.addColorStop(1, 'rgba(59, 130, 246, 0.55)');
  return gradient;
}

function PriceMomentumChart({ rows }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    const recentRows = latestWindow(rows, 14);
    const labels = recentRows.map((r) => new Date(r.day).toLocaleDateString());
    const values = recentRows.map((r) => Number(r.avg_price)).filter((v) => Number.isFinite(v));
    const movingAvg = values.map((_, i, arr) => {
      const window = arr.slice(Math.max(0, i - 3), i + 1);
      return Number((window.reduce((a, b) => a + b, 0) / window.length).toFixed(2));
    });

    const { min: yMin, max: yMax } = robustBounds(values);

    const ctx = canvasRef.current.getContext('2d');
    if (chartRef.current) chartRef.current.destroy();

    chartRef.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Avg Price',
            data: values,
            borderColor: '#3b82f6',
            borderWidth: 2.2,
            fill: true,
            tension: 0.35,
            backgroundColor: (context) => {
              const { chart } = context;
              const { ctx: context2d, chartArea } = chart;
              if (!chartArea) return 'rgba(59, 130, 246, 0.2)';
              return createGradient(context2d, chartArea);
            },
          },
          {
            label: '4-day Moving Avg',
            data: movingAvg,
            borderColor: '#f59e0b',
            borderWidth: 2,
            fill: false,
            tension: 0.25,
            borderDash: [6, 6],
            pointRadius: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { labels: { color: '#d1d5db' } },
          tooltip: {
            callbacks: {
              label: (ctx2) => `${ctx2.dataset.label}: $${ctx2.parsed.y}`,
            },
          },
        },
        scales: {
          x: {
            ticks: { color: '#9ca3af', maxTicksLimit: 7, maxRotation: 0, autoSkip: true },
            grid: { color: 'rgba(156,163,175,0.13)' },
          },
          y: {
            min: yMin,
            max: yMax,
            ticks: { color: '#9ca3af', callback: (v) => `$${Number(v).toFixed(0)}` },
            grid: { color: 'rgba(156,163,175,0.13)' },
          },
        },
      },
    });
    return () => {
      if (chartRef.current) chartRef.current.destroy();
    };
  }, [rows]);

  return <canvas ref={canvasRef} />;
}

function SentimentPulseChart({ rows }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    const recentRows = latestWindow(rows, 10);
    const labels = recentRows.map((r) => new Date(r.day).toLocaleDateString());
    const sentiment = recentRows.map((r) => {
      const v = Number(r.avg_sentiment);
      if (!Number.isFinite(v)) return 0;
      return Math.max(-1, Math.min(1, v));
    });

    const ctx = canvasRef.current.getContext('2d');
    if (chartRef.current) chartRef.current.destroy();

    chartRef.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Avg Sentiment',
          data: sentiment,
          borderRadius: 6,
          backgroundColor: sentiment.map((v) => (v >= 0 ? '#22c55e' : '#ef4444')),
          borderSkipped: false,
          maxBarThickness: 22,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: { legend: { labels: { color: '#d1d5db' } } },
        scales: {
          x: {
            ticks: { color: '#9ca3af', maxTicksLimit: 10, autoSkip: true, maxRotation: 0 },
            grid: { color: 'rgba(156,163,175,0.1)' },
          },
          y: {
            min: -1,
            max: 1,
            ticks: { color: '#9ca3af', stepSize: 0.2 },
            grid: { color: 'rgba(156,163,175,0.12)' },
          },
        },
      },
    });
    return () => {
      if (chartRef.current) chartRef.current.destroy();
    };
  }, [rows]);

  return <canvas ref={canvasRef} />;
}

const fallback = {
  competitors: [{ name: 'DemoMart' }, { name: 'ShopSphere' }, { name: 'ValueHub' }],
  products: Array.from({ length: 128 }, (_, i) => ({ id: i + 1 })),
  prices: Array.from({ length: 14 }, (_, i) => ({ day: `2026-02-${String(i + 1).padStart(2, '0')}`, avg_price: 100 + Math.sin(i / 2) * 12 + i })),
  sentiment: Array.from({ length: 14 }, (_, i) => ({ day: `2026-02-${String(i + 1).padStart(2, '0')}`, avg_sentiment: Math.sin(i / 3) * 0.7 })),
  alerts: [{ observed_at: new Date().toISOString(), competitor: 'DemoMart', title: 'Smartphone Alpha', price: 499, previous_price: 549, pct_change: -9.11 }],
};

function App() {
  const [competitors, setCompetitors] = useState([]);
  const [products, setProducts] = useState([]);
  const [prices, setPrices] = useState([]);
  const [sentiment, setSentiment] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [competitor, setCompetitor] = useState('');
  const [category, setCategory] = useState('');
  const [days, setDays] = useState('30');
  const [warning, setWarning] = useState('');

  const avgSentiment = useMemo(() => {
    if (!sentiment.length) return '0.000';
    return (sentiment.reduce((acc, row) => acc + Number(row.avg_sentiment), 0) / sentiment.length).toFixed(3);
  }, [sentiment]);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (competitor) params.set('competitor', competitor);
    if (category.trim()) params.set('category', category.trim());
    params.set('days', days);
    return params.toString();
  }, [competitor, category, days]);

  async function getJSON(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed: ${url}`);
    return res.json();
  }

  async function refresh() {
    try {
      const [cRows, pRows, prRows, sRows, aRows] = await Promise.all([
        getJSON('/api/competitors'),
        getJSON(`/api/products?limit=500&${query}`),
        getJSON(`/api/price-trends?${query}`),
        getJSON(`/api/sentiment-trends?${query}`),
        getJSON(`/api/alerts?days=${days}`),
      ]);
      setCompetitors(cRows);
      setProducts(pRows);
      setPrices(prRows);
      setSentiment(sRows);
      setAlerts(aRows);
      setWarning('');
    } catch (_err) {
      setCompetitors(fallback.competitors);
      setProducts(fallback.products);
      setPrices(fallback.prices);
      setSentiment(fallback.sentiment);
      setAlerts(fallback.alerts);
      setWarning('Live API unavailable, displaying demo data preview.');
    }
  }

  useEffect(() => {
    refresh();
  }, [query]);

  return (
    <div className="app-shell">
      <header className="hero">
        <h1>AI Competitive Intelligence Command Center</h1>
        <p>Beautifully track pricing pressure, sentiment pulse, and market shocks in one screen.</p>
      </header>

      {warning ? <div className="warning">{warning}</div> : null}

      <section className="filters card-glass">
        <label>Competitor
          <select value={competitor} onChange={(e) => setCompetitor(e.target.value)}>
            <option value="">All</option>
            {competitors.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
          </select>
        </label>
        <label>Category
          <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="smartphones" />
        </label>
        <label>Days
          <select value={days} onChange={(e) => setDays(e.target.value)}>
            <option value="7">7</option>
            <option value="30">30</option>
            <option value="90">90</option>
          </select>
        </label>
        <button onClick={refresh}>Refresh Intelligence</button>
      </section>

      <section className="kpis">
        <article className="card-glass"><span>Tracked Products</span><strong>{products.length}</strong></article>
        <article className="card-glass"><span>Avg Sentiment</span><strong>{avgSentiment}</strong></article>
        <article className="card-glass"><span>Market Alerts</span><strong>{alerts.length}</strong></article>
      </section>

      <section className="charts">
        <article className="card-glass chart-card">
          <h3>Price Momentum Ribbon (Last 14 Days)</h3>
          <PriceMomentumChart rows={prices} />
        </article>
        <article className="card-glass chart-card">
          <h3>Sentiment Stability Bars (Last 10 Days)</h3>
          <SentimentPulseChart rows={sentiment} />
        </article>
      </section>

      <section className="card-glass">
        <h3>High-Impact Price Alerts</h3>
        <table>
          <thead><tr><th>Date</th><th>Competitor</th><th>Product</th><th>Price</th><th>Prev</th><th>Δ%</th></tr></thead>
          <tbody>
            {alerts.map((r, idx) => (
              <tr key={`${r.title}-${idx}`}>
                <td>{new Date(r.observed_at).toLocaleDateString()}</td>
                <td>{r.competitor}</td>
                <td>{r.title}</td>
                <td>{r.price}</td>
                <td>{r.previous_price}</td>
                <td className={Number(r.pct_change) >= 0 ? 'positive' : 'negative'}>{r.pct_change}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
