import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { getHistoryChart } from './history.js';

const METRICS = [
    { key: 'temp', label: 'Temperature', unit: 'degC' },
    { key: 'voltage', label: 'Voltage', unit: 'V' },
    { key: 'current', label: 'Current', unit: 'mA' },
    { key: 'power', label: 'Power', unit: 'mW' },
    { key: 'rssi', label: 'RSSI', unit: 'dBm' },
];

// Color palette matching the Space Purple dashboard
const ACCENT = [155, 114, 192];   // #9b72c0
const ACCENT_GLOW = [101, 63, 132]; // #653f84
const WHITE = [255, 255, 255];
const BLACK = [0, 0, 0];
const GRAY_DARK = [60, 60, 60];
const GRAY_LIGHT = [240, 240, 240];

const BG_DARK = [13, 6, 24];      // Deep space purple #0d0618
const BG_MID = [36, 17, 52];      // Mid purple #241134
const BG_CARD = [45, 24, 64];     // Card purple

function setFill(doc, [r, g, b]) { doc.setFillColor(r, g, b); }
function setDraw(doc, [r, g, b]) { doc.setDrawColor(r, g, b); }
function setColor(doc, [r, g, b]) { doc.setTextColor(r, g, b); }

/** Utility to load image as Base64 for jsPDF */
async function loadImageAsBase64(url) {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => resolve(null);
        img.src = url;
    });
}

/** Strip emoji and non-latin characters that Helvetica cannot render */
function stripEmoji(str) {
    return (str || '')
        .replace(/[^\x00-\x7E\xA0-\xFF]/g, '')  // keep Basic Latin + Latin-1
        .replace(/\s{2,}/g, ' ')                  // collapse extra spaces
        .trim();
}

/**
 * Compute per-metric summary stats from a rows array.
 */
function computeStats(rows) {
    return METRICS.map(m => {
        const vals = rows.map(r => r[m.key]).filter(v => v != null);
        if (!vals.length) return { ...m, min: '--', max: '--', avg: '--', count: 0 };
        const min = Math.min(...vals);
        const max = Math.max(...vals);
        const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
        return { ...m, min: min.toFixed(2), max: max.toFixed(2), avg: avg.toFixed(2), count: vals.length };
    });
}

