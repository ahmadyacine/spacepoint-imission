import Chart from 'chart.js/auto';
import 'chartjs-adapter-date-fns';
import zoomPlugin from 'chartjs-plugin-zoom';
Chart.register(zoomPlugin);

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

let historyChart = null;
let histRefreshTimer = null;
let historyLive = false;   // paused by default

/** Refresh interval in ms based on the currently selected time range */
function refreshRate(minutes) {
    if (minutes <= 60) return 10_000;   // 10 s
    if (minutes <= 1440) return 30_000;   // 30 s
    return 60_000;                         // 60 s
}

function startHistRefresh() {
    stopHistRefresh();
    const minutes = parseInt(document.getElementById('hist-range')?.value || 60);
    histRefreshTimer = setInterval(loadHistory, refreshRate(minutes));
}

function stopHistRefresh() {
    if (histRefreshTimer) { clearInterval(histRefreshTimer); histRefreshTimer = null; }
}

window.toggleHistoryLive = () => {
    historyLive = !historyLive;
    const btn = document.getElementById('hist-live-btn');
    if (historyLive) {
        startHistRefresh();
        if (btn) {
            btn.textContent = ' Pause Live';
            btn.style.background = 'rgba(107,203,119,0.2)';
            btn.style.borderColor = 'rgba(107,203,119,0.5)';
            btn.style.color = '#6bcb77';
        }
    } else {
        stopHistRefresh();
        if (btn) {
            btn.textContent = ' Live';
            btn.style.background = 'rgba(255,255,255,0.07)';
            btn.style.borderColor = 'rgba(255,255,255,0.2)';
            btn.style.color = 'rgba(255,255,255,0.5)';
        }
    }
};

const METRICS = [
    { key: 'temp', label: 'Temperature', unit: '°C', color: '#ff6b6b' },
    { key: 'voltage', label: 'Voltage', unit: 'V', color: '#00d2ff' },
    { key: 'current', label: 'Current', unit: 'mA', color: '#ffd93d' },
    { key: 'power', label: 'Power', unit: 'mW', color: '#6bcb77' },
    { key: 'rssi', label: 'RSSI', unit: 'dBm', color: '#c77dff' },
];

// minutes → Chart.js time unit hint for smart tick spacing
function timeUnit(minutes) {
    if (minutes <= 60) return 'minute';
    if (minutes <= 1440) return 'hour';
    if (minutes <= 10080) return 'day';
    if (minutes <= 43200) return 'week';
    return 'month';
}

/**
 * Bucket rows into evenly-spaced time intervals and average metric values.
 * @param {Array}  rows          - raw data rows from the API
 * @param {number} bucketSeconds - bucket size in seconds; 0 = no aggregation
 */
function downsample(rows, bucketSeconds) {
    if (!bucketSeconds || rows.length === 0) return rows;

    const buckets = {}   // key: bucket_start_epoch → {sum, count} per metric
    const keys = METRICS.map(m => m.key);

    rows.forEach(r => {
        const bucketKey = Math.floor(r.timestamp / bucketSeconds) * bucketSeconds;
        if (!buckets[bucketKey]) {
            buckets[bucketKey] = {};
            keys.forEach(k => { buckets[bucketKey][k] = { sum: 0, count: 0 }; });
        }
        keys.forEach(k => {
            if (r[k] != null) {
                buckets[bucketKey][k].sum += r[k];
                buckets[bucketKey][k].count += 1;
            }
        });
    });

    // Build output rows sorted by timestamp
    return Object.keys(buckets)
        .map(Number)
        .sort((a, b) => a - b)
        .map(ts => {
            const out = { timestamp: ts + bucketSeconds / 2 }; // midpoint
            keys.forEach(k => {
                const { sum, count } = buckets[ts][k];
                out[k] = count ? sum / count : null;
            });
            return out;
        });
}

/**
 * Inject null sentinel rows at the edges of large time gaps so Chart.js
 * (spanGaps: false) renders a visible break instead of a phantom line.
 *
 * A "gap" is any interval between consecutive rows that is larger than
 * MAX(gapThresholdSec, 3 × median interval of the dataset).
 *
 * @param {Array}  rows            - downsampled rows (sorted by timestamp asc)
 * @param {number} gapThresholdSec - minimum gap size to consider a blackout (default 90s)
 */
