import { useState, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { AlertTriangle, Building2, MapPin, Layers, Filter } from "lucide-react";

// District Geo Registry fallback mapping
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
  mumbai: [19.076, 72.8777],
  delhi: [28.6139, 77.209],
  bengaluru: [12.9716, 77.5946],
  hyderabad: [17.385, 78.4867],
  kolkata: [22.5726, 88.3639],
  wayanad: [11.6854, 76.132],
  default: [11.1271, 78.6569], // Tamil Nadu geographic center
};

function getCoordinatesForDistrict(districtName = "", id = 1) {
  const key = districtName.toLowerCase().trim();
  const base = DISTRICT_COORDINATES[key] || DISTRICT_COORDINATES.default;
  // Apply a deterministic small offset based on id to prevent overlapping pins in the same district
  const offsetLat = ((id * 37) % 100) * 0.003 - 0.15;
  const offsetLng = ((id * 73) % 100) * 0.003 - 0.15;
  return [base[0] + offsetLat, base[1] + offsetLng];
}

// Custom HTML Pin Markers
function createDisasterPin(severity = "LOW") {
  const sev = String(severity).toUpperCase();
  let color = "#10b981"; // Low (emerald)
  let pulseClass = "";

  if (sev === "HIGH") {
    color = "#ef4444"; // Red
    pulseClass = "pulse-animation";
  } else if (sev === "MEDIUM") {
    color = "#f59e0b"; // Amber
  }

  return L.divIcon({
    className: "custom-map-marker",
    html: `
      <div style="position: relative; display: flex; align-items: center; justify-content: center;">
        ${
          sev === "HIGH"
            ? `<div style="position: absolute; width: 34px; height: 34px; border-radius: 50%; background: rgba(239,68,68,0.35); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>`
            : ""
        }
        <div style="width: 26px; height: 26px; border-radius: 50%; background: ${color}; border: 2.5px solid #0f172a; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.4);">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
        </div>
      </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

function createCenterPin() {
  return L.divIcon({
    className: "custom-center-marker",
    html: `
      <div style="width: 24px; height: 24px; border-radius: 6px; background: #3b82f6; border: 2px solid #0f172a; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.35);">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <rect width="16" height="20" x="4" y="2" rx="2" ry="2"></rect>
          <path d="M9 22v-4h6v4"></path>
          <path d="M8 6h.01"></path>
          <path d="M16 6h.01"></path>
          <path d="M8 10h.01"></path>
          <path d="M16 10h.01"></path>
          <path d="M8 14h.01"></path>
          <path d="M16 14h.01"></path>
        </svg>
      </div>
    `,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

function DisasterMap({ disasters = [], centers = [] }) {
  const [filterSeverity, setFilterSeverity] = useState("ALL");
  const [showCenters, setShowCenters] = useState(true);

  const filteredDisasters = useMemo(() => {
    if (filterSeverity === "ALL") return disasters;
    return disasters.filter(
      (d) => d.severity?.toUpperCase() === filterSeverity.toUpperCase()
    );
  }, [disasters, filterSeverity]);

  const defaultCenter = [11.1271, 78.6569]; // Geographic center

  return (
    <div
      style={{
        background: "#0f172a",
        border: "1px solid #1e293b",
        borderRadius: "12px",
        overflow: "hidden",
        boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
      }}
    >
      {/* Map Control Toolbar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          padding: "14px 20px",
          background: "#111827",
          borderBottom: "1px solid #1e293b",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Layers size={18} color="#38bdf8" />
          <span style={{ fontWeight: "600", fontSize: "0.95rem", color: "#f8fafc" }}>
            Live GIS Incident & Resource Map
          </span>
          <span
            style={{
              fontSize: "0.75rem",
              background: "rgba(56, 189, 248, 0.12)",
              color: "#38bdf8",
              border: "1px solid rgba(56, 189, 248, 0.25)",
              borderRadius: "100px",
              padding: "2px 8px",
              fontWeight: "600",
            }}
          >
            {filteredDisasters.length} Active Pins
          </span>
        </div>

        {/* Filter Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "0.8rem", color: "#94a3b8", display: "flex", alignItems: "center", gap: "4px" }}>
            <Filter size={14} /> Severity:
          </span>
          {["ALL", "HIGH", "MEDIUM", "LOW"].map((sev) => (
            <button
              key={sev}
              onClick={() => setFilterSeverity(sev)}
              style={{
                fontSize: "0.75rem",
                fontWeight: "600",
                padding: "4px 10px",
                borderRadius: "6px",
                border: "none",
                cursor: "pointer",
                transition: "all 0.2s",
                background:
                  filterSeverity === sev
                    ? sev === "HIGH"
                      ? "#ef4444"
                      : sev === "MEDIUM"
                      ? "#f59e0b"
                      : sev === "LOW"
                      ? "#10b981"
                      : "#2563eb"
                    : "#1e293b",
                color: filterSeverity === sev ? "#fff" : "#94a3b8",
              }}
            >
              {sev}
            </button>
          ))}

          <button
            onClick={() => setShowCenters(!showCenters)}
            style={{
              fontSize: "0.75rem",
              fontWeight: "600",
              padding: "4px 10px",
              borderRadius: "6px",
              border: "1px solid #334155",
              cursor: "pointer",
              marginLeft: "6px",
              background: showCenters ? "rgba(59, 130, 246, 0.2)" : "#1e293b",
              color: showCenters ? "#60a5fa" : "#94a3b8",
            }}
          >
            🏢 Centers ({centers.length})
          </button>
        </div>
      </div>

      {/* Leaflet Map Box */}
      <div style={{ height: "420px", width: "100%", position: "relative" }}>
        <MapContainer
          center={defaultCenter}
          zoom={7}
          scrollWheelZoom={false}
          style={{ height: "100%", width: "100%", background: "#090d16" }}
        >
          {/* Dark / Minimal CartoDB Positron Tile layer for sleek aesthetic */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />

          {/* Disaster Pins */}
          {filteredDisasters.map((d) => {
            const coords = getCoordinatesForDistrict(d.district || "", d.id || 1);
            const isHigh = d.severity?.toUpperCase() === "HIGH";

            return (
              <div key={`disaster-${d.id}`}>
                <Marker position={coords} icon={createDisasterPin(d.severity)}>
                  <Popup>
                    <div style={{ minWidth: "190px", padding: "4px 0", color: "#0f172a" }}>
                      <div
                        style={{
                          fontSize: "0.9rem",
                          fontWeight: "700",
                          color: isHigh ? "#dc2626" : "#0f172a",
                          marginBottom: "4px",
                        }}
                      >
                        {d.disasterName || "Incident"}
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "#475569", marginBottom: "4px" }}>
                        📍 <strong>District:</strong> {d.district || "Unknown"}
                      </div>
                      <div style={{ display: "flex", gap: "6px", marginTop: "6px" }}>
                        <span
                          style={{
                            fontSize: "0.7rem",
                            fontWeight: "700",
                            padding: "2px 6px",
                            borderRadius: "4px",
                            background: isHigh ? "#fef2f2" : "#fefce8",
                            color: isHigh ? "#b91c1c" : "#a16207",
                            border: `1px solid ${isHigh ? "#fecaca" : "#fef08a"}`,
                          }}
                        >
                          {d.severity || "LOW"} SEVERITY
                        </span>
                        <span
                          style={{
                            fontSize: "0.7rem",
                            fontWeight: "600",
                            padding: "2px 6px",
                            borderRadius: "4px",
                            background: "#f0fdf4",
                            color: "#15803d",
                          }}
                        >
                          {d.status || "ACTIVE"}
                        </span>
                      </div>
                    </div>
                  </Popup>
                </Marker>

                {/* High severity danger zone circle */}
                {isHigh && (
                  <Circle
                    center={coords}
                    radius={18000}
                    pathOptions={{
                      color: "#ef4444",
                      fillColor: "#ef4444",
                      fillOpacity: 0.12,
                      weight: 1,
                      dashArray: "4, 6",
                    }}
                  />
                )}
              </div>
            );
          })}

          {/* Training Center Pins */}
          {showCenters &&
            centers.map((c) => {
              const coords = getCoordinatesForDistrict(c.location || c.centerName || "", (c.id || 1) + 50);
              return (
                <Marker key={`center-${c.id}`} position={coords} icon={createCenterPin()}>
                  <Popup>
                    <div style={{ minWidth: "180px", color: "#0f172a" }}>
                      <div style={{ fontSize: "0.85rem", fontWeight: "700", color: "#1d4ed8" }}>
                        🏢 {c.centerName || "Training Center"}
                      </div>
                      <div style={{ fontSize: "0.78rem", color: "#475569", marginTop: "3px" }}>
                        📍 {c.location || c.district || "Regional Relief Hub"}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "4px" }}>
                        📞 Contact: {c.contactNumber || "Emergency Desk"}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
        </MapContainer>
      </div>
    </div>
  );
}

export default DisasterMap;
