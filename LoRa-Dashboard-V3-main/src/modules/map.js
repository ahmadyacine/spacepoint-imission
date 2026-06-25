/**
 * Tactical Map Module using Leaflet.js
 * Provides 2D ground tracking with historical breadcrumb trails.
 */

let map;
let marker;
let pathLine;
const maxPathPoints = 1000;
const historyPath = [];

export function initMap() {
    const mapContainer = document.getElementById('world-map');
    if (!mapContainer) return;

    // 1. Initialize Leaflet Map
    // We start at a neutral view (ocean)
    map = L.map('world-map', {
        zoomControl: true,
        attributionControl: true
    }).setView([0, 0], 2);

    // 2. Add Dark Matter Tile Layer (Sleek Tactical Look)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
    }).addTo(map);

    // 3. Create Satellite Marker Icon (Simple Pulse)
    const satIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="width: 14px; height: 14px; background: #00d2ff; border: 2px solid #fff; border-radius: 50%; box-shadow: 0 0 15px #00d2ff;"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7]
    });

    marker = L.marker([0, 0], { icon: satIcon }).addTo(map);

    // 4. Initialize Breadcrumb Polyline
    pathLine = L.polyline([], {
        color: '#00d2ff',
        weight: 2,
        opacity: 0.6,
        dashArray: '5, 8'
    }).addTo(map);
}

/**
 * Updates the map marker and draws the ground track trail.
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 */
export function updateMap(lat, lon) {
    if (!map || !marker || isNaN(lat) || isNaN(lon)) return;

    const newPos = [lat, lon];

    // 1. Update Marker Position
    marker.setLatLng(newPos);

    // 2. Update Breadcrumb Trail
    historyPath.push(newPos);
    if (historyPath.length > maxPathPoints) {
        historyPath.shift();
    }
    pathLine.setLatLngs(historyPath);

    // 3. Auto-Pan to Position (optional, but requested for high-precision)
    // We only pan if the point is far from current center to avoid constant jumping
    const center = map.getCenter();
    const dist = map.distance(center, L.latLng(lat, lon));
    
    // If distance > 1000km, pan to new center smoothly
    if (dist > 1000000) {
        map.panTo(newPos, { animate: true, duration: 1.0 });
    }
}

/**
 * Resizes the map container - important when UI sections toggle
 */
export function resizeMap() {
    if (map) {
        setTimeout(() => map.invalidateSize(), 300);
    }
}
