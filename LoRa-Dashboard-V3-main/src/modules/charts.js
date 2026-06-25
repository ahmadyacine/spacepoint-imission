
import Chart from 'chart.js/auto';
import zoomPlugin from 'chartjs-plugin-zoom';
Chart.register(zoomPlugin);

const charts = {};
const MAX_HISTORY = 50;

// Metric Configuration — 6 metrics = 2 rows × 3 columns
export const metrics = [
    { id: 'temp',        label: 'Temperature', unit: '°C',  icon: '', color: '#ff6b6b' },
    { id: 'batt',        label: 'Voltage',     unit: 'V',   icon: '', color: '#00c6ff' },
    { id: 'item_current', label: 'Current',    unit: 'mA',  icon: '', color: '#f9d423' },
    { id: 'power',       label: 'Power',       unit: 'mW',  icon: '', color: '#a855f7' },
    { id: 'rssi',        label: 'Signal RSSI', unit: 'dBm', icon: '', color: '#00ff7f' },
    { id: 'snr',         label: 'SNR',         unit: 'dB',  icon: '', color: '#39ff14' },
    // Extras (available but cards not shown by default in 2x3 grid)
    // { id: 'hum',   label: 'Humidity', unit: '%',   icon: '', color: '#00d2ff' },
];

export function initDashboard(container) {
    if (!container) return;

    // Generate HTML Cards
    container.innerHTML = metrics.map(m => `
    <div class="card" id="card-${m.id}">
      <div class="card-header">
        <div class="card-title">
          ${m.icon} ${m.label}
          ${(m.id === 'rssi' || m.id === 'snr') ? '<span class="wired-notice hidden" style="font-size:0.65rem; color:#ff9800; font-weight:normal; margin-left:8px; font-style:italic;">(Wired USB)</span>' : ''}
        </div>
        <div class="card-value">
          <span class="value" id="val-${m.id}">--</span><span class="card-unit">${m.unit}</span>
        </div>
      </div>
      <div class="card-graph" onclick="openChartModal('${m.id}')">
         <div class="graph-container" style="position: relative; height: 60px; width: 100%;">
            <canvas id="chart-${m.id}"></canvas>
         </div>
      </div>
    </div>
  `).join('');

    // Setup Global Modal Functions
    window.expandedChartInstance = null;

    window.closeChartModal = () => {
        const modal = document.getElementById('chart-modal');
        modal.classList.add('hidden');
        if (window.expandedChartInstance) {
            window.expandedChartInstance.destroy();
            window.expandedChartInstance = null;
        }
        window.expandedChartId = null;
    };

    // Close on backdrop click
    document.getElementById('chart-modal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('chart-modal')) window.closeChartModal();
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') window.closeChartModal();
    });

    window.openChartModal = (id) => {
        const metric = metrics.find(m => m.id === id);
        if (!metric) return;

        window.expandedChartId = id;

        const modal = document.getElementById('chart-modal');
        modal.classList.remove('hidden');

        // Destroy previous instance if any
        if (window.expandedChartInstance) {
            window.expandedChartInstance.destroy();
            window.expandedChartInstance = null;
        }

        const sourceChart = charts[id];
        const rawData = sourceChart.data.datasets[0].data.filter(v => v !== null);

        // Compute stats
        const min = rawData.length ? Math.min(...rawData).toFixed(2) : '--';
        const max = rawData.length ? Math.max(...rawData).toFixed(2) : '--';
        const avg = rawData.length ? (rawData.reduce((a, b) => a + b, 0) / rawData.length).toFixed(2) : '--';
        const latest = rawData.length ? rawData[rawData.length - 1].toFixed(2) : '--';

        document.getElementById('modal-chart-title').innerHTML =
            `${metric.icon} ${metric.label} &nbsp;
            <span style="font-size:0.75rem;font-weight:400;color:rgba(255,255,255,0.5);margin-left:4px;">
              Now: <b style="color:#00d2ff">${latest}${metric.unit}</b> &nbsp;|
              Min: <b>${min}</b> &nbsp;|
              Max: <b>${max}</b> &nbsp;|
              Avg: <b>${avg}</b>
            </span>`;

        const ctx = document.getElementById('expanded-chart').getContext('2d');

        window.expandedChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [...sourceChart.data.labels],
                datasets: [{
                    ...sourceChart.data.datasets[0],
                    pointRadius: 3,
                    borderWidth: 3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: { label: (c) => `${c.parsed.y.toFixed(2)} ${metric.unit}` }
                    },
                    zoom: {
                        pan: {
                            enabled: true,
                            mode: 'x',
                            cursor: 'grab'
                        },
                        zoom: {
                            wheel: { enabled: true, speed: 0.1 },
                            pinch: { enabled: true },
                            mode: 'x',
                        }
                    }
                },
                scales: {
                    x: {
                        display: true,
                        grid: { color: 'rgba(255, 255, 255, 0.08)' },
                        ticks: { color: 'rgba(255, 255, 255, 0.6)', maxTicksLimit: 10 }
                    },
                    y: {
                        display: true,
                        grace: '10%',
                        grid: { color: 'rgba(255, 255, 255, 0.08)' },
                        ticks: { color: 'rgba(255, 255, 255, 0.6)' }
                    }
                },
                animation: false,
                interaction: { mode: 'nearest', axis: 'x', intersect: false }
            }
        });

        // Expose resetZoom globally so the HTML button can call it
        window.resetExpandedZoom = () => {
            if (window.expandedChartInstance) {
                window.expandedChartInstance.resetZoom();
            }
        };
    };

    // Initialize Charts
    metrics.forEach(m => {
        const ctx = document.getElementById(`chart-${m.id}`).getContext('2d');

        // Create Gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, 60);
        gradient.addColorStop(0, m.color + '66'); // 40% opacity
        gradient.addColorStop(1, 'transparent');

        charts[m.id] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: Array(MAX_HISTORY).fill(''),
                datasets: [{
                    data: Array(MAX_HISTORY).fill(null),
                    borderColor: m.color,
                    backgroundColor: gradient,
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true,
                    pointRadius: 0,
                    pointHoverRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: (context) => `${context.parsed.y} ${m.unit}`
                        }
                    }
                },
                scales: {
                    x: {
                        display: true, // Show X Axis (Time)
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: 'rgba(255, 255, 255, 0.5)',
                            maxTicksLimit: 6
                        }
                    },
                    y: {
                        display: true, // Show Y Axis (Value)
                        grace: '10%',
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: 'rgba(255, 255, 255, 0.5)'
                        }
                    }
                },
                animation: false,
                interaction: {
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false
                }
            }
        });
    });
}

