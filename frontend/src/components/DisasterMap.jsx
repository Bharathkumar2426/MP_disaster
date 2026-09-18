import { useState, useMemo, useEffect, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { AlertTriangle, Building2, Layers, Filter, RefreshCw, Clock, MapPin, Activity, Zap } from "lucide-react";

// ─── District Coordinate Registry ───────────────────────────────────────────
const DISTRICT_COORDINATES = {
  chennai: [13.0827, 80.2707],
  coimbatore: [11.0168, 76.9558],
  madurai: [9.9252, 78.1198],
  salem: [11.6643, 78.146],
  trichy: [10.7905, 78.7047],
  tiruchirappalli: [10.7905, 78.7047],
  tirunelveli: [8.7139, 77.7567],
  vellore: [12.9165, 79.1325],
  thanjavur: [10.787, 79.1378],
  cuddalore: [11.748, 79.7714],
  kanyakumari: [8.0883, 77.5385],
  nagapattinam: [10.7672, 79.8449],
  erode: [11.341, 77.7172],
  kancheepuram: [12.8342, 79.7036],
  karur: [10.9601, 78.0766],
  wayanad: [11.6854, 76.132],
  kozhikode: [11.2588, 75.7804],
  thiruvananthapuram: [8.5241, 76.9366],
  thrissur: [10.5276, 76.2144],
  alappuzha: [9.4981, 76.3388],
  mumbai: [19.076, 72.8777],
  delhi: [28.6139, 77.209],
  bengaluru: [12.9716, 77.5946],
  bangalore: [12.9716, 77.5946],
  hyderabad: [17.385, 78.4867],
  kolkata: [22.5726, 88.3639],
  pune: [18.5204, 73.8567],
  ahmedabad: [23.0225, 72.5714],
  surat: [21.1702, 72.8311],
  visakhapatnam: [17.6868, 83.2185],
  default: [11.1271, 78.6569],
};

function getCoords(disaster) {
  // Use actual lat/lng from DB when available
  if (disaster.latitude && disaster.longitude) {
    return [parseFloat(disaster.latitude), parseFloat(disaster.longitude)];
  }
  // Fallback: district-based with deterministic offset to avoid overlap
  const key = (disaster.district || "").toLowerCase().trim();
  const base = DISTRICT_COORDINATES[key] || DISTRICT_COORDINATES.default;
  const id = disaster.id || 1;
  const offsetLat = ((id * 37) % 100) * 0.004 - 0.2;
  const offsetLng = ((id * 73) % 100) * 0.004 - 0.2;
  return [base[0] + offsetLat, base[1] + offsetLng];
}

// ─── Severity Config ─────────────────────────────────────────────────────────
const SEV = {
  HIGH:   { color: "#ef4444", glow: "rgba(239,68,68,0.45)",   text: "#fca5a5", bg: "rgba(239,68,68,0.12)",   border: "rgba(239,68,68,0.4)",   label: "🔴 HIGH",   radius: 22000 },
  MEDIUM: { color: "#f59e0b", glow: "rgba(245,158,11,0.35)",  text: "#fcd34d", bg: "rgba(245,158,11,0.12)",  border: "rgba(245,158,11,0.4)",  label: "🟡 MEDIUM", radius: 14000 },
  LOW:    { color: "#10b981", glow: "rgba(16,185,129,0.3)",   text: "#6ee7b7", bg: "rgba(16,185,129,0.12)",  border: "rgba(16,185,129,0.4)",  label: "🟢 LOW",    radius: 8000  },
};
const getSev = (s) => SEV[(s || "LOW").toUpperCase()] || SEV.LOW;

// ─── Status Config ────────────────────────────────────────────────────────────
const STATUS_STYLE = {
  ACTIVE:        { bg: "rgba(239,68,68,0.15)",  color: "#f87171",  border: "rgba(239,68,68,0.4)",   icon: "🔴" },
  UNDER_CONTROL: { bg: "rgba(245,158,11,0.15)", color: "#fbbf24",  border: "rgba(245,158,11,0.4)",  icon: "🟡" },
  RESOLVED:      { bg: "rgba(16,185,129,0.15)", color: "#34d399",  border: "rgba(16,185,129,0.4)",  icon: "🟢" },
  PENDING:       { bg: "rgba(148,163,184,0.15)",color: "#94a3b8",  border: "rgba(148,163,184,0.4)", icon: "⚪" },
};
const getStatus = (s) => STATUS_STYLE[(s || "").toUpperCase()] || STATUS_STYLE.PENDING;

// ─── Disaster Type SVG Icons ──────────────────────────────────────────────────
const TYPE_SVG = {
  flood:      `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="white" stroke-width="2.2"><path d="M2 12c1.5-2 3-3 5-3s3.5 1 5 3 3.5 3 5 3"/><path d="M2 17c1.5-2 3-3 5-3s3.5 1 5 3 3.5 3 5 3"/><path d="M2 7c1.5-2 3-3 5-3s3.5 1 5 3 3.5 3 5 3"/></svg>`,
  cyclone:    `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="white" stroke-width="2.2"><path d="M12 2a10 10 0 1 0 10 10"/><path d="M12 12a4 4 0 1 0-4-4"/><circle cx="12" cy="12" r="1.5" fill="white"/></svg>`,
  earthquake: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="white" stroke-width="2.2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,
  fire:       `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="white" stroke-width="2.2"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>`,
  landslide:  `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="white" stroke-width="2.2"><path d="m8 3 4 8 5-5 5 15H2L8 3z"/></svg>`,
  tsunami:    `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="white" stroke-width="2.2"><path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2"/><path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2"/><path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2"/></svg>`,
  heatwave:   `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="white" stroke-width="2.2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>`,
  default:    `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="white" stroke-width="2.2"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
};
const getTypeSVG = (type = "") => {
  const t = type.toLowerCase();
  if (t.includes("flood"))      return TYPE_SVG.flood;
  if (t.includes("cyclon"))     return TYPE_SVG.cyclone;
  if (t.includes("quake"))      return TYPE_SVG.earthquake;
  if (t.includes("fire") || t.includes("wild")) return TYPE_SVG.fire;
  if (t.includes("land") || t.includes("slide")) return TYPE_SVG.landslide;
  if (t.includes("tsunami"))    return TYPE_SVG.tsunami;
  if (t.includes("heat"))       return TYPE_SVG.heatwave;
  return TYPE_SVG.default;
};

// ─── Custom Leaflet Marker Icon ──────────────────────────────────────────────
function createDisasterPin(disaster) {
  const sev = getSev(disaster.severity);
  const isHigh = (disaster.severity || "").toUpperCase() === "HIGH";
  const svgIcon = getTypeSVG(disaster.disasterType);

  const pulse = isHigh
    ? `<div style="position:absolute;width:44px;height:44px;border-radius:50%;background:${sev.glow};animation:mapPing 1.6s ease-in-out infinite;top:-7px;left:-7px;"></div>`
    : "";

  return L.divIcon({
    className: "",
    html: `
      <div style="position:relative;display:flex;align-items:center;justify-content:center;">
        ${pulse}
        <div style="
          width:30px;height:30px;border-radius:50%;
          background:${sev.color};
          border:2.5px solid rgba(255,255,255,0.9);
          box-shadow:0 0 0 3px ${sev.glow}, 0 4px 14px rgba(0,0,0,0.5);
          display:flex;align-items:center;justify-content:center;
          position:relative;z-index:1;
        ">
          ${svgIcon}
        </div>
      </div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -18],
  });
}

