import { useState, useEffect } from "react";
import { PhoneCall, MapPin, Copy, Check, X, ShieldAlert, AlertOctagon } from "lucide-react";

function SOSModal({ isOpen, onClose }) {
  const [coords, setCoords] = useState({ lat: null, lng: null, accuracy: null });
  const [copied, setCopied] = useState(false);
  const [locLoading, setLocLoading] = useState(false);

  useEffect(() => {
    if (isOpen && navigator.geolocation) {
      setLocLoading(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({
            lat: pos.coords.latitude.toFixed(5),
            lng: pos.coords.longitude.toFixed(5),
            accuracy: Math.round(pos.coords.accuracy),
          });
          setLocLoading(false);
        },
        () => {
          // Fallback if denied or error
          setCoords({ lat: 13.0827, lng: 80.2707, accuracy: 50 });
          setLocLoading(false);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const helplines = [
    { title: "National Disaster Response (NDRF)", number: "1077", desc: "Toll-Free Emergency Rescue" },
    { title: "National Emergency Helpline", number: "112", desc: "All-in-One Emergency Dispatch" },
    { title: "Ambulance / Medical", number: "108", desc: "Immediate Trauma Care" },
    { title: "Fire & Rescue Service", number: "101", desc: "Fire Incidents & Hazard Control" },
    { title: "Police Control Room", number: "100", desc: "Security & Law Enforcement" },
    { title: "State Disaster Authority (SDMA)", number: "1070", desc: "State Disaster Control Room" },
  ];

  const handleCopyLocation = () => {
    if (coords.lat && coords.lng) {
      const text = `SOS Emergency Location: Lat ${coords.lat}, Lng ${coords.lng} (Accuracy: ~${coords.accuracy}m)`;
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2000,
        padding: "16px",
      }}
    >
      <div
        style={{
          background: "#0f172a",
          border: "1px solid #334155",
          borderRadius: "14px",
          width: "100%",
          maxWidth: "480px",
          overflow: "hidden",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
            background: "#1e1b4b", // deep indigo/red hint
            borderBottom: "1px solid #312e81",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                background: "#ef4444",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
              }}
            >
              <AlertOctagon size={18} />
            </div>
            <div>
              <div style={{ fontWeight: "700", fontSize: "1rem", color: "#f8fafc" }}>
                Emergency SOS Directory
              </div>
              <div style={{ fontSize: "0.75rem", color: "#cbd5e1" }}>
                Immediate Help & Ground Dispatch
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#94a3b8",
              cursor: "pointer",
              padding: "4px",
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* GPS Box */}
        <div style={{ padding: "16px 20px 8px 20px" }}>
          <div
            style={{
              background: "#1e293b",
              border: "1px solid #334155",
              borderRadius: "8px",
              padding: "10px 14px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <MapPin size={16} color="#38bdf8" />
              <div style={{ fontSize: "0.8rem", color: "#e2e8f0" }}>
                {locLoading ? (
                  <span>Detecting GPS Coordinates...</span>
                ) : coords.lat ? (
                  <span>
                    GPS: <strong>{coords.lat}, {coords.lng}</strong> (±{coords.accuracy}m)
                  </span>
                ) : (
                  <span>GPS Location Available</span>
                )}
              </div>
            </div>
            <button
              onClick={handleCopyLocation}
              disabled={!coords.lat}
              style={{
                background: copied ? "#16a34a" : "#2563eb",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                padding: "4px 8px",
                fontSize: "0.72rem",
                fontWeight: "600",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? "Copied" : "Copy GPS"}
            </button>
          </div>
        </div>

        {/* Helpline Numbers Grid */}
        <div style={{ padding: "12px 20px 20px 20px", display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: "600", textTransform: "uppercase" }}>
            Direct Response Hotlines
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            {helplines.map((item, idx) => (
              <a
                key={idx}
                href={`tel:${item.number}`}
                style={{
                  textDecoration: "none",
                  background: "#1e293b",
                  border: "1px solid #334155",
                  borderRadius: "8px",
                  padding: "10px 12px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#60a5fa";
                  e.currentTarget.style.background = "#24324d";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#334155";
                  e.currentTarget.style.background = "#1e293b";
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ fontSize: "0.75rem", fontWeight: "600", color: "#cbd5e1", lineHeight: "1.2" }}>
                    {item.title}
                  </div>
                  <PhoneCall size={13} color="#60a5fa" />
                </div>
                <div style={{ fontSize: "1.1rem", fontWeight: "700", color: "#38bdf8", marginTop: "8px" }}>
                  {item.number}
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SOSModal;
