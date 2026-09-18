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
        background: "rgba(15, 23, 42, 0.9)",
        border: "1px solid rgba(239, 68, 68, 0.35)",
        borderLeft: "4px solid #ef4444",
        borderRadius: "8px",
        padding: "10px 16px",
        marginBottom: "20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "24px",
            height: "24px",
            borderRadius: "5px",
            background: "rgba(239, 68, 68, 0.15)",
            color: "#f87171",
            flexShrink: 0,
          }}
        >
          <AlertTriangle size={14} />
        </div>
        <div style={{ fontSize: "13px", color: "#cbd5e1", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          <span style={{ color: "#f87171", fontWeight: "700", marginRight: "6px", fontSize: "11.5px", letterSpacing: "0.4px", textTransform: "uppercase" }}>
            Alert:
          </span>
          <span style={{ color: "#f1f5f9", fontWeight: "600" }}>{latest.disasterName}</span> in {latest.district || "Active Sector"}{" "}
          <span style={{ color: "#94a3b8" }}>
            ({highSeverityDisasters.length} active high-priority)
          </span>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
        <button
          onClick={() => navigate("/disasters")}
          style={{
            background: "rgba(239, 68, 68, 0.12)",
            color: "#f87171",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            borderRadius: "6px",
            padding: "4px 10px",
            fontSize: "12px",
            fontWeight: "600",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "4px",
            transition: "all 0.15s ease",
          }}
        >
          View Incidents <ChevronRight size={13} />
        </button>
        <button
          onClick={() => setDismissed(true)}
          style={{
            background: "transparent",
            border: "none",
            color: "#64748b",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            padding: "4px",
            borderRadius: "4px",
          }}
          title="Dismiss alert"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
}

export default AlertBanner;