function createCenterPin(center) {
  const isActive = (center.status || "").toUpperCase() === "ACTIVE";
  return L.divIcon({
    className: "",
    html: `
      <div style="
        width:26px;height:26px;border-radius:7px;
        background:${isActive ? "#3b82f6" : "#475569"};
        border:2px solid rgba(255,255,255,0.85);
        box-shadow:0 0 0 2px rgba(59,130,246,0.4), 0 4px 10px rgba(0,0,0,0.4);
        display:flex;align-items:center;justify-content:center;
      ">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
          <rect width="16" height="20" x="4" y="2" rx="2"/>
          <path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/>
          <path d="M8 10h.01"/><path d="M16 10h.01"/>
          <path d="M8 14h.01"/><path d="M16 14h.01"/>
        </svg>
      </div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -16],
  });
}

// ─── Map CSS keyframe injector ────────────────────────────────────────────────
function MapStyleInjector() {
  useEffect(() => {
    const id = "disaster-map-styles";
    if (document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.textContent = `
      @keyframes mapPing {
        0%   { transform: scale(0.8); opacity: 0.9; }
        70%  { transform: scale(1.8); opacity: 0; }
        100% { transform: scale(1.8); opacity: 0; }
      }
      .leaflet-popup-content-wrapper {
        background: #0f172a !important;
        border: 1px solid #1e293b !important;
        border-radius: 12px !important;
        box-shadow: 0 8px 32px rgba(0,0,0,0.6) !important;
        padding: 0 !important;
      }
      .leaflet-popup-content { margin: 0 !important; width: auto !important; }
      .leaflet-popup-tip { background: #0f172a !important; }
      .leaflet-popup-close-button {
        color: #64748b !important;
        font-size: 18px !important;
        top: 8px !important;
        right: 10px !important;
      }
      .leaflet-popup-close-button:hover { color: #f8fafc !important; }
      .leaflet-control-zoom a {
        background: #111827 !important;
        color: #94a3b8 !important;
        border-color: #1e293b !important;
      }
      .leaflet-control-zoom a:hover {
        background: #1e293b !important;
        color: #f8fafc !important;
      }
    `;
    document.head.appendChild(style);
  }, []);
  return null;
}

// ─── Format date helper ───────────────────────────────────────────────────────
function formatDate(dateStr) {
  if (!dateStr) return "Unknown";
  try {
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit", hour12: true,
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (days > 0)  return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (mins > 0)  return `${mins}m ago`;
  return "Just now";
}

// ─── Disaster Popup Content ───────────────────────────────────────────────────
function DisasterPopup({ d }) {
  const sev = getSev(d.severity);
  const sta = getStatus(d.status);
  const isHigh   = (d.severity || "").toUpperCase() === "HIGH";
  const isActive = (d.status || "").toUpperCase() === "ACTIVE";

  return (
    <div style={{ width: "280px", fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{
        background: isHigh ? "rgba(239,68,68,0.15)" : "rgba(15,23,42,0.95)",
        borderBottom: "1px solid #1e293b",
        padding: "12px 14px 10px",
        borderRadius: "12px 12px 0 0",
      }}>
        {isHigh && (
          <div style={{
            fontSize: "10px", fontWeight: "800", color: "#ef4444",
            letterSpacing: "0.1em", marginBottom: "4px",
            display: "flex", alignItems: "center", gap: "4px",
          }}>
            ⚠ CRITICAL INCIDENT — IMMEDIATE ACTION REQUIRED
          </div>
        )}
        {isActive && !isHigh && (
          <div style={{
            fontSize: "10px", fontWeight: "700", color: "#f59e0b",
            letterSpacing: "0.08em", marginBottom: "4px",
          }}>
            🔴 LIVE INCIDENT
          </div>
        )}
        <div style={{ fontSize: "15px", fontWeight: "800", color: "#f8fafc", lineHeight: 1.2 }}>
          {d.disasterName || "Unnamed Incident"}
        </div>
        <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "3px" }}>
          {d.disasterType}  •  ID #{d.id}
        </div>
      </div>

      {/* Badges */}
      <div style={{ padding: "10px 14px 0", display: "flex", gap: "6px", flexWrap: "wrap" }}>
        <span style={{
          fontSize: "11px", fontWeight: "700", padding: "3px 9px",
          borderRadius: "100px", background: sev.bg, color: sev.text, border: `1px solid ${sev.border}`,
        }}>
          {sev.label} SEVERITY
        </span>
        <span style={{
          fontSize: "11px", fontWeight: "700", padding: "3px 9px",
          borderRadius: "100px", background: sta.bg, color: sta.color, border: `1px solid ${sta.border}`,
        }}>
          {sta.icon} {(d.status || "UNKNOWN").replace(/_/g, " ")}
        </span>
      </div>

      {/* Location Info */}
      <div style={{ padding: "10px 14px", borderBottom: "1px solid #1e293b" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
          <InfoRow icon="📍" label="District" value={d.district} />
          <InfoRow icon="🗺" label="Location" value={d.location || "—"} />
          {d.latitude && d.longitude && (
            <InfoRow icon="🌐" label="Coordinates" value={`${parseFloat(d.latitude).toFixed(4)}°, ${parseFloat(d.longitude).toFixed(4)}°`} />
          )}
          <InfoRow icon="🕐" label="Reported" value={timeAgo(d.reportedDate)} />
        </div>
      </div>

      {/* Description */}
      {d.description && (
        <div style={{
          padding: "10px 14px",
          borderBottom: "1px solid #1e293b",
          fontSize: "12px", color: "#94a3b8", lineHeight: 1.5,
        }}>
          <div style={{ fontSize: "10px", fontWeight: "700", color: "#64748b", letterSpacing: "0.08em", marginBottom: "4px" }}>
            📋 INCIDENT SUMMARY
          </div>
          {d.description}
        </div>
      )}

      {/* Reported Date */}
      <div style={{ padding: "8px 14px", borderRadius: "0 0 12px 12px" }}>
        <div style={{ fontSize: "11px", color: "#475569", display: "flex", alignItems: "center", gap: "4px" }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          Logged: {formatDate(d.reportedDate)}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <div>
      <div style={{ fontSize: "10px", fontWeight: "600", color: "#475569", letterSpacing: "0.06em" }}>
        {icon} {label}
      </div>
      <div style={{ fontSize: "12px", fontWeight: "600", color: "#cbd5e1", marginTop: "1px" }}>
        {value || "—"}
      </div>
    </div>
  );
}

// ─── Map auto-fit bounds ──────────────────────────────────────────────────────
function FitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    if (!points || points.length === 0) return;
    try {
      const bounds = L.latLngBounds(points.map((p) => [p[0], p[1]]));
      if (bounds.isValid()) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 9 });
    } catch {}
  }, [points, map]);
  return null;
}

// ─── Main Component ───────────────────────────────────────────────────────────
function DisasterMap({ disasters = [], centers = [] }) {
  const [filterSev, setFilterSev]     = useState("ALL");
  const [showCenters, setShowCenters] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [showSidebar, setShowSidebar] = useState(true);

  // Auto-refresh timestamp every 30s (data re-fetched by Dashboard parent)
  useEffect(() => {
    const t = setInterval(() => setLastRefresh(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  const filtered = useMemo(() => {
    if (filterSev === "ALL") return disasters;
    return disasters.filter((d) => (d.severity || "").toUpperCase() === filterSev);
  }, [disasters, filterSev]);

  const activeHigh = useMemo(() =>
    disasters.filter(d => (d.severity||"").toUpperCase()==="HIGH" && (d.status||"").toUpperCase()==="ACTIVE"),
    [disasters]
  );
  const activeCount = disasters.filter(d => (d.status||"").toUpperCase()==="ACTIVE").length;

  // All pin coordinates for FitBounds
  const allPoints = useMemo(() =>
    filtered.map((d) => getCoords(d)),
    [filtered]
  );

  const defaultCenter = [11.1271, 78.6569];

  return (
    <div style={{ background: "#0a0f1e", border: "1px solid #1e293b", borderRadius: "14px", overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>

      {/* ── Top Toolbar ── */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        flexWrap: "wrap", gap: "10px", padding: "13px 18px",
        background: "linear-gradient(90deg, #0d1526 0%, #111827 100%)",
        borderBottom: "1px solid #1e293b",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Layers size={17} color="#38bdf8" />
          <span style={{ fontWeight: "700", fontSize: "14px", color: "#f8fafc" }}>
            Live GIS Incident &amp; Resource Map
          </span>
          <span style={{
            fontSize: "11px", background: "rgba(56,189,248,0.12)", color: "#38bdf8",
            border: "1px solid rgba(56,189,248,0.3)", borderRadius: "100px", padding: "2px 9px", fontWeight: "700",
          }}>
            {filtered.length} Active Pins
          </span>
          {activeHigh.length > 0 && (
            <span style={{
              fontSize: "11px", background: "rgba(239,68,68,0.15)", color: "#f87171",
              border: "1px solid rgba(239,68,68,0.35)", borderRadius: "100px", padding: "2px 9px", fontWeight: "700",
              animation: "none",
            }}>
              ⚠ {activeHigh.length} CRITICAL
            </span>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "11px", color: "#64748b", display: "flex", alignItems: "center", gap: "3px" }}>
            <Filter size={12} /> Severity:
          </span>
          {["ALL", "HIGH", "MEDIUM", "LOW"].map((s) => {
            const col = s === "HIGH" ? "#ef4444" : s === "MEDIUM" ? "#f59e0b" : s === "LOW" ? "#10b981" : "#38bdf8";
            const isActive = filterSev === s;
            return (
              <button key={s} onClick={() => setFilterSev(s)} style={{
                fontSize: "11px", fontWeight: "700", padding: "4px 10px", borderRadius: "6px",
                border: `1px solid ${isActive ? col : "#1e293b"}`,
                cursor: "pointer", transition: "all 0.15s",
                background: isActive ? `${col}22` : "#111827",
                color: isActive ? col : "#64748b",
              }}>{s}</button>
            );
          })}
          <button onClick={() => setShowCenters(!showCenters)} style={{
            fontSize: "11px", fontWeight: "600", padding: "4px 10px", borderRadius: "6px",
            border: `1px solid ${showCenters ? "rgba(59,130,246,0.5)" : "#1e293b"}`,
            cursor: "pointer", marginLeft: "4px",
            background: showCenters ? "rgba(59,130,246,0.15)" : "#111827",
            color: showCenters ? "#60a5fa" : "#64748b",
          }}>
            🏢 Centers ({centers.length})
          </button>
          <button onClick={() => setShowSidebar(!showSidebar)} style={{
            fontSize: "11px", fontWeight: "600", padding: "4px 10px", borderRadius: "6px",
            border: "1px solid #1e293b", cursor: "pointer",
            background: showSidebar ? "rgba(56,189,248,0.1)" : "#111827",
            color: showSidebar ? "#38bdf8" : "#64748b",
          }}>
            📋 Updates
          </button>
        </div>
      </div>

      {/* ── Critical Alert Banner ── */}
      {activeHigh.length > 0 && (
        <div style={{
          background: "rgba(239,68,68,0.1)", borderBottom: "1px solid rgba(239,68,68,0.25)",
          padding: "8px 18px", display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap",
        }}>
          <Zap size={14} color="#ef4444" />
          <span style={{ fontSize: "12px", fontWeight: "700", color: "#f87171" }}>
            CRITICAL ALERT:
          </span>
          <span style={{ fontSize: "12px", color: "#fca5a5" }}>
            {activeHigh.map(d => `${d.disasterName} (${d.district})`).join("  •  ")}
          </span>
          <span style={{ marginLeft: "auto", fontSize: "11px", color: "#64748b", display: "flex", alignItems: "center", gap: "4px" }}>
            <RefreshCw size={11} />
            Updated {timeAgo(lastRefresh.toISOString())}
          </span>
        </div>
      )}

      {/* ── Map + Sidebar Row ── */}
      <div style={{ display: "flex", height: "440px" }}>

        {/* Leaflet Map */}
        <div style={{ flex: 1, position: "relative" }}>
          <MapContainer
            center={defaultCenter}
            zoom={7}
            scrollWheelZoom={true}
            dragging={true}
            doubleClickZoom={true}
            zoomControl={true}
            style={{ height: "100%", width: "100%", background: "#090d16" }}
          >
            <MapStyleInjector />
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {allPoints.length > 0 && <FitBounds points={allPoints} />}

            {/* ── Disaster Markers ── */}
            {filtered.map((d) => {
              const coords = getCoords(d);
              const sev = getSev(d.severity);
              const isHigh = (d.severity || "").toUpperCase() === "HIGH";

              return (
                <div key={`d-${d.id}`}>
                  <Marker position={coords} icon={createDisasterPin(d)}>
                    <Popup minWidth={280} maxWidth={300}>
                      <DisasterPopup d={d} />
                    </Popup>
                  </Marker>
                  {/* Danger zone circle for HIGH & MEDIUM */}
                  {(isHigh || (d.severity || "").toUpperCase() === "MEDIUM") && (
                    <Circle
                      center={coords}
                      radius={sev.radius}
                      pathOptions={{
                        color: sev.color,
                        fillColor: sev.color,
                        fillOpacity: isHigh ? 0.10 : 0.06,
                        weight: isHigh ? 1.5 : 1,
                        dashArray: isHigh ? "5, 7" : "4, 10",
                      }}
                    />
                  )}
                </div>
              );
            })}

            {/* ── Training Center Markers ── */}
            {showCenters && centers.map((c) => {
              const coords = getCoords({ ...c, district: c.location || c.district || c.centerName, id: (c.id || 1) + 500 });
              return (
                <Marker key={`c-${c.id}`} position={coords} icon={createCenterPin(c)}>
                  <Popup minWidth={220}>
                    <div style={{ fontFamily: "'Inter', sans-serif", width: "220px" }}>
                      <div style={{
                        background: "rgba(59,130,246,0.12)", borderBottom: "1px solid #1e293b",
                        padding: "10px 14px", borderRadius: "12px 12px 0 0",
                      }}>
                        <div style={{ fontSize: "10px", fontWeight: "700", color: "#60a5fa", letterSpacing: "0.08em", marginBottom: "2px" }}>
                          🏢 RELIEF / TRAINING CENTER
                        </div>
                        <div style={{ fontSize: "14px", fontWeight: "800", color: "#f8fafc" }}>
                          {c.centerName}
                        </div>
                      </div>
                      <div style={{ padding: "10px 14px" }}>
                        <InfoRow icon="📍" label="District" value={c.district} />
                        <div style={{ marginTop: "6px" }}>
                          <InfoRow icon="🏠" label="Address" value={c.address || "—"} />
                        </div>
                        <div style={{ marginTop: "6px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                          <InfoRow icon="👥" label="Capacity" value={c.capacity ? `${c.capacity} pax` : "—"} />
                          <InfoRow icon="📞" label="Contact" value={c.contactNumber || "—"} />
                        </div>
                        {c.coordinatorName && (
                          <div style={{ marginTop: "6px" }}>
                            <InfoRow icon="👤" label="Coordinator" value={c.coordinatorName} />
                          </div>
                        )}
                        <div style={{ marginTop: "8px" }}>
                          <span style={{
                            fontSize: "11px", fontWeight: "700", padding: "3px 8px", borderRadius: "100px",
                            background: (c.status||"").toUpperCase() === "ACTIVE" ? "rgba(16,185,129,0.15)" : "rgba(100,116,139,0.15)",
                            color: (c.status||"").toUpperCase() === "ACTIVE" ? "#34d399" : "#94a3b8",
                            border: `1px solid ${(c.status||"").toUpperCase() === "ACTIVE" ? "rgba(16,185,129,0.4)" : "rgba(100,116,139,0.4)"}`,
                          }}>
                            {(c.status||"").toUpperCase() === "ACTIVE" ? "✅ OPERATIONAL" : "⚪ " + (c.status || "UNKNOWN")}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>

          {/* ── Map Legend ── */}
          <div style={{
            position: "absolute", bottom: "12px", left: "12px", zIndex: 1000,
            background: "rgba(9,13,22,0.9)", border: "1px solid #1e293b",
            borderRadius: "8px", padding: "8px 12px", backdropFilter: "blur(8px)",
          }}>
            <div style={{ fontSize: "10px", fontWeight: "700", color: "#64748b", letterSpacing: "0.08em", marginBottom: "6px" }}>LEGEND</div>
            {[
              { color: "#ef4444", glow: "rgba(239,68,68,0.5)", label: "HIGH Severity" },
              { color: "#f59e0b", glow: "rgba(245,158,11,0.4)", label: "MEDIUM Severity" },
              { color: "#10b981", glow: "rgba(16,185,129,0.3)", label: "LOW Severity" },
              { color: "#3b82f6", glow: "rgba(59,130,246,0.3)", label: "Relief Center", square: true },
            ].map((item) => (
              <div key={item.label} style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                <div style={{
                  width: item.square ? "12px" : "12px",
                  height: item.square ? "12px" : "12px",
                  borderRadius: item.square ? "3px" : "50%",
                  background: item.color,
                  boxShadow: `0 0 5px ${item.glow}`,
                  flexShrink: 0,
                }} />
                <span style={{ fontSize: "11px", color: "#94a3b8" }}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Live Updates Sidebar ── */}
        {showSidebar && (
          <div style={{
            width: "240px", flexShrink: 0,
            background: "#0a0f1e", borderLeft: "1px solid #1e293b",
            display: "flex", flexDirection: "column", overflowY: "auto",
          }}>
            {/* Sidebar Header */}
            <div style={{
              padding: "10px 14px", borderBottom: "1px solid #1e293b",
              background: "#111827", position: "sticky", top: 0, zIndex: 5,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Activity size={13} color="#ef4444" />
                <span style={{ fontSize: "12px", fontWeight: "700", color: "#f8fafc" }}>LIVE INCIDENTS</span>
                <span style={{
                  marginLeft: "auto", fontSize: "10px", fontWeight: "700",
                  background: "rgba(239,68,68,0.15)", color: "#f87171",
                  border: "1px solid rgba(239,68,68,0.35)", borderRadius: "100px",
                  padding: "1px 7px",
                }}>
                  {activeCount} ACTIVE
                </span>
              </div>
              <div style={{ fontSize: "10px", color: "#475569", marginTop: "3px", display: "flex", alignItems: "center", gap: "3px" }}>
                <Clock size={10} /> Auto-refresh every 30s
              </div>
            </div>

            {/* Incident List */}
            {disasters.length === 0 ? (
              <div style={{ padding: "20px 14px", textAlign: "center", color: "#475569", fontSize: "12px" }}>
                No incidents logged
              </div>
            ) : (
              disasters.slice().sort((a, b) => {
                // Sort: HIGH first, then ACTIVE, then by date desc
                const sevOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
                const sa = sevOrder[(a.severity||"").toUpperCase()] ?? 3;
                const sb = sevOrder[(b.severity||"").toUpperCase()] ?? 3;
                if (sa !== sb) return sa - sb;
                return new Date(b.reportedDate || 0) - new Date(a.reportedDate || 0);
              }).map((d, idx) => {
                const sev = getSev(d.severity);
                const sta = getStatus(d.status);
                const isHigh = (d.severity || "").toUpperCase() === "HIGH";
                return (
                  <div key={d.id || idx} style={{
                    padding: "10px 14px",
                    borderBottom: "1px solid #0f172a",
                    background: isHigh ? "rgba(239,68,68,0.04)" : "transparent",
                    transition: "background 0.15s",
                    cursor: "default",
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.03)"}
                    onMouseLeave={e => e.currentTarget.style.background = isHigh ? "rgba(239,68,68,0.04)" : "transparent"}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "7px" }}>
                      <div style={{
                        width: "8px", height: "8px", borderRadius: "50%",
                        background: sev.color, flexShrink: 0, marginTop: "4px",
                        boxShadow: `0 0 6px ${sev.glow}`,
                      }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: "12px", fontWeight: "700", color: "#e2e8f0",
                          lineHeight: 1.2, marginBottom: "2px",
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                          {d.disasterName}
                        </div>
                        <div style={{ fontSize: "10px", color: "#64748b", marginBottom: "4px" }}>
                          {d.disasterType} · {d.district}
                        </div>
                        <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                          <span style={{
                            fontSize: "9px", fontWeight: "700", padding: "1px 6px",
                            borderRadius: "100px", background: sev.bg, color: sev.text, border: `1px solid ${sev.border}`,
                          }}>
                            {(d.severity||"?").toUpperCase()}
                          </span>
                          <span style={{
                            fontSize: "9px", fontWeight: "700", padding: "1px 6px",
                            borderRadius: "100px", background: sta.bg, color: sta.color, border: `1px solid ${sta.border}`,
                          }}>
                            {(d.status||"?").replace(/_/g," ")}
                          </span>
                        </div>
                        <div style={{ fontSize: "10px", color: "#334155", marginTop: "4px" }}>
                          {timeAgo(d.reportedDate)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {/* Sidebar Stats Footer */}
            <div style={{
              marginTop: "auto", padding: "10px 14px",
              borderTop: "1px solid #1e293b", background: "#111827",
              position: "sticky", bottom: 0,
            }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "4px", textAlign: "center" }}>
                {[
                  { label: "HIGH", count: disasters.filter(d=>(d.severity||"").toUpperCase()==="HIGH").length, color: "#ef4444" },
                  { label: "MED",  count: disasters.filter(d=>(d.severity||"").toUpperCase()==="MEDIUM").length, color: "#f59e0b" },
                  { label: "LOW",  count: disasters.filter(d=>(d.severity||"").toUpperCase()==="LOW").length, color: "#10b981" },
                ].map(item => (
                  <div key={item.label}>
                    <div style={{ fontSize: "16px", fontWeight: "800", color: item.color }}>{item.count}</div>
                    <div style={{ fontSize: "9px", color: "#475569", fontWeight: "600" }}>{item.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default DisasterMap;