function injectGapNulls(rows, gapThresholdSec = 90) {
    if (rows.length < 2) return rows;

    // Compute median inter-row interval
    const intervals = [];
    for (let i = 1; i < rows.length; i++) {
        intervals.push(rows[i].timestamp - rows[i - 1].timestamp);
    }
    intervals.sort((a, b) => a - b);
    const medianInterval = intervals[Math.floor(intervals.length / 2)];
    const threshold = Math.max(gapThresholdSec, medianInterval * 3);

    const keys = METRICS.map(m => m.key);
    const nullRow = (ts) => {
        const r = { timestamp: ts };
        keys.forEach(k => { r[k] = null; });
        return r;
    };

    const result = [];
    for (let i = 0; i < rows.length; i++) {
        result.push(rows[i]);
        if (i < rows.length - 1) {
            const gap = rows[i + 1].timestamp - rows[i].timestamp;
            if (gap > threshold) {
                // Insert a null just after the last real point and just before the next
                result.push(nullRow(rows[i].timestamp + 1));
                result.push(nullRow(rows[i + 1].timestamp - 1));
            }
        }
    }
    return result;
}

export function initHistory() {
    window.openHistoryPanel = () => {
        document.getElementById('history-modal').classList.remove('hidden');
        loadHistory();
    };

    window.closeHistoryPanel = () => {
        document.getElementById('history-modal').classList.add('hidden');
        if (historyChart) { historyChart.destroy(); historyChart = null; }
        // Stop live refresh and reset button to paused state
        stopHistRefresh();
        historyLive = false;
        const btn = document.getElementById('hist-live-btn');
        if (btn) {
            btn.textContent = ' Live';
            btn.style.background = 'rgba(255,255,255,0.07)';
            btn.style.borderColor = 'rgba(255,255,255,0.2)';
            btn.style.color = 'rgba(255,255,255,0.5)';
        }
    };

    window.loadHistory = loadHistory;

    // Backdrop close
    document.getElementById('history-modal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('history-modal')) window.closeHistoryPanel();
    });

    // Escape close
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') window.closeHistoryPanel();
    });

    // Metric checkbox toggles
    document.querySelectorAll('.hist-metric-check').forEach(cb => {
        cb.addEventListener('change', () => {
            if (!historyChart) return;
            const idx = parseInt(cb.dataset.idx);
            const meta = historyChart.getDatasetMeta(idx);
            meta.hidden = !cb.checked;
            historyChart.update();
        });
    });
}

async function loadHistory() {
    const device = document.getElementById('hist-device').value;
    const minutes = parseInt(document.getElementById('hist-range').value);
    const intervalSec = parseInt(document.getElementById('hist-interval').value);
    const statusEl = document.getElementById('hist-status');

    statusEl.textContent = 'Loading…';

    try {
        const res = await fetch(`${BACKEND_URL}/api/history?device_id=${device}&minutes=${minutes}`);
        const json = await res.json();
        const rows = json.data || [];

        // Full time window regardless of data
        const now = Date.now();
        const rangeStart = now - minutes * 60 * 1000;

        const rangeLabel = minutes >= 525600 ? '1 year'
            : minutes >= 259200 ? '6 months'
                : minutes >= 43200 ? '1 month'
                    : minutes >= 10080 ? '7 days'
                        : minutes >= 1440 ? '24 hours'
                            : minutes >= 360 ? '6 hours'
                                : minutes >= 60 ? '1 hour'
                                    : '15 min';

        const intervalLabel = intervalSec === 0 ? 'raw'
            : intervalSec < 60 ? `${intervalSec}s avg`
                : intervalSec < 3600 ? `${intervalSec / 60}min avg`
                    : intervalSec < 86400 ? `${intervalSec / 3600}h avg`
                        : '1-day avg';

        // Apply downsampling
        const plotRows = downsample(rows, intervalSec);

        // Inject null sentinels at large time gaps so the chart shows a break
        // instead of a phantom connecting line (e.g. after device/system shutdown).
        // Threshold: bigger of 90 s or 2× the chosen aggregation interval.
        const gapThreshold = Math.max(90, intervalSec * 2);
        const gapRows = injectGapNulls(plotRows, gapThreshold);

        statusEl.textContent = `${rows.length} records · last ${rangeLabel} · ${intervalLabel} (${gapRows.length} points)`;

        renderChart(gapRows, rangeStart, now, minutes);
        renderTable(plotRows, intervalSec);   // table uses clean rows (no nulls)
    } catch (e) {
        document.getElementById('hist-status').textContent = 'Failed to load data.';
        console.error('[History]', e);
    }
}

