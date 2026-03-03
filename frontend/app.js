const competitorFilter = document.getElementById('competitorFilter');
const categoryFilter = document.getElementById('categoryFilter');
const daysFilter = document.getElementById('daysFilter');
const refreshBtn = document.getElementById('refreshBtn');
const alertsTable = document.getElementById('alertsTable');

let priceChart;
let sentimentChart;

const q = () => {
  const params = new URLSearchParams();
  const competitor = competitorFilter.value;
  const category = categoryFilter.value.trim();
  const days = daysFilter.value;
  if (competitor) params.set('competitor', competitor);
  if (category) params.set('category', category);
  params.set('days', days);
  return params.toString();
};

async function getJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed: ${url}`);
  return res.json();
}

async function loadCompetitors() {
  const competitors = await getJSON('/api/competitors');
  competitorFilter.innerHTML = '<option value="">All</option>' +
    competitors.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
}

<<<<<<< ours
<<<<<<< ours
// // function renderLineChart(ctx, rows) {
// //   if (priceChart) priceChart.destroy();
// //   priceChart = new Chart(ctx, {
// //     type: 'line',
// //     data: {
// //       labels: rows.map(r => r.day),
// //       datasets: [{  label: 'Avg Price',  data: rows.map(r => Number(r.avg_price)),  borderColor: '#2563eb',fill: false,tension: 0.35}],
// //     },
// //     options: { responsive: true, maintainAspectRatio: false },
// //   });
// // }
=======
=======
>>>>>>> theirs
function renderLineChart(ctx, rows) {
  if (priceChart) priceChart.destroy();
  priceChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: rows.map(r => r.day),
      datasets: [{ label: 'Avg Price', data: rows.map(r => r.avg_price), borderColor: '#2563eb', fill: false }],
    },
    options: { responsive: true, maintainAspectRatio: false },
  });
}
<<<<<<< ours
>>>>>>> theirs
=======
>>>>>>> theirs

function renderBarChart(ctx, rows) {
  if (sentimentChart) sentimentChart.destroy();
  sentimentChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: rows.map(r => r.day),
<<<<<<< ours
<<<<<<< ours
      datasets: [{ label: 'Avg Sentiment', data: rows.map(r => Number(r.avg_sentiment)), backgroundColor: '#16a34a' }],
=======
      datasets: [{ label: 'Avg Sentiment', data: rows.map(r => r.avg_sentiment), backgroundColor: '#16a34a' }],
>>>>>>> theirs
=======
      datasets: [{ label: 'Avg Sentiment', data: rows.map(r => r.avg_sentiment), backgroundColor: '#16a34a' }],
>>>>>>> theirs
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: { y: { min: -1, max: 1 } },
    },
  });
}

function renderAlerts(rows) {
  alertsTable.innerHTML = rows.map((r) => {
    const changeClass = Number(r.pct_change) >= 0 ? 'positive' : 'negative';
    return `<tr>
      <td>${new Date(r.observed_at).toLocaleDateString()}</td>
      <td>${r.competitor}</td>
      <td>${r.title}</td>
      <td>${r.price}</td>
      <td>${r.previous_price}</td>
      <td class="${changeClass}">${r.pct_change}%</td>
    </tr>`;
  }).join('');
}

async function refreshDashboard() {
  const query = q();
  const [products, prices, sentiment, alerts] = await Promise.all([
    getJSON(`/api/products?limit=500&${query}`),
    getJSON(`/api/price-trends?${query}`),
    getJSON(`/api/sentiment-trends?${query}`),
    getJSON(`/api/alerts?days=${daysFilter.value}`),
  ]);

  document.getElementById('kpiProducts').textContent = products.length;
  const avgSent = sentiment.length
    ? (sentiment.reduce((acc, cur) => acc + Number(cur.avg_sentiment), 0) / sentiment.length).toFixed(3)
    : '0.000';
  document.getElementById('kpiSentiment').textContent = avgSent;
  document.getElementById('kpiAlerts').textContent = alerts.length;

  renderLineChart(document.getElementById('priceChart'), prices);
  renderBarChart(document.getElementById('sentimentChart'), sentiment);
  renderAlerts(alerts);
}

refreshBtn.addEventListener('click', () => refreshDashboard().catch(console.error));

loadCompetitors().then(() => refreshDashboard()).catch(console.error);