export async function exportHistoryPDF() {
    const btn = document.getElementById('hist-pdf-btn');
    const origText = btn?.textContent;
    if (btn) { btn.textContent = 'Generating...'; btn.disabled = true; }

    try {
        // --- Preload Logo ---
        const logoData = await loadImageAsBase64('/logo.png');

        // --- Gather UI state ---
        const deviceEl = document.getElementById('hist-device');
        const rangeEl = document.getElementById('hist-range');
        const intervalEl = document.getElementById('hist-interval');
        const modeEl = document.getElementById('hist-pdf-mode');

        const isBW = modeEl?.value === 'bw';

        const deviceName = stripEmoji(deviceEl?.options[deviceEl.selectedIndex]?.text) || 'Unknown';
        const rangeName = stripEmoji(rangeEl?.options[rangeEl.selectedIndex]?.text) || 'Unknown';
        const intervalName = stripEmoji(intervalEl?.options[intervalEl.selectedIndex]?.text) || 'Unknown';
        const statusText = stripEmoji(document.getElementById('hist-status')?.textContent) || '';
        const generatedAt = new Date().toLocaleString();

        // --- Chart screenshot ---
        const chartCanvas = document.getElementById('hist-chart');
        let chartImgData = null;
        if (chartCanvas) {
            const hChart = getHistoryChart();
            let originalTicks = {};
            let originalGrid = {};

            if (isBW && hChart) {
                // Temporarily swap to "Light Theme" for capture
                ['x', 'y'].forEach(axis => {
                    originalTicks[axis] = { ...hChart.options.scales[axis].ticks };
                    originalGrid[axis] = { ...hChart.options.scales[axis].grid };

                    hChart.options.scales[axis].ticks.color = '#333333';
                    hChart.options.scales[axis].grid.color = 'rgba(0,0,0,0.1)';
                });
                hChart.update('none');
            }

            // If B&W, we want a white background for the chart capture too
            const snap = await html2canvas(chartCanvas, {
                backgroundColor: isBW ? '#ffffff' : '#0d0618',
                scale: 2,
                useCORS: true,
                logging: false,
            });
            chartImgData = snap.toDataURL('image/png');

            if (isBW && hChart) {
                // Restore original theme
                ['x', 'y'].forEach(axis => {
                    hChart.options.scales[axis].ticks.color = originalTicks[axis].color;
                    hChart.options.scales[axis].grid.color = originalGrid[axis].color;
                });
                hChart.update('none');
            }
        }

        // --- Collect table rows ---
        const tbody = document.getElementById('hist-table-body');
        const tableRows = [];
        if (tbody) {
            tbody.querySelectorAll('tr').forEach(tr => {
                const cells = [...tr.querySelectorAll('td')].map(td => td.textContent.trim());
                if (cells.length) tableRows.push(cells);
            });
        }

        // --- Compute stats from table rows (re-parse) ---
        const parsedRows = tableRows.map(r => ({
            temp: parseFloat(r[1]) || null,
            voltage: parseFloat(r[2]) || null,
            current: parseFloat(r[3]) || null,
            power: parseFloat(r[4]) || null,
            rssi: parseFloat(r[5]) || null,
        }));
        const stats = computeStats(parsedRows);

        // ════════════════════════════════════════════
        //  BUILD PDF
        // ════════════════════════════════════════════
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const PW = doc.internal.pageSize.getWidth();   // 210
        const PH = doc.internal.pageSize.getHeight();  // 297
        let Y = 0;

        // Theme colors
        const c_bg = isBW ? WHITE : BG_DARK;
        const c_head = isBW ? GRAY_LIGHT : BG_MID;
        const c_accent = isBW ? BLACK : ACCENT;
        const c_text = isBW ? BLACK : WHITE;
        const c_draw = isBW ? BLACK : ACCENT_GLOW;
        const c_card = isBW ? WHITE : BG_CARD;
        const c_stripe = isBW ? GRAY_LIGHT : BG_MID;
        const c_table_head = isBW ? BLACK : [45, 30, 80];

        // ── Background ──
        setFill(doc, c_bg);
        doc.rect(0, 0, PW, PH, 'F');

        // ── Header Banner ──
        setFill(doc, c_head);
        doc.rect(0, 0, PW, 32, 'F');
        setDraw(doc, c_draw);
        doc.setLineWidth(0.8);
        doc.line(0, 32, PW, 32);

        // Logo image (In B&W we might want to invert or just keep as is)
        if (logoData) {
            doc.addImage(logoData, 'PNG', 14, 8, 30, 16);
        } else {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(20);
            setColor(doc, c_text);
            doc.text('Cube-Sat Ground Station', 14, 12);
        }

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        setColor(doc, c_accent);
        doc.text('TELEMETRY MISSION REPORT', logoData ? 50 : 14, 18);

        doc.setFontSize(8);
        setColor(doc, c_text);
        doc.text(`Generated: ${generatedAt}`, PW - 14, 12, { align: 'right' });
        setColor(doc, c_accent);
        doc.text(`Target: ${deviceName}`, PW - 14, 20, { align: 'right' });

        Y = 42;

        // ── Meta Pills row ──
        const pills = [
            { label: 'Time Range', value: rangeName },
            { label: 'Interval', value: intervalName },
            { label: 'Summary', value: statusText },
        ];
        const pillW = (PW - 28 - 6) / 3;
        pills.forEach((p, i) => {
            const px = 14 + i * (pillW + 3);
            setFill(doc, c_card);
            setDraw(doc, c_draw);
            doc.setLineWidth(0.3);
            doc.roundedRect(px, Y, pillW, 12, 2, 2, 'FD');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(6.5);
            setColor(doc, c_accent);
            doc.text(p.label.toUpperCase(), px + 3, Y + 4.5);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            setColor(doc, c_text);
            const truncated = p.value.length > 38 ? p.value.slice(0, 37) + '...' : p.value;
            doc.text(truncated, px + 3, Y + 9.5);
        });
        Y += 18;

        // ── Section: Chart ──
        if (chartImgData) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            setColor(doc, c_accent);
            doc.text('[ Chart ]', 14, Y + 4);
            Y += 8;

            const chartH = 60;
            setFill(doc, c_card);
            doc.rect(14, Y, PW - 28, chartH, 'F');
            doc.addImage(chartImgData, 'PNG', 14, Y, PW - 28, chartH);
            setDraw(doc, c_draw);
            doc.setLineWidth(0.3);
            doc.rect(14, Y, PW - 28, chartH);
            Y += chartH + 8;
        }

        // ── Section: Stats Table ──
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        setColor(doc, c_accent);
        doc.text('[ Metric Summary ]', 14, Y + 4);
        Y += 9;

        const statsColW = [(PW - 28) * 0.28, (PW - 28) * 0.18, (PW - 28) * 0.18, (PW - 28) * 0.18, (PW - 28) * 0.18];
        const statsHeaders = ['Metric', 'Min', 'Max', 'Avg', 'Readings'];
        const statsRowH = 7;

        // Header row
        setFill(doc, c_table_head);
        doc.rect(14, Y, PW - 28, statsRowH, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        setColor(doc, isBW ? WHITE : WHITE);
        let cx = 14;
        statsHeaders.forEach((h, i) => {
            doc.text(h, cx + 2, Y + 5);
            cx += statsColW[i];
        });
        Y += statsRowH;

        stats.forEach((s, si) => {
            setFill(doc, si % 2 === 0 ? c_card : c_stripe);
            doc.rect(14, Y, PW - 28, statsRowH, 'F');
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.5);
            setColor(doc, c_text);
            const cells = [`${s.label} (${s.unit})`.replace('°', 'deg'), s.min, s.max, s.avg, String(s.count)];
            cx = 14;
            cells.forEach((c, i) => {
                doc.text(c, cx + 2, Y + 5);
                cx += statsColW[i];
            });
            Y += statsRowH;
        });

        Y += 8;

        // ── Section: Data Table ──
        if (tableRows.length > 0) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            setColor(doc, c_accent);
            doc.text('[ Data Table ]', 14, Y + 4);
            Y += 9;

            const colW = [(PW - 28) * 0.28, (PW - 28) * 0.14, (PW - 28) * 0.14, (PW - 28) * 0.16, (PW - 28) * 0.14, (PW - 28) * 0.14];
            const headers = ['Time', 'Temp (degC)', 'Voltage (V)', 'Current (mA)', 'Power (mW)', 'RSSI (dBm)'];
            const rowH = 6;

            // Table header
            setFill(doc, c_table_head);
            doc.rect(14, Y, PW - 28, rowH, 'F');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(6.5);
            setColor(doc, WHITE);
            cx = 14;
            headers.forEach((h, i) => { doc.text(h, cx + 1.5, Y + 4.2); cx += colW[i]; });
            Y += rowH;

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(6);
            setColor(doc, c_text);

            tableRows.forEach((row, ri) => {
                // New page if needed
                if (Y + rowH > PH - 12) {
                    doc.addPage();
                    setFill(doc, c_bg);
                    doc.rect(0, 0, PW, PH, 'F');
                    Y = 14;
                }
                setFill(doc, ri % 2 === 0 ? c_card : c_stripe);
                doc.rect(14, Y, PW - 28, rowH, 'F');
                cx = 14;
                row.forEach((cell, i) => {
                    doc.text(cell, cx + 1.5, Y + 4);
                    cx += colW[i];
                });
                Y += rowH;
            });
        }

        // ── Footer ──
        const totalPages = doc.internal.getNumberOfPages();
        for (let p = 1; p <= totalPages; p++) {
            doc.setPage(p);
            setFill(doc, c_head);
            doc.rect(0, PH - 10, PW, 10, 'F');
            setDraw(doc, c_draw);
            doc.setLineWidth(0.3);
            doc.line(0, PH - 10, PW, PH - 10);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7);
            setColor(doc, isBW ? GRAY_DARK : c_accent);
            doc.text('Cube-Sat Ground Station — Telemetry Export', 14, PH - 4);
            doc.text(`Page ${p} of ${totalPages}`, PW - 14, PH - 4, { align: 'right' });
        }

        // ── Save ──
        const filename = `ground-station-report-${deviceName.replace(/\s+/g, '_')}-${Date.now()}.pdf`;
        doc.save(filename);

    } finally {
        if (btn) { btn.textContent = origText; btn.disabled = false; }
    }
}