function renderChart(rows, rangeStart, rangeEnd, minutes) {
    const ctx = document.getElementById('hist-chart').getContext('2d');
    if (historyChart) { historyChart.destroy(); }

    const datasets = METRICS.map((m, idx) => ({
        label: `${m.label} (${m.unit})`,
        // Use {x, y} format so Chart.js time scale places each point correctly
        data: rows.map(r => ({
            x: r.timestamp * 1000,   // ms epoch
            y: r[m.key] ?? null
        })),
        borderColor: m.color,
        backgroundColor: m.color + '18',
        borderWidth: 2,
        pointRadius: rows.length < 300 ? 2 : 0,
        tension: 0.3,
        fill: false,
        spanGaps: false,   // show gaps where data is missing
        hidden: !document.querySelector(`.hist-metric-check[data-idx="${idx}"]`)?.checked,
    }));

    historyChart = new Chart(ctx, {
        type: 'line',
        data: { datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        title: (items) => {
                            if (!items.length) return '';
                            return new Date(items[0].parsed.x).toLocaleString();
                        },
                        label: c => {
                            const m = METRICS[c.datasetIndex];
                            if (c.parsed.y === null) return null;
                            return ` ${m.label}: ${c.parsed.y.toFixed(2)} ${m.unit}`;
                        }
                    }
                },
                zoom: {
                    pan: { enabled: true, mode: 'x' },
                    zoom: { wheel: { enabled: true, speed: 0.08 }, pinch: { enabled: true }, mode: 'x' }
                }
            },
            scales: {
                x: {
                    type: 'time',
                    min: rangeStart,   // <<< forces full selected range even if no data at edges
                    max: rangeEnd,
                    time: {
                        unit: timeUnit(minutes),
                        tooltipFormat: 'PP HH:mm:ss',
                        displayFormats: {
                            minute: 'HH:mm',
                            hour: 'MMM d HH:mm',
                            day: 'MMM d',
                            week: 'MMM d',
                            month: 'MMM yyyy',
                        }
                    },
                    grid: { color: 'rgba(255,255,255,0.06)' },
                    ticks: { color: 'rgba(255,255,255,0.5)', maxTicksLimit: 10, maxRotation: 0 }
                },
                y: {
                    display: true,
                    grace: '10%',
                    grid: { color: 'rgba(255,255,255,0.06)' },
                    ticks: { color: 'rgba(255,255,255,0.5)' }
                }
            },
            interaction: { mode: 'nearest', axis: 'x', intersect: false }
        }
    });

    window.resetHistoryZoom = () => historyChart?.resetZoom();
}

export function getHistoryChart() {
    return historyChart;
}

function renderTable(rows) {
    const tbody = document.getElementById('hist-table-body');
    tbody.innerHTML = '';

    if (!rows.length) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:rgba(255,255,255,0.4);padding:20px;">No data for this range</td></tr>';
        return;
    }

    const display = [...rows].reverse().slice(0, 200);
    display.forEach(r => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${new Date(r.timestamp * 1000).toLocaleString()}</td>
            <td>${r.temp?.toFixed(2) ?? '--'}</td>
            <td>${r.voltage?.toFixed(3) ?? '--'}</td>
            <td>${r.current?.toFixed(2) ?? '--'}</td>
            <td>${r.power?.toFixed(2) ?? '--'}</td>
            <td>${r.rssi ?? '--'}</td>
        `;
        tbody.appendChild(tr);
    });
}
