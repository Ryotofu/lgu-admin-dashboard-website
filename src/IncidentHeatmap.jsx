import React, { useEffect, useRef, useState, useMemo } from 'react';

// Defensive coordinate parser to handle various Firestore location schemas
const parseCoordinates = (report) => {
  let lat = parseFloat(report.latitude || report.lat);
  let lng = parseFloat(report.longitude || report.lng || report.long);

  if (!isNaN(lat) && !isNaN(lng)) {
    return { lat, lng };
  }

  const locationString = report.location || report.address || '';
  const match = locationString.match(/(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
  if (match) {
    return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
  }

  return null;
};

// Helper function to return strict 4-Tier severity color profiles
const getSeverityStyle = (severityStr) => {
  const sev = (severityStr || '').toUpperCase();

  if (sev.includes('CRITICAL')) {
    return {
      color: '#ef4444',      // Red
      fillColor: '#f87171',
      label: 'CRITICAL',
      badgeClass: 'bg-red-500 text-white',
      borderClass: 'border-l-4 border-l-red-500',
      radius: 18,
    };
  }

  if (sev.includes('HIGH')) {
    return {
      color: '#f97316',      // Orange
      fillColor: '#fb923c',
      label: 'HIGH',
      badgeClass: 'bg-orange-500 text-white',
      borderClass: 'border-l-4 border-l-orange-500',
      radius: 15,
    };
  }

  if (sev.includes('MEDIUM')) {
    return {
      color: '#eab308',      // Yellow
      fillColor: '#fde047',
      label: 'MEDIUM',
      badgeClass: 'bg-yellow-500 text-slate-900',
      borderClass: 'border-l-4 border-l-yellow-500',
      radius: 13,
    };
  }

  // Default to LOW
  return {
    color: '#3b82f6',        // Blue
    fillColor: '#60a5fa',
    label: 'LOW',
    badgeClass: 'bg-blue-500 text-white',
    borderClass: 'border-l-4 border-l-blue-500',
    radius: 11,
  };
};

export default function IncidentHeatmap({ reports = [], getDepartment, formatDateTime }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const tileLayerRef = useRef(null);
  const markersGroupRef = useRef(null);
  
  // Store Leaflet marker instances mapped by report ID
  const markerMapRef = useRef(new Map());

  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [selectedReportId, setSelectedReportId] = useState(null);
  const [mapTheme, setMapTheme] = useState('standard'); // 'standard' | 'dark' | 'satellite'

  // Default Lipa City Center Point
  const CENTER_LAT = 13.9419;
  const CENTER_LNG = 121.1631;

  // Map Tile Providers
  const TILE_SERVERS = {
    standard: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  };

  // 1. Load Leaflet CDN script & stylesheet
  useEffect(() => {
    if (window.L) {
      setLeafletLoaded(true);
      return;
    }

    const cssLink = document.createElement('link');
    cssLink.rel = 'stylesheet';
    cssLink.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(cssLink);

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => setLeafletLoaded(true);
    document.body.appendChild(script);
  }, []);

  // 2. Initialize Leaflet Map Instance
  useEffect(() => {
    if (!leafletLoaded || !mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const L = window.L;
      const map = L.map(mapContainerRef.current, {
        center: [CENTER_LAT, CENTER_LNG],
        zoom: 13,
        zoomControl: false,
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      const initialTile = L.tileLayer(TILE_SERVERS[mapTheme], {
        maxZoom: 18,
        attribution: '&copy; OpenStreetMap / Esri',
      }).addTo(map);

      tileLayerRef.current = initialTile;
      markersGroupRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }
  }, [leafletLoaded]);

  // 3. Handle Map Theme Switcher
  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;
    const L = window.L;

    mapInstanceRef.current.removeLayer(tileLayerRef.current);
    tileLayerRef.current = L.tileLayer(TILE_SERVERS[mapTheme], {
      maxZoom: 18,
      attribution: '&copy; OpenStreetMap / Esri',
    }).addTo(mapInstanceRef.current);
  }, [mapTheme]);

  // 4. Filter logic for reports array
  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      const coords = parseCoordinates(report);
      if (!coords) return false; // Only include valid plottable points

      const dept = typeof getDepartment === 'function' ? getDepartment(report) : 'POLICE';
      const severity = (report.severity || '').toUpperCase();
      const search = sidebarSearch.toLowerCase();

      const matchesDept = deptFilter === 'ALL' || dept === deptFilter;
      const matchesSev =
        severityFilter === 'ALL' ||
        (severityFilter === 'CRITICAL' && severity.includes('CRITICAL')) ||
        (severityFilter === 'HIGH' && severity.includes('HIGH') && !severity.includes('CRITICAL')) ||
        (severityFilter === 'MEDIUM' && severity.includes('MEDIUM')) ||
        (severityFilter === 'LOW' && (severity.includes('LOW') || severity.includes('MINOR')));

      const matchesText =
        (report.incidentTitle || '').toLowerCase().includes(search) ||
        (report.address || report.location || '').toLowerCase().includes(search) ||
        (report.reporterName || '').toLowerCase().includes(search);

      return matchesDept && matchesSev && matchesText;
    });
  }, [reports, deptFilter, severityFilter, sidebarSearch, getDepartment]);

  // 5. Render markers on map
  useEffect(() => {
    if (!mapInstanceRef.current || !markersGroupRef.current || !window.L) return;

    const L = window.L;
    const layerGroup = markersGroupRef.current;
    layerGroup.clearLayers();
    markerMapRef.current.clear();

    filteredReports.forEach((report) => {
      const coords = parseCoordinates(report);
      if (!coords) return;

      const sevStyle = getSeverityStyle(report.severity);
      const dept = typeof getDepartment === 'function' ? getDepartment(report) : 'GENERAL';
      const formattedDate = typeof formatDateTime === 'function' ? formatDateTime(report.createdAt) : '';

      // Translucent Heat Aura Ring
      L.circle([coords.lat, coords.lng], {
        color: 'transparent',
        fillColor: sevStyle.color,
        fillOpacity: 0.3,
        radius: sevStyle.radius * 28,
      }).addTo(layerGroup);

      // Core Interactive Marker
      const marker = L.circleMarker([coords.lat, coords.lng], {
        radius: sevStyle.radius,
        color: sevStyle.color,
        weight: 3,
        fillColor: sevStyle.fillColor,
        fillOpacity: 0.9,
      }).addTo(layerGroup);

      // Image Extraction
      const img = report.imageBase64 || report.image1 || (report.images && report.images[0]);

      const popupHtml = `
        <div style="font-family: sans-serif; min-width: 210px; padding: 2px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-size: 9px; font-weight: 900; background: ${sevStyle.color}; color: white; padding: 2px 6px; border-radius: 4px; text-transform: uppercase;">
              ${sevStyle.label} SEVERITY
            </span>
            <span style="font-size: 9px; font-weight: 800; color: #64748b; text-transform: uppercase;">
              ${report.status || 'Active'}
            </span>
          </div>

          <strong style="font-size: 13px; color: #0f172a; display: block; line-height: 1.2; text-transform: uppercase; margin-bottom: 4px;">
            ${report.incidentTitle || 'Incident Alert'}
          </strong>

          <p style="font-size: 11px; color: #475569; margin: 0 0 6px 0;">
            📍 ${report.address || report.location || 'Location coords logged'}
          </p>

          ${
            img
              ? `<img src="${img.startsWith('data:') ? img : 'data:image/jpeg;base64,' + img}" style="width: 100%; height: 95px; object-fit: cover; border-radius: 6px; margin-bottom: 6px;" />`
              : ''
          }

          <div style="font-size: 9px; color: #94a3b8; font-weight: 700; border-top: 1px solid #e2e8f0; padding-top: 4px; display: flex; justify-content: space-between; align-items: center;">
            <span>Dept: ${dept}</span>
            <a href="https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}" target="_blank" style="color: #2563eb; font-weight: bold; text-decoration: underline;">
              Directions ↗
            </a>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml);

      // Store marker reference keying by report ID or index fallback
      const reportKey = report.id || `${coords.lat}-${coords.lng}`;
      markerMapRef.current.set(reportKey, marker);

      // Sync selection when clicking marker directly on map
      marker.on('click', () => {
        setSelectedReportId(reportKey);
      });
    });
  }, [leafletLoaded, filteredReports, getDepartment, formatDateTime]);

  // Sidebar item click handler: Flies map to coordinates and triggers popup
  const handleSelectIncident = (report) => {
    const coords = parseCoordinates(report);
    if (!coords || !mapInstanceRef.current) return;

    const reportKey = report.id || `${coords.lat}-${coords.lng}`;
    setSelectedReportId(reportKey);

    // Smooth camera transition to target incident
    mapInstanceRef.current.flyTo([coords.lat, coords.lng], 16, {
      animate: true,
      duration: 1.2,
    });

    // Open corresponding Leaflet popup
    const marker = markerMapRef.current.get(reportKey);
    if (marker) {
      marker.openPopup();
    }
  };

  // Recenter to Lipa City
  const handleRecenter = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([CENTER_LAT, CENTER_LNG], 13, { duration: 1.2 });
    }
  };

  return (
    /* 👈 Added data-tour attribute to root container */
    <div data-tour="incident-heatmap" className="flex flex-col space-y-3 h-[calc(100vh-140px)] min-h-[600px]">
      
      {/* 🛠️ TOP CONTROL & METRICS TOOLBAR */}
      <div className="bg-slate-900 text-white p-3.5 rounded-xl shadow-lg border border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
        
        {/* Department Filters */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1">
            Dept:
          </span>
          {['ALL', 'FIRE', 'POLICE', 'HEALTH'].map((dept) => (
            <button
              key={dept}
              onClick={() => setDeptFilter(dept)}
              className={`px-3 py-1 rounded text-[10px] font-extrabold uppercase transition-all ${
                deptFilter === dept
                  ? 'bg-white text-slate-900 shadow'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
              }`}
            >
              {dept}
            </button>
          ))}
        </div>

        {/* Severity Color Filters */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1">
            Severity:
          </span>
          {[
            { id: 'ALL', label: 'ALL' },
            { id: 'CRITICAL', label: '🔴 Critical' },
            { id: 'HIGH', label: '🟠 High' },
            { id: 'MEDIUM', label: '🟡 Medium' },
            { id: 'LOW', label: '🔵 Low' },
          ].map((sev) => (
            <button
              key={sev.id}
              onClick={() => setSeverityFilter(sev.id)}
              className={`px-2.5 py-1 rounded text-[10px] font-extrabold uppercase transition-all ${
                severityFilter === sev.id
                  ? 'bg-white text-slate-900 shadow'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
              }`}
            >
              {sev.label}
            </button>
          ))}
        </div>

        {/* Map Theme Switcher & Recenter */}
        <div className="flex items-center gap-2 ml-auto">
          <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700">
            <button
              onClick={() => setMapTheme('standard')}
              className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase transition-all ${
                mapTheme === 'standard' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              🗺️ Map
            </button>
            <button
              onClick={() => setMapTheme('dark')}
              className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase transition-all ${
                mapTheme === 'dark' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              🌙 Dark
            </button>
            <button
              onClick={() => setMapTheme('satellite')}
              className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase transition-all ${
                mapTheme === 'satellite' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              🛰️ Aerial
            </button>
          </div>

          <button
            onClick={handleRecenter}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1 rounded text-[10px] font-black uppercase tracking-wider transition-all"
          >
            🎯 Recenter
          </button>
        </div>
      </div>

      {/* 📐 MAIN FULL-HEIGHT SPLIT CONTENT AREA */}
      <div className="flex flex-col lg:flex-row gap-3 flex-1 min-h-0 overflow-hidden">
        
        {/* 👈 DISPATCHER SIDEBAR (INCIDENT LIST) */}
        <div className="w-full lg:w-80 bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col shrink-0 overflow-hidden">
          
          <div className="p-3 bg-slate-900 border-b border-slate-800 text-white space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                <span>📍</span> Active Incidents ({filteredReports.length})
              </span>
              <span className="text-[9px] bg-slate-800 text-slate-300 font-bold px-2 py-0.5 rounded border border-slate-700">
                Live Feed
              </span>
            </div>

            <input
              type="text"
              placeholder="Search title, address, reporter..."
              value={sidebarSearch}
              onChange={(e) => setSidebarSearch(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-400 text-xs rounded-lg p-2 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Scrollable Incident Item List */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100 p-2 space-y-1.5">
            {filteredReports.length === 0 ? (
              <div className="p-8 text-center text-gray-400 space-y-1">
                <span className="text-2xl">📭</span>
                <p className="text-xs font-bold uppercase tracking-wider">No matching locations found.</p>
              </div>
            ) : (
              filteredReports.map((report) => {
                const reportKey = report.id || `${parseCoordinates(report)?.lat}-${parseCoordinates(report)?.lng}`;
                const sevStyle = getSeverityStyle(report.severity);
                const isSelected = selectedReportId === reportKey;
                const dept = typeof getDepartment === 'function' ? getDepartment(report) : 'GENERAL';

                return (
                  <div
                    key={reportKey}
                    onClick={() => handleSelectIncident(report)}
                    className={`p-2.5 rounded-lg cursor-pointer transition-all ${sevStyle.borderClass} ${
                      isSelected
                        ? 'bg-slate-900 text-white shadow-md'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${sevStyle.badgeClass}`}>
                        {sevStyle.label}
                      </span>
                      <span className={`text-[9px] font-bold uppercase ${isSelected ? 'text-slate-400' : 'text-slate-500'}`}>
                        {dept}
                      </span>
                    </div>

                    <strong className={`text-xs block font-black uppercase truncate ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                      {report.incidentTitle || 'Untitled Incident'}
                    </strong>

                    <p className={`text-[10px] truncate mt-0.5 ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                      📍 {report.address || report.location || 'Coordinates Logged'}
                    </p>

                    <div className={`flex items-center justify-between text-[9px] mt-1 pt-1 border-t ${isSelected ? 'border-slate-800 text-slate-400' : 'border-gray-200 text-slate-400'}`}>
                      <span>{typeof formatDateTime === 'function' ? formatDateTime(report.createdAt) : ''}</span>
                      <span className="font-bold text-blue-500">Focus ➔</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

        </div>

        {/* 👉 LEAFLET MAP DISPLAY */}
        <div className="flex-1 bg-slate-900 rounded-xl border border-slate-300 shadow-inner overflow-hidden relative min-h-[400px]">
          {!leafletLoaded && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 text-slate-400 font-bold text-xs uppercase tracking-widest gap-2">
              <span className="animate-spin text-2xl">⏳</span>
              Initializing Map Engine...
            </div>
          )}
          <div ref={mapContainerRef} className="w-full h-full z-10" />
        </div>

      </div>

    </div>
  );
}