export function resetCharts() {
    Object.values(charts).forEach(chart => {
        chart.data.labels = Array(MAX_HISTORY).fill('');
        chart.data.datasets.forEach(dataset => {
            dataset.data = Array(MAX_HISTORY).fill(null);
        });
        chart.update();
    });

    // Also clear the values
    metrics.forEach(m => {
        const valEl = document.getElementById(`val-${m.id}`);
        if (valEl) valEl.innerText = '--';
    });
}

export function updateMetric(id, value, timestamp) {
    // Always update the numeric display (even when paused so current value stays visible)
    const valEl = document.getElementById(`val-${id}`);
    if (valEl) valEl.innerText = value;

    // Skip chart update if paused
    if (window.isGraphPaused) return;

    // Update Chart
    const chart = charts[id];
    if (chart) {
        const label = new Date(timestamp * 1000).toLocaleTimeString();

        // Remove oldest
        chart.data.labels.shift();
        chart.data.datasets[0].data.shift();

        // Add new
        chart.data.labels.push(label);
        chart.data.datasets[0].data.push(value);

        chart.update();

        // Live-update expanded chart if modal is open and showing this metric
        const modal = document.getElementById('chart-modal');
        if (window.expandedChartInstance && modal && !modal.classList.contains('hidden')) {
            if (window.expandedChartId === id) {
                const expanded = window.expandedChartInstance;
                expanded.data.labels.shift();
                expanded.data.datasets[0].data.shift();
                expanded.data.labels.push(label);
                expanded.data.datasets[0].data.push(value);
                expanded.update();
            }
        }
    }
}
