import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  AlertTriangle,
  Building2,
  Layers,
  Filter,
  RefreshCw,
  Clock,
  MapPin,
  Activity,
  Zap,
  Search,
  Crosshair,
  RotateCcw,
  Globe,
  Radio
} from "lucide-react";

import { resolveCoordinates } from "../utils/geoResolver";
import { getDisasterWeather } from "../services/disasterService";
import { getVerifiedCommunityReports } from "../services/communityReportService";
import RiskAssessmentPanel from "./RiskAssessmentPanel";

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

function createCommunityReportPin(report) {
  const isHigh = ["HIGH", "CRITICAL"].includes((report.severity || "").toUpperCase());
  return L.divIcon({
    className: "",
    html: `
      <div style="position:relative;display:flex;align-items:center;justify-content:center;">
        ${isHigh ? '<div style="position:absolute;width:40px;height:40px;border-radius:50%;background:rgba(168,85,247,0.35);animation:mapPing 1.8s ease-in-out infinite;top:-6px;left:-6px;"></div>' : ''}
        <div style="
          width:28px;height:28px;border-radius:8px;
          background:#9333ea;
          border:2px solid #f3e8ff;
          box-shadow:0 0 10px rgba(168,85,247,0.6), 0 4px 10px rgba(0,0,0,0.5);
          display:flex;align-items:center;justify-content:center;
          font-size:13px;
        ">
          📢
        </div>
      </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
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
      @keyframes mapSpin {
        to { transform: rotate(360deg); }
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

// ─── Format date helpers ──────────────────────────────────────────────────────
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
  const secs  = Math.floor(diff / 1000);
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (days > 0)  return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (mins > 0)  return `${mins}m ago`;
  if (secs > 10) return `${secs}s ago`;
  return "Just now";
}

// ─── Coordinate Validator (Strict & Safe, Never Invents Locations) ───────────
export function getValidCoordinates(item) {
  if (!item) return null;

  const lat = parseFloat(item.latitude);
  const lng = parseFloat(item.longitude);
  if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 && (lat !== 0 || lng !== 0)) {
    return [lat, lng];
  }

  // Attempt resolving from recognized registry locations (e.g. recognized district names)
  const resolved = resolveCoordinates(
    item.district,
    item.location || item.address,
    item.disasterName || item.centerName,
    item.description
  );
  if (resolved && Array.isArray(resolved) && resolved.length === 2) {
    const [rLat, rLng] = resolved;
    if (!isNaN(rLat) && !isNaN(rLng) && rLat >= -90 && rLat <= 90 && rLng >= -180 && rLng <= 180 && (rLat !== 0 || rLng !== 0)) {
      return [rLat, rLng];
    }
  }

  // Safely return null: never invent arbitrary coordinates
  return null;
}

// ─── Weather In-Memory Cache (TTL: 5 minutes) ──────────────────────────────
const weatherCache = new Map();

function IncidentWeatherCard({ disasterId, hasCoords }) {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!disasterId || !hasCoords) return;

    // Use cached telemetry if requested within 5 minutes
    const cached = weatherCache.get(disasterId);
    if (cached && Date.now() - cached.timestamp < 300000) {
      setWeather(cached.data);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    getDisasterWeather(disasterId)
      .then((res) => {
        if (!isMounted) return;
        const data = res.data;
        weatherCache.set(disasterId, { data, timestamp: Date.now() });
        setWeather(data);
      })
      .catch((err) => {
        if (!isMounted) return;
        const msg = err.response?.data?.detail || "Weather telemetry unavailable";
        setError(msg);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [disasterId, hasCoords]);

  if (!hasCoords) {
    return (
      <div style={{ padding: "8px 14px", borderBottom: "1px solid #1e293b", fontSize: "11px", color: "#64748b" }}>
        ☁ Meteorological telemetry unavailable (no GPS coordinates)
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: "9px 14px", borderBottom: "1px solid #1e293b", fontSize: "11px", color: "#94a3b8", display: "flex", alignItems: "center", gap: "8px" }}>
        <div style={{ width: "10px", height: "10px", borderRadius: "50%", border: "2px solid #38bdf8", borderTopColor: "transparent", animation: "mapSpin 0.8s linear infinite" }} />
        Retrieving Open-Meteo meteorological telemetry...
      </div>
    );
  }

  if (error || !weather) {
    return (
      <div style={{ padding: "8px 14px", borderBottom: "1px solid #1e293b", fontSize: "11px", color: "#64748b" }}>
        ☁ Meteorological telemetry currently unavailable
      </div>
    );
  }

  return (
    <div style={{
      padding: "9px 14px",
      borderBottom: "1px solid #1e293b",
      background: "rgba(15, 23, 42, 0.55)",
    }}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "6px",
      }}>
        <div style={{ fontSize: "10px", fontWeight: "700", color: "#38bdf8", letterSpacing: "0.08em" }}>
          🌤 LIVE WEATHER TELEMETRY
        </div>
        <div style={{ fontSize: "9px", color: "#64748b" }}>
          Open-Meteo • {weather.observationTime ? weather.observationTime.slice(11, 16) : "Recent"}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px" }}>
        <div style={{ background: "rgba(30, 41, 59, 0.6)", padding: "5px 6px", borderRadius: "6px", textAlign: "center" }}>
          <div style={{ fontSize: "9px", color: "#94a3b8" }}>🌡 Temp</div>
          <div style={{ fontSize: "12px", fontWeight: "700", color: "#f8fafc" }}>
            {weather.temperature != null ? `${weather.temperature}°C` : "—"}
          </div>
        </div>
        <div style={{ background: "rgba(30, 41, 59, 0.6)", padding: "5px 6px", borderRadius: "6px", textAlign: "center" }}>
          <div style={{ fontSize: "9px", color: "#94a3b8" }}>🌧 Precip</div>
          <div style={{ fontSize: "12px", fontWeight: "700", color: "#f8fafc" }}>
            {weather.precipitation != null ? `${weather.precipitation} mm` : "—"}
          </div>
        </div>
        <div style={{ background: "rgba(30, 41, 59, 0.6)", padding: "5px 6px", borderRadius: "6px", textAlign: "center" }}>
          <div style={{ fontSize: "9px", color: "#94a3b8" }}>💨 Wind</div>
          <div style={{ fontSize: "12px", fontWeight: "700", color: "#f8fafc" }}>
            {weather.windSpeed != null ? `${weather.windSpeed} km/h` : "—"}
          </div>
        </div>
      </div>
      {(weather.windGusts != null || weather.humidity != null) && (
        <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "5px", display: "flex", justifyContent: "space-between" }}>
          {weather.windGusts != null && (
            <span>Gusts: <strong style={{ color: "#cbd5e1" }}>{weather.windGusts} km/h</strong></span>
          )}
          {weather.humidity != null && (
            <span>Humidity: <strong style={{ color: "#cbd5e1" }}>{weather.humidity}%</strong></span>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Disaster Popup Content ───────────────────────────────────────────────────
function DisasterPopup({ d, coords }) {
  const sev = getSev(d.severity);
  const sta = getStatus(d.status);
  const isHigh   = (d.severity || "").toUpperCase() === "HIGH";
  const isActive = (d.status || "").toUpperCase() === "ACTIVE";
  const isGdacs  = (d.source || "").toLowerCase() === "gdacs";

  return (
    <div style={{ width: "285px", fontFamily: "'Inter', sans-serif" }}>
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
        <div style={{ fontSize: "15px", fontWeight: "800", color: "#f8fafc", lineHeight: 1.25 }}>
          {d.disasterName || "Unnamed Incident"}
        </div>
        <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "3px", display: "flex", alignItems: "center", gap: "6px" }}>
          <span>{d.disasterType} • #{d.id}</span>
          {isGdacs ? (
            <span style={{ fontSize: "10px", fontWeight: "700", background: "rgba(168,85,247,0.18)", color: "#c084fc", border: "1px solid rgba(168,85,247,0.35)", borderRadius: "4px", padding: "1px 5px" }}>
              📡 GDACS
            </span>
          ) : (
            <span style={{ fontSize: "10px", fontWeight: "600", background: "rgba(100,116,139,0.18)", color: "#94a3b8", border: "1px solid rgba(100,116,139,0.35)", borderRadius: "4px", padding: "1px 5px" }}>
              👤 Manual
            </span>
          )}
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
          {coords && (
            <InfoRow icon="🌐" label="Coordinates" value={`${coords[0].toFixed(4)}°, ${coords[1].toFixed(4)}°`} />
          )}
          <InfoRow icon="🕐" label="Reported" value={timeAgo(d.reportedDate)} />
        </div>
      </div>

      {/* Real-time Open-Meteo Weather Card */}
      <IncidentWeatherCard disasterId={d.id} hasCoords={Boolean(coords)} />

      {/* Phase 5: Explainable Disaster Risk Assessment */}
      <RiskAssessmentPanel disasterId={d.id} hasCoords={Boolean(coords)} compact={true} />


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
          <Clock size={11} color="#475569" />
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
      <div style={{ fontSize: "12px", fontWeight: "600", color: "#cbd5e1", marginTop: "1px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {value || "—"}
      </div>
    </div>
  );
}

// ─── Map Auto-Fit Controller (Preserves Zoom and Center on Background Refresh) ───────────
function FitBounds({ points, fitTrigger, activePopupId }) {
  const map = useMap();
  const hasFittedRef = useRef(false);
  const lastFitTriggerRef = useRef(fitTrigger);

  useEffect(() => {
    if (!points || points.length === 0) return;

    const isInitialMountFit = !hasFittedRef.current;
    const isExplicitUserTrigger = fitTrigger > lastFitTriggerRef.current;

    // Only fit on initial mount OR when user explicitly clicked Recenter
    if (isInitialMountFit || isExplicitUserTrigger) {
      // Do not interrupt if a disaster popup is currently open and being inspected,
      // unless user explicitly clicked Recenter
      if (activePopupId != null && !isExplicitUserTrigger) {
        return;
      }

      try {
        const bounds = L.latLngBounds(points.map((p) => [p[0], p[1]]));
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [40, 40], maxZoom: 8 });
          hasFittedRef.current = true;
          lastFitTriggerRef.current = fitTrigger;
        }
      } catch (err) {
        console.warn("FitBounds error:", err);
      }
    }
  }, [points, fitTrigger, map, activePopupId]);

  return null;
}

// ─── Smooth Fly-To Controller on Sidebar Item Click ──────────────────────────
function MapFlyController({ target, onFlyComplete }) {
  const map = useMap();
  useEffect(() => {
    if (target && Array.isArray(target) && target.length === 2) {
      try {
        map.flyTo(target, 8, { duration: 1.2 });
      } catch {}
      if (onFlyComplete) {
        onFlyComplete();
      }
    }
  }, [target, map, onFlyComplete]);
  return null;
}

// ─── Main DisasterMap Component ───────────────────────────────────────────────
function DisasterMap({
  disasters = [],
  centers = [],
  lastUpdated = null,
  onRefresh = null,
  isRefreshing = false,
  focusedDisasterId = null,
  userAlertLocation = null,
}) {
  // Filters State
  const [filterSev, setFilterSev]       = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterType, setFilterType]     = useState("ALL");
  const [filterSource, setFilterSource] = useState("ALL");
  const [searchQuery, setSearchQuery]   = useState("");

  // UI State
  const [showCenters, setShowCenters]   = useState(true);
  const [showCommunityReports, setShowCommunityReports] = useState(true);
  const [verifiedCommunityReports, setVerifiedCommunityReports] = useState([]);
  const [showSidebar, setShowSidebar]   = useState(true);
  const [fitTrigger, setFitTrigger]     = useState(0);
  const [flyTarget, setFlyTarget]       = useState(null);
  const [selectedId, setSelectedId]     = useState(null);
  const [activePopupId, setActivePopupId] = useState(null);
  const [unlocatedNotice, setUnlocatedNotice] = useState(null);
  const lastHandledFocusIdRef = useRef(null);

  // Load verified community reports for the map layer
  useEffect(() => {
    let isMounted = true;
    async function loadReports() {
      try {
        const data = await getVerifiedCommunityReports();
        if (isMounted && Array.isArray(data)) {
          setVerifiedCommunityReports(data);
        }
      } catch (err) {
        console.warn("Could not load verified community reports for map:", err);
      }
    }
    loadReports();
    return () => {
      isMounted = false;
    };
  }, [lastUpdated]);

  // Auto-focus on targeted incident from props or URL query parameter (?focus=123)
  useEffect(() => {
    let focusId = focusedDisasterId;
    let isFromUrl = false;
    if (!focusId) {
      try {
        focusId = new URLSearchParams(window.location.search).get("focus");
        if (focusId) isFromUrl = true;
      } catch (e) {
        // ignore
      }
    }

    if (!focusId) return;

    // Only trigger if this focusId hasn't already been handled
    if (String(focusId) === String(lastHandledFocusIdRef.current)) {
      return;
    }

    if (disasters.length > 0) {
      const match = disasters.find((d) => String(d.id) === String(focusId));
      if (match) {
        const coords = getValidCoordinates(match);
        if (coords) {
          lastHandledFocusIdRef.current = String(focusId);
          setSelectedId(match.id);
          setActivePopupId(match.id);
          setFlyTarget(coords);

          // Clean up URL query parameter so subsequent re-renders don't re-trigger
          if (isFromUrl) {
            try {
              const url = new URL(window.location.href);
              url.searchParams.delete("focus");
              window.history.replaceState({}, "", url.pathname + url.search);
            } catch (e) {
              // ignore
            }
          }
        }
      }
    }
  }, [focusedDisasterId, disasters]);

  // Distinct disaster types for dynamic filter dropdown
  const distinctTypes = useMemo(() => {
    const set = new Set();
    disasters.forEach((d) => {
      if (d.disasterType) {
        const t = d.disasterType.trim();
        if (t) set.add(t);
      }
    });
    return Array.from(set).sort();
  }, [disasters]);

  // Multi-criteria client-side filtering
  const filtered = useMemo(() => {
    return disasters.filter((d) => {
      // Severity filter
      if (filterSev !== "ALL" && (d.severity || "").toUpperCase() !== filterSev) {
        return false;
      }
      // Status filter
      if (filterStatus !== "ALL") {
        const sta = (d.status || "").toUpperCase();
        if (filterStatus === "ACTIVE" && sta !== "ACTIVE") return false;
        if (filterStatus === "RESOLVED" && sta !== "RESOLVED") return false;
        if (filterStatus === "UNDER_CONTROL" && sta !== "UNDER_CONTROL") return false;
      }
      // Type filter
      if (filterType !== "ALL" && (d.disasterType || "").toLowerCase() !== filterType.toLowerCase()) {
        return false;
      }
      // Source filter (GDACS vs MANUAL)
      if (filterSource !== "ALL") {
        const src = (d.source || "manual").toLowerCase();
        if (filterSource === "GDACS" && src !== "gdacs") return false;
        if (filterSource === "MANUAL" && src === "gdacs") return false;
      }
      // Search query (name, district, location)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const n = (d.disasterName || "").toLowerCase();
        const dist = (d.district || "").toLowerCase();
        const loc = (d.location || "").toLowerCase();
        if (!n.includes(q) && !dist.includes(q) && !loc.includes(q)) return false;
      }
      return true;
    });
  }, [disasters, filterSev, filterStatus, filterType, filterSource, searchQuery]);

  // Separate valid map pins from incidents without valid coordinates
  const { validPins, unlocatedCount } = useMemo(() => {
    const pins = [];
    let unlocated = 0;
    for (const d of filtered) {
      const coords = getValidCoordinates(d);
      if (coords) {
        pins.push({ disaster: d, coords });
      } else {
        unlocated++;
      }
    }
    return { validPins: pins, unlocatedCount: unlocated };
  }, [filtered]);

  // Valid centers coordinates
  const validCenterPins = useMemo(() => {
    if (!showCenters) return [];
    const pins = [];
    for (const c of centers) {
      const coords = getValidCoordinates({
        latitude: c.latitude,
        longitude: c.longitude,
        district: c.district,
        location: c.location || c.address,
        centerName: c.centerName,
      });
      if (coords) {
        pins.push({ center: c, coords });
      }
    }
    return pins;
  }, [centers, showCenters]);

  // Points for FitBounds
  const allPoints = useMemo(() => validPins.map((p) => p.coords), [validPins]);

  // Critical alert list
  const activeHigh = useMemo(() =>
    disasters.filter(d => (d.severity || "").toUpperCase() === "HIGH" && (d.status || "").toUpperCase() === "ACTIVE"),
    [disasters]
  );
  const activeCount = filtered.filter(d => (d.status || "").toUpperCase() === "ACTIVE").length;

  const hasActiveFilters = filterSev !== "ALL" || filterStatus !== "ALL" || filterType !== "ALL" || filterSource !== "ALL" || searchQuery.trim() !== "";

  const resetFilters = () => {
    setFilterSev("ALL");
    setFilterStatus("ALL");
    setFilterType("ALL");
    setFilterSource("ALL");
    setSearchQuery("");
  };

  const handleIncidentClick = (d, coords) => {
    setSelectedId(d.id);
    if (coords) {
      setFlyTarget(coords);
      setUnlocatedNotice(null);
    } else {
      setUnlocatedNotice(`Incident #${d.id} (${d.disasterName}) has no verified GPS coordinates; safely omitted from map projection.`);
      setTimeout(() => setUnlocatedNotice(null), 4500);
    }
  };

  const defaultCenter = [22.5937, 78.9629];

  return (
    <div style={{ background: "#0a0f1e", border: "1px solid #1e293b", borderRadius: "14px", overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>

      {/* ── Top Header Toolbar ── */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        flexWrap: "wrap", gap: "10px", padding: "12px 18px",
        background: "linear-gradient(90deg, #0d1526 0%, #111827 100%)",
        borderBottom: "1px solid #1e293b",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <Layers size={17} color="#38bdf8" />
          <span style={{ fontWeight: "700", fontSize: "14px", color: "#f8fafc" }}>
            Live GIS Incident &amp; Resource Map
          </span>
          <span style={{
            fontSize: "11px", background: "rgba(56,189,248,0.12)", color: "#38bdf8",
            border: "1px solid rgba(56,189,248,0.3)", borderRadius: "100px", padding: "2px 9px", fontWeight: "700",
          }}>
            {validPins.length} Mapped Pins
          </span>
          {unlocatedCount > 0 && (
            <span
              title="Incidents without coordinates safely excluded from GIS projection"
              style={{
                fontSize: "11px", background: "rgba(148,163,184,0.12)", color: "#94a3b8",
                border: "1px solid rgba(148,163,184,0.3)", borderRadius: "100px", padding: "2px 9px", fontWeight: "600",
              }}
            >
              ⚠️ {unlocatedCount} Unmapped (No GPS)
            </span>
          )}
          {activeHigh.length > 0 && (
            <span style={{
              fontSize: "11px", background: "rgba(239,68,68,0.15)", color: "#f87171",
              border: "1px solid rgba(239,68,68,0.35)", borderRadius: "100px", padding: "2px 9px", fontWeight: "700",
            }}>
              ⚠ {activeHigh.length} CRITICAL
            </span>
          )}
        </div>

        {/* Toolbar action buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
          <button
            onClick={() => setFitTrigger(t => t + 1)}
            style={{
              fontSize: "11px", fontWeight: "600", padding: "5px 10px", borderRadius: "6px",
              border: "1px solid #1e293b", cursor: "pointer",
              background: "#111827", color: "#94a3b8",
              display: "flex", alignItems: "center", gap: "4px",
            }}
            title="Recenter map bounds to all active pins"
          >
            <Crosshair size={12} color="#38bdf8" /> Recenter
          </button>
          <button
            onClick={() => setShowCenters(!showCenters)}
            style={{
              fontSize: "11px", fontWeight: "600", padding: "5px 10px", borderRadius: "6px",
              border: `1px solid ${showCenters ? "rgba(59,130,246,0.5)" : "#1e293b"}`,
              cursor: "pointer",
              background: showCenters ? "rgba(59,130,246,0.15)" : "#111827",
              color: showCenters ? "#60a5fa" : "#64748b",
            }}
          >
            🏢 Centers ({validCenterPins.length})
          </button>
          <button
            onClick={() => setShowCommunityReports(!showCommunityReports)}
            style={{
              fontSize: "11px", fontWeight: "600", padding: "5px 10px", borderRadius: "6px",
              border: `1px solid ${showCommunityReports ? "rgba(168,85,247,0.5)" : "#1e293b"}`,
              cursor: "pointer",
              background: showCommunityReports ? "rgba(168,85,247,0.15)" : "#111827",
              color: showCommunityReports ? "#c084fc" : "#64748b",
            }}
            title="Toggle verified community field reports"
          >
            📢 Community ({verifiedCommunityReports.length})
          </button>
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            style={{
              fontSize: "11px", fontWeight: "600", padding: "5px 10px", borderRadius: "6px",
              border: "1px solid #1e293b", cursor: "pointer",
              background: showSidebar ? "rgba(56,189,248,0.1)" : "#111827",
              color: showSidebar ? "#38bdf8" : "#64748b",
            }}
          >
            📋 Sidebar
          </button>
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              style={{
                fontSize: "11px", fontWeight: "600", padding: "5px 10px", borderRadius: "6px",
                border: "1px solid #1e293b", cursor: isRefreshing ? "wait" : "pointer",
                background: "#111827", color: isRefreshing ? "#38bdf8" : "#94a3b8",
                display: "flex", alignItems: "center", gap: "4px",
              }}
              title="Sync telemetry from backend"
            >
              <RefreshCw size={12} style={{ animation: isRefreshing ? "mapSpin 0.8s linear infinite" : "none" }} />
              {isRefreshing ? "Syncing..." : "Sync"}
            </button>
          )}
        </div>
      </div>

      {/* ── Multi-Criteria Filters Bar ── */}
      <div style={{
        padding: "10px 18px",
        background: "#0c1322",
        borderBottom: "1px solid #1e293b",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "10px",
      }}>
        {/* Left: Quick search & Dropdowns */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", flex: 1 }}>
          {/* Search box */}
          <div style={{ position: "relative", minWidth: "170px" }}>
            <Search size={12} color="#64748b" style={{ position: "absolute", left: "9px", top: "50%", transform: "translateY(-50%)" }} />
            <input
              type="text"
              placeholder="Filter by name / district..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: "#111827",
                border: "1px solid #1e293b",
                borderRadius: "6px",
                color: "#e2e8f0",
                fontSize: "11px",
                padding: "5px 10px 5px 28px",
                width: "100%",
                outline: "none",
              }}
            />
          </div>

          {/* Severity Filters */}
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <span style={{ fontSize: "11px", color: "#64748b", marginRight: "2px" }}>Severity:</span>
            {["ALL", "HIGH", "MEDIUM", "LOW"].map((s) => {
              const col = s === "HIGH" ? "#ef4444" : s === "MEDIUM" ? "#f59e0b" : s === "LOW" ? "#10b981" : "#38bdf8";
              const isActive = filterSev === s;
              return (
                <button
                  key={s}
                  onClick={() => setFilterSev(s)}
                  style={{
                    fontSize: "10px", fontWeight: "700", padding: "4px 8px", borderRadius: "5px",
                    border: `1px solid ${isActive ? col : "#1e293b"}`,
                    cursor: "pointer",
                    background: isActive ? `${col}22` : "#111827",
                    color: isActive ? col : "#64748b",
                  }}
                >
                  {s}
                </button>
              );
            })}
          </div>

          {/* Status Filter */}
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <span style={{ fontSize: "11px", color: "#64748b", marginRight: "2px" }}>Status:</span>
            {["ALL", "ACTIVE", "RESOLVED"].map((st) => {
              const isActive = filterStatus === st;
              return (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  style={{
                    fontSize: "10px", fontWeight: "700", padding: "4px 8px", borderRadius: "5px",
                    border: `1px solid ${isActive ? "#38bdf8" : "#1e293b"}`,
                    cursor: "pointer",
                    background: isActive ? "rgba(56,189,248,0.15)" : "#111827",
                    color: isActive ? "#38bdf8" : "#64748b",
                  }}
                >
                  {st}
                </button>
              );
            })}
          </div>

          {/* Source Filter (GDACS vs Manual) */}
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <span style={{ fontSize: "11px", color: "#64748b", marginRight: "2px" }}>Source:</span>
            {["ALL", "GDACS", "MANUAL"].map((src) => {
              const isActive = filterSource === src;
              const col = src === "GDACS" ? "#c084fc" : "#38bdf8";
              return (
                <button
                  key={src}
                  onClick={() => setFilterSource(src)}
                  style={{
                    fontSize: "10px", fontWeight: "700", padding: "4px 8px", borderRadius: "5px",
                    border: `1px solid ${isActive ? col : "#1e293b"}`,
                    cursor: "pointer",
                    background: isActive ? `${col}22` : "#111827",
                    color: isActive ? col : "#64748b",
                  }}
                >
                  {src === "GDACS" ? "📡 GDACS" : src === "MANUAL" ? "👤 Manual" : "All"}
                </button>
              );
            })}
          </div>

          {/* Type dropdown */}
          {distinctTypes.length > 0 && (
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              style={{
                background: "#111827",
                border: "1px solid #1e293b",
                borderRadius: "5px",
                color: filterType !== "ALL" ? "#38bdf8" : "#94a3b8",
                fontSize: "11px",
                fontWeight: "600",
                padding: "4px 8px",
                outline: "none",
                cursor: "pointer",
              }}
            >
              <option value="ALL">All Disaster Types</option>
              {distinctTypes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          )}

          {/* Reset button */}
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              style={{
                fontSize: "10px", fontWeight: "700", padding: "4px 8px", borderRadius: "5px",
                border: "1px solid #ef4444", cursor: "pointer",
                background: "rgba(239,68,68,0.15)", color: "#f87171",
                display: "flex", alignItems: "center", gap: "3px",
              }}
              title="Reset all applied filters"
            >
              <RotateCcw size={10} /> Reset
            </button>
          )}
        </div>

        {/* Right: Telemetry status info */}
        <div style={{ fontSize: "11px", color: "#64748b", display: "flex", alignItems: "center", gap: "5px" }}>
          <Clock size={11} />
          <span>Updated {timeAgo((lastUpdated ? lastUpdated.toISOString() : null) || new Date().toISOString())}</span>
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
        </div>
      )}

      {/* ── Map + Sidebar Row ── */}
      <div style={{ display: "flex", height: "460px" }}>

        {/* Leaflet Map */}
        <div style={{ flex: 1, position: "relative" }}>
          <MapContainer
            center={defaultCenter}
            zoom={5}
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

            {allPoints.length > 0 && (
              <FitBounds
                points={allPoints}
                fitTrigger={fitTrigger}
                activePopupId={activePopupId}
              />
            )}
            <MapFlyController
              target={flyTarget}
              onFlyComplete={() => setFlyTarget(null)}
            />

            {/* ── Disaster Markers (Only Valid Coordinates Rendered) ── */}
            {validPins.map(({ disaster: d, coords }) => {
              const sev = getSev(d.severity);
              const isHigh = (d.severity || "").toUpperCase() === "HIGH";

              return (
                <React.Fragment key={`d-${d.id}`}>
                  <Marker
                    position={coords}
                    icon={createDisasterPin(d)}
                    eventHandlers={{
                      popupopen: () => setActivePopupId(d.id),
                      popupclose: () => setActivePopupId((prev) => (prev === d.id ? null : prev)),
                    }}
                  >
                    <Popup minWidth={280} maxWidth={320} autoPan={false}>
                      <DisasterPopup d={d} coords={coords} />
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
                </React.Fragment>
              );
            })}

            {/* ── Training Center Markers ── */}
            {showCenters && validCenterPins.map(({ center: c, coords }) => (
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
            ))}

            {/* ── Verified Community Report Markers (Phase 7) ── */}
            {showCommunityReports && verifiedCommunityReports.map((r) => {
              if (r.latitude == null || r.longitude == null) return null;
              return (
                <Marker
                  key={`cr-${r.id}`}
                  position={[r.latitude, r.longitude]}
                  icon={createCommunityReportPin(r)}
                >
                  <Popup minWidth={260}>
                    <div style={{ fontFamily: "'Inter', sans-serif", width: "260px" }}>
                      <div style={{
                        background: "rgba(147,51,234,0.18)",
                        borderBottom: "1px solid #1e293b",
                        padding: "10px 14px",
                        borderRadius: "12px 12px 0 0",
                      }}>
                        <div style={{ fontSize: "10px", fontWeight: "800", color: "#c084fc", letterSpacing: "0.08em", marginBottom: "2px" }}>
                          📢 VERIFIED COMMUNITY REPORT
                        </div>
                        <div style={{ fontSize: "14px", fontWeight: "800", color: "#f8fafc" }}>
                          {r.disasterType}
                        </div>
                        <div style={{ fontSize: "11px", color: "#cbd5e1", marginTop: "2px" }}>
                          📍 {r.locationName} {r.district ? `(${r.district})` : ""}
                        </div>
                      </div>
                      <div style={{ padding: "10px 14px" }}>
                        <div style={{ fontSize: "12px", color: "#e2e8f0", lineHeight: 1.4, marginBottom: "8px" }}>
                          {r.description}
                        </div>
                        {r.imageUrl && (
                          <img
                            src={r.imageUrl}
                            alt="Field report attachment"
                            style={{
                              width: "100%",
                              maxHeight: "130px",
                              objectFit: "cover",
                              borderRadius: "6px",
                              marginBottom: "8px",
                              border: "1px solid #334155",
                            }}
                          />
                        )}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "10.5px", color: "#94a3b8" }}>
                          <span>Severity: <strong style={{ color: "#fca5a5" }}>{r.severity}</strong></span>
                          <span>Reporter: {r.userName || "Verified Citizen"}</span>
                        </div>
                        {r.verificationNotes && (
                          <div style={{ marginTop: "6px", fontSize: "10.5px", color: "#c084fc", background: "rgba(168,85,247,0.12)", padding: "4px 8px", borderRadius: "4px", border: "1px solid rgba(168,85,247,0.25)" }}>
                            ✓ {r.verificationNotes}
                          </div>
                        )}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}

            {/* ── User Alert Location Radius Zone ── */}
            {userAlertLocation && userAlertLocation.latitude && userAlertLocation.longitude && (
              <React.Fragment key="user-alert-zone">
                <Circle
                  center={[userAlertLocation.latitude, userAlertLocation.longitude]}
                  radius={(userAlertLocation.radiusKm || 50) * 1000}
                  pathOptions={{
                    color: "#38bdf8",
                    fillColor: "#0284c7",
                    fillOpacity: 0.08,
                    weight: 1.5,
                    dashArray: "6, 6",
                  }}
                />
                <Marker
                  position={[userAlertLocation.latitude, userAlertLocation.longitude]}
                  icon={L.divIcon({
                    className: "",
                    html: `
                      <div style="position:relative;display:flex;align-items:center;justify-content:center;">
                        <div style="position:absolute;width:34px;height:34px;border-radius:50%;background:rgba(56,189,248,0.25);animation:mapPing 2.2s ease-in-out infinite;top:-6px;left:-6px;"></div>
                        <div style="
                          width:22px;height:22px;border-radius:50%;
                          background:#0284c7;
                          border:2px solid #ffffff;
                          box-shadow:0 0 12px rgba(56,189,248,0.8);
                          display:flex;align-items:center;justify-content:center;
                          font-size:11px;
                        ">
                          📍
                        </div>
                      </div>`,
                    iconSize: [22, 22],
                    iconAnchor: [11, 11],
                  })}
                >
                  <Popup minWidth={180}>
                    <div style={{ fontFamily: "'Inter', sans-serif", padding: "4px 8px", color: "#f8fafc" }}>
                      <div style={{ fontSize: "11px", fontWeight: "700", color: "#38bdf8" }}>
                        YOUR ALERT ZONE
                      </div>
                      <div style={{ fontSize: "13px", fontWeight: "600", marginTop: "2px" }}>
                        {userAlertLocation.locationName || "Configured Location"}
                      </div>
                      <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>
                        Radius: {userAlertLocation.radiusKm || 50} km
                      </div>
                    </div>
                  </Popup>
                </Marker>
              </React.Fragment>
            )}
          </MapContainer>

          {/* ── Map Legend ── */}
          <div style={{
            position: "absolute", bottom: "12px", left: "12px", zIndex: 1000,
            background: "rgba(9,13,22,0.9)", border: "1px solid #1e293b",
            borderRadius: "8px", padding: "8px 12px", backdropFilter: "blur(8px)",
          }}>
            <div style={{ fontSize: "10px", fontWeight: "700", color: "#64748b", letterSpacing: "0.08em", marginBottom: "6px" }}>GIS LEGEND</div>
            {[
              { color: "#ef4444", glow: "rgba(239,68,68,0.5)", label: "HIGH Severity" },
              { color: "#f59e0b", glow: "rgba(245,158,11,0.4)", label: "MEDIUM Severity" },
              { color: "#10b981", glow: "rgba(16,185,129,0.3)", label: "LOW Severity" },
              { color: "#3b82f6", glow: "rgba(59,130,246,0.3)", label: "Relief Center", square: true },
              { color: "#9333ea", glow: "rgba(168,85,247,0.5)", label: "Verified Community Report", square: true },
            ].map((item) => (
              <div key={item.label} style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                <div style={{
                  width: "12px", height: "12px",
                  borderRadius: item.square ? "3px" : "50%",
                  background: item.color,
                  boxShadow: `0 0 5px ${item.glow}`,
                  flexShrink: 0,
                }} />
                <span style={{ fontSize: "11px", color: "#94a3b8" }}>{item.label}</span>
              </div>
            ))}
            <div style={{ fontSize: "9px", color: "#64748b", marginTop: "4px", borderTop: "1px solid #1e293b", paddingTop: "4px" }}>
              * Unlocated incidents omitted
            </div>
          </div>
        </div>

        {/* ── Live Updates Sidebar ── */}
        {showSidebar && (
          <div style={{
            width: "260px", flexShrink: 0,
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
                <span style={{ fontSize: "12px", fontWeight: "700", color: "#f8fafc" }}>INCIDENT FEED</span>
                <span style={{
                  marginLeft: "auto", fontSize: "10px", fontWeight: "700",
                  background: "rgba(56,189,248,0.15)", color: "#38bdf8",
                  border: "1px solid rgba(56,189,248,0.35)", borderRadius: "100px",
                  padding: "1px 7px",
                }}>
                  {filtered.length} MATCHED
                </span>
              </div>
              <div style={{ fontSize: "10px", color: "#475569", marginTop: "3px", display: "flex", alignItems: "center", gap: "3px" }}>
                <Clock size={10} /> Auto-synced with dashboard
              </div>
            </div>

            {/* Notification notice if user clicks an unlocated incident */}
            {unlocatedNotice && (
              <div style={{
                background: "rgba(245, 158, 11, 0.15)",
                borderBottom: "1px solid rgba(245, 158, 11, 0.3)",
                padding: "8px 12px",
                fontSize: "11px",
                color: "#fcd34d",
                lineHeight: 1.4,
              }}>
                {unlocatedNotice}
              </div>
            )}

            {/* Incident List */}
            {filtered.length === 0 ? (
              <div style={{ padding: "30px 14px", textAlign: "center", color: "#475569", fontSize: "12px" }}>
                No incidents match current filter criteria.
              </div>
            ) : (
              filtered.slice().sort((a, b) => {
                // Sort: HIGH first, then ACTIVE, then by date desc
                const sevOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
                const sa = sevOrder[(a.severity||"").toUpperCase()] ?? 3;
                const sb = sevOrder[(b.severity||"").toUpperCase()] ?? 3;
                if (sa !== sb) return sa - sb;
                return new Date(b.reportedDate || 0) - new Date(a.reportedDate || 0);
              }).map((d) => {
                const coords = getValidCoordinates(d);
                const sev = getSev(d.severity);
                const sta = getStatus(d.status);
                const isHigh = (d.severity || "").toUpperCase() === "HIGH";
                const isSelected = selectedId === d.id;
                const isGdacs = (d.source || "").toLowerCase() === "gdacs";

                return (
                  <div
                    key={`side-${d.id}`}
                    onClick={() => handleIncidentClick(d, coords)}
                    style={{
                      padding: "10px 14px",
                      borderBottom: "1px solid #0f172a",
                      background: isSelected
                        ? "rgba(56,189,248,0.12)"
                        : isHigh
                        ? "rgba(239,68,68,0.04)"
                        : "transparent",
                      borderLeft: isSelected ? "3px solid #38bdf8" : "3px solid transparent",
                      transition: "all 0.15s ease",
                      cursor: "pointer",
                    }}
                    onMouseEnter={e => {
                      if (!isSelected) e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                    }}
                    onMouseLeave={e => {
                      if (!isSelected) e.currentTarget.style.background = isHigh ? "rgba(239,68,68,0.04)" : "transparent";
                    }}
                    title={coords ? "Click to inspect on map" : "No GPS coordinates available"}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "7px" }}>
                      <div style={{
                        width: "8px", height: "8px", borderRadius: "50%",
                        background: sev.color, flexShrink: 0, marginTop: "4px",
                        boxShadow: `0 0 6px ${sev.glow}`,
                      }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: "12px", fontWeight: "700", color: isSelected ? "#38bdf8" : "#e2e8f0",
                          lineHeight: 1.25, marginBottom: "2px",
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                          {d.disasterName}
                        </div>
                        <div style={{ fontSize: "10px", color: "#64748b", marginBottom: "4px" }}>
                          {d.disasterType} · {d.district}
                        </div>
                        <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", alignItems: "center" }}>
                          <span style={{
                            fontSize: "9px", fontWeight: "700", padding: "1px 5px",
                            borderRadius: "100px", background: sev.bg, color: sev.text, border: `1px solid ${sev.border}`,
                          }}>
                            {(d.severity||"?").toUpperCase()}
                          </span>
                          <span style={{
                            fontSize: "9px", fontWeight: "700", padding: "1px 5px",
                            borderRadius: "100px", background: sta.bg, color: sta.color, border: `1px solid ${sta.border}`,
                          }}>
                            {(d.status||"?").replace(/_/g," ")}
                          </span>
                          {isGdacs ? (
                            <span style={{ fontSize: "9px", fontWeight: "700", color: "#c084fc", background: "rgba(168,85,247,0.15)", padding: "1px 5px", borderRadius: "4px" }}>
                              GDACS
                            </span>
                          ) : (
                            <span style={{ fontSize: "9px", fontWeight: "600", color: "#94a3b8", background: "rgba(100,116,139,0.15)", padding: "1px 5px", borderRadius: "4px" }}>
                              Manual
                            </span>
                          )}
                          {!coords && (
                            <span style={{ fontSize: "9px", fontWeight: "600", color: "#eab308", background: "rgba(234,179,8,0.12)", padding: "1px 5px", borderRadius: "4px" }}>
                              No GPS
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: "10px", color: "#475569", marginTop: "4px" }}>
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
                  { label: "HIGH", count: filtered.filter(d=>(d.severity||"").toUpperCase()==="HIGH").length, color: "#ef4444" },
                  { label: "MED",  count: filtered.filter(d=>(d.severity||"").toUpperCase()==="MEDIUM").length, color: "#f59e0b" },
                  { label: "LOW",  count: filtered.filter(d=>(d.severity||"").toUpperCase()==="LOW").length, color: "#10b981" },
                ].map(item => (
                  <div key={item.label}>
                    <div style={{ fontSize: "15px", fontWeight: "800", color: item.color }}>{item.count}</div>
                    <div style={{ fontSize: "9px", color: "#64748b", fontWeight: "600" }}>{item.label}</div>
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
