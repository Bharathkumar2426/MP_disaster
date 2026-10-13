import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  AlertTriangle,
  Info,
  Clock,
  CheckCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Wind,
  Droplets,
  Thermometer,
} from "lucide-react";
import { getDisasterRiskAssessment } from "../services/riskService";

// In-Memory cache for risk assessments (TTL: 5 minutes)
const riskCache = new Map();

export default function RiskAssessmentPanel({
  disasterId,
  hasCoords = true,
  compact = true,
  onAssessAgain = null,
}) {
  const [assessment, setAssessment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(!compact);

  useEffect(() => {
    if (!disasterId) return;

    const cached = riskCache.get(disasterId);
    if (cached && Date.now() - cached.timestamp < 300000) {
      setAssessment(cached.data);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    getDisasterRiskAssessment(disasterId)
      .then((res) => {
        if (!isMounted) return;
        const data = res.data;
        riskCache.set(disasterId, { data, timestamp: Date.now() });
        setAssessment(data);
      })
      .catch((err) => {
        if (!isMounted) return;
        const msg =
          err.response?.data?.detail || "Risk assessment service unavailable";
        setError(msg);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [disasterId]);

  if (!hasCoords) {
    return (
      <div
        style={{
          padding: "8px 14px",
          borderBottom: "1px solid #1e293b",
          fontSize: "11px",
          color: "#64748b",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <AlertTriangle size={13} color="#f59e0b" />
          Explainable risk assessment unavailable (no GPS coordinates)
        </span>
      </div>
    );
  }

  if (loading) {
    return (
      <div
        style={{
          padding: "10px 14px",
          borderBottom: "1px solid #1e293b",
          fontSize: "11px",
          color: "#94a3b8",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <div
          style={{
            width: "12px",
            height: "12px",
            borderRadius: "50%",
            border: "2px solid #a855f7",
            borderTopColor: "transparent",
            animation: "mapSpin 0.8s linear infinite",
          }}
        />
        Evaluating explainable atmospheric risk factors...
      </div>
    );
  }

  if (error || !assessment) {
    return (
      <div
        style={{
          padding: "8px 14px",
          borderBottom: "1px solid #1e293b",
          fontSize: "11px",
          color: "#ef4444",
          display: "flex",
          alignItems: "center",
          gap: "6px",
        }}
      >
        <AlertTriangle size={13} />
        {error || "Risk assessment unavailable"}
      </div>
    );
  }

  const category = (assessment.riskCategory || "UNKNOWN").toUpperCase();

  const categoryTheme = {
    HIGH: {
      color: "#ef4444",
      bg: "rgba(239, 68, 68, 0.15)",
      border: "rgba(239, 68, 68, 0.35)",
      label: "HIGH RISK",
    },
    ELEVATED: {
      color: "#f97316",
      bg: "rgba(249, 115, 22, 0.15)",
      border: "rgba(249, 115, 22, 0.35)",
      label: "ELEVATED RISK",
    },
    MODERATE: {
      color: "#eab308",
      bg: "rgba(234, 179, 8, 0.15)",
      border: "rgba(234, 179, 8, 0.35)",
      label: "MODERATE RISK",
    },
    LOW: {
      color: "#10b981",
      bg: "rgba(16, 185, 129, 0.15)",
      border: "rgba(16, 185, 129, 0.35)",
      label: "LOW RISK",
    },
    NOT_APPLICABLE: {
      color: "#94a3b8",
      bg: "rgba(148, 163, 184, 0.12)",
      border: "rgba(148, 163, 184, 0.25)",
      label: "NOT APPLICABLE",
    },
    DATA_INSUFFICIENT: {
      color: "#a855f7",
      bg: "rgba(168, 85, 247, 0.12)",
      border: "rgba(168, 85, 247, 0.25)",
      label: "DATA INSUFFICIENT",
    },
  }[category] || {
    color: "#64748b",
    bg: "rgba(100, 116, 139, 0.12)",
    border: "rgba(100, 116, 139, 0.25)",
    label: category,
  };

  const hasScore =
    typeof assessment.riskScore === "number" && !isNaN(assessment.riskScore);

  return (
    <div
      style={{
        padding: "10px 14px",
        borderBottom: "1px solid #1e293b",
        background: "rgba(15, 23, 42, 0.7)",
      }}
    >
      {/* Header Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "7px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <ShieldAlert size={13} color="#a855f7" />
          <span
            style={{
              fontSize: "10.5px",
              fontWeight: "700",
              color: "#c084fc",
              letterSpacing: "0.08em",
            }}
          >
            AI RISK ASSESSMENT
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span
            style={{
              fontSize: "9px",
              color: "#64748b",
              background: "#1e293b",
              padding: "2px 5px",
              borderRadius: "4px",
              border: "1px solid #334155",
            }}
            title="Provisional rule-based assessment based on Open-Meteo telemetry"
          >
            RULE-BASED v1.0
          </span>
          {compact && (
            <button
              onClick={() => setExpanded(!expanded)}
              style={{
                background: "transparent",
                border: "none",
                color: "#94a3b8",
                cursor: "pointer",
                padding: "0 2px",
                display: "flex",
                alignItems: "center",
              }}
              title={expanded ? "Collapse details" : "Expand details"}
            >
              {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
          )}
        </div>
      </div>

      {/* Primary Category & Score Row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "rgba(30, 41, 59, 0.5)",
          padding: "6px 8px",
          borderRadius: "6px",
          border: `1px solid ${categoryTheme.border}`,
          marginBottom: "6px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span
            style={{
              fontSize: "10.5px",
              fontWeight: "700",
              color: categoryTheme.color,
              background: categoryTheme.bg,
              padding: "2px 7px",
              borderRadius: "4px",
              border: `1px solid ${categoryTheme.border}`,
            }}
          >
            {categoryTheme.label}
          </span>
          <span style={{ fontSize: "11px", color: "#cbd5e1" }}>
            {assessment.disasterType || "Hazard"}
          </span>
        </div>

        {hasScore ? (
          <div style={{ textAlign: "right" }}>
            <span style={{ fontSize: "11px", fontWeight: "700", color: "#f8fafc" }}>
              {assessment.riskScore}
            </span>
            <span style={{ fontSize: "9px", color: "#64748b" }}> / 100</span>
          </div>
        ) : (
          <span style={{ fontSize: "10px", color: "#64748b" }}>Score N/A</span>
        )}
      </div>

      {/* Risk Score Progress Bar */}
      {hasScore && (
        <div
          style={{
            height: "4px",
            width: "100%",
            background: "#1e293b",
            borderRadius: "2px",
            overflow: "hidden",
            marginBottom: "7px",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${Math.min(100, Math.max(5, assessment.riskScore))}%`,
              background: categoryTheme.color,
              transition: "width 0.4s ease",
            }}
          />
        </div>
      )}

      {/* Concise Summary */}
      <div
        style={{
          fontSize: "11px",
          color: "#94a3b8",
          lineHeight: 1.45,
          marginBottom: "6px",
        }}
      >
        {assessment.summary}
      </div>

      {/* Expanded Breakdown */}
      {expanded && (
        <div style={{ marginTop: "6px" }}>
          {/* Contributing Factors */}
          {Array.isArray(assessment.contributingFactors) &&
            assessment.contributingFactors.length > 0 && (
              <div style={{ marginBottom: "6px" }}>
                <div
                  style={{
                    fontSize: "9.5px",
                    fontWeight: "700",
                    color: "#64748b",
                    marginBottom: "3px",
                    letterSpacing: "0.05em",
                  }}
                >
                  EXPLAINABLE METEOROLOGICAL FACTORS:
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                  {assessment.contributingFactors.map((f, idx) => (
                    <div
                      key={idx}
                      style={{
                        fontSize: "10.5px",
                        color: "#cbd5e1",
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "5px",
                      }}
                    >
                      <span style={{ color: "#38bdf8", marginTop: "1px" }}>•</span>
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          {/* Warnings if any */}
          {Array.isArray(assessment.warnings) && assessment.warnings.length > 0 && (
            <div
              style={{
                fontSize: "10px",
                color: "#f59e0b",
                background: "rgba(245, 158, 11, 0.1)",
                padding: "4px 7px",
                borderRadius: "4px",
                marginBottom: "6px",
                display: "flex",
                alignItems: "center",
                gap: "5px",
              }}
            >
              <AlertTriangle size={11} color="#f59e0b" />
              <span>{assessment.warnings.join(" ")}</span>
            </div>
          )}

          {/* Model / Method Limitations */}
          {Array.isArray(assessment.limitations) &&
            assessment.limitations.length > 0 && (
              <div
                style={{
                  fontSize: "9.5px",
                  color: "#64748b",
                  background: "rgba(30, 41, 59, 0.4)",
                  padding: "5px 7px",
                  borderRadius: "4px",
                  marginBottom: "6px",
                }}
              >
                <div
                  style={{
                    fontWeight: "600",
                    color: "#94a3b8",
                    marginBottom: "2px",
                  }}
                >
                  Limitations & Method Assumptions:
                </div>
                {assessment.limitations.map((lim, idx) => (
                  <div key={idx} style={{ marginTop: "1px" }}>
                    - {lim}
                  </div>
                ))}
              </div>
            )}

          {/* Footer Metadata */}
          <div
            style={{
              fontSize: "9px",
              color: "#475569",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: "4px",
              paddingTop: "4px",
              borderTop: "1px dashed #1e293b",
            }}
          >
            <span>
              Assessed:{" "}
              {assessment.assessmentTimestamp
                ? assessment.assessmentTimestamp.slice(11, 19) + " UTC"
                : "Recent"}
            </span>
            <span style={{ fontStyle: "italic" }}>
              Operational Estimate • Not Confirmed
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
