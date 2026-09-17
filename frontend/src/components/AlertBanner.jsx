import { AlertTriangle, ChevronRight, X } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

function AlertBanner({ activeDisasters = [] }) {
  const [dismissed, setDismissed] = useState(false);
  const navigate = useNavigate();

  const highSeverityDisasters = activeDisasters.filter(
    (d) =>
      d.severity?.toUpperCase() === "HIGH" &&
      d.status?.toUpperCase() !== "RESOLVED" &&
      d.status?.toUpperCase() !== "CONTROLLED"
  );

  if (dismissed || highSeverityDisasters.length === 0) {
    return null;
  }

  const latest = highSeverityDisasters[0];

  return (
    <div
      style={{
        background: "rgba(220, 38, 38, 0.12)",
        border: "1px solid rgba(220, 38, 38, 0.3)",
        borderRadius: "10px",
        padding: "10px 16px",
        marginBottom: "20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
        color: "#fecaca",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "28px",
            height: "28px",
            borderRadius: "6px",
            background: "#dc2626",
            color: "#fff",
            flexShrink: 0,
          }}
        >
          <AlertTriangle size={16} />
        </div>
        <div style={{ fontSize: "0.85rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          <strong style={{ color: "#fff" }}>CRITICAL ALERT:</strong>{" "}
          <span>
            {latest.disasterName} in {latest.district || "Active Sector"} ({highSeverityDisasters.length} high-priority
            incident{highSeverityDisasters.length > 1 ? "s" : ""})
          </span>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
        <button
          onClick={() => navigate("/disasters")}
          style={{
            background: "#dc2626",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            padding: "4px 10px",
            fontSize: "0.78rem",
            fontWeight: "600",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          View Incidents <ChevronRight size={14} />
        </button>
        <button
          onClick={() => setDismissed(true)}
          style={{
            background: "transparent",
            border: "none",
            color: "#94a3b8",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            padding: "2px",
          }}
          title="Dismiss banner"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

export default AlertBanner;
