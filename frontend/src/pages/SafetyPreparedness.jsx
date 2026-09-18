import { useState, useEffect, useMemo } from "react";
import "../styles/safety.css";
import { getSafetyTypes, getSafetyGuidance } from "../services/safetyService";
import {
  ShieldCheck,
  AlertTriangle,
  Waves,
  Wind,
  Activity,
  Flame,
  Mountain,
  Sun,
  CheckCircle2,
  XCircle,
  Package,
  ListChecks,
  PhoneCall,
  RotateCcw,
  CheckCheck,
  Info,
  Clock,
  HelpCircle,
  Shield,
  Loader2,
  FileCheck2,
  Radio,
  Zap,
  HeartPulse,
  BatteryCharging,
} from "lucide-react";

// Icon mapping helper
const getDisasterIcon = (iconName, size = 20) => {
  switch (iconName?.toLowerCase()) {
    case "waves":
      return <Waves size={size} />;
    case "wind":
      return <Wind size={size} />;
    case "activity":
      return <Activity size={size} />;
    case "flame":
      return <Flame size={size} />;
    case "mountain":
      return <Mountain size={size} />;
    case "sun":
      return <Sun size={size} />;
    default:
      return <AlertTriangle size={size} />;
  }
};

const getSeverityBadgeStyle = (risk) => {
  switch (risk?.toUpperCase()) {
    case "CRITICAL":
      return { background: "rgba(239, 68, 68, 0.15)", color: "#f87171", border: "1px solid rgba(239,68,68,0.3)" };
    case "HIGH":
      return { background: "rgba(249, 115, 22, 0.15)", color: "#fb923c", border: "1px solid rgba(249,115,22,0.3)" };
    case "MEDIUM":
      return { background: "rgba(245, 158, 11, 0.15)", color: "#fbbf24", border: "1px solid rgba(245,158,11,0.3)" };
    default:
      return { background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8", border: "1px solid rgba(56,189,248,0.3)" };
  }
};

function SafetyPreparedness() {
  const [types, setTypes] = useState([]);
  const [selectedType, setSelectedType] = useState("flood");
  const [guidance, setGuidance] = useState(null);
  const [activeTab, setActiveTab] = useState("BEFORE");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Checklist state stored per disaster type in localStorage
  const [checkedItems, setCheckedItems] = useState({});

  // 1. Fetch all disaster safety types on mount
  useEffect(() => {
    async function loadTypes() {
      try {
        setLoading(true);
        setError(null);
        const res = await getSafetyTypes();
        if (res.data && Array.isArray(res.data) && res.data.length > 0) {
          setTypes(res.data);
          setSelectedType(res.data[0].id);
        }
      } catch (err) {
        console.error("Error loading safety types:", err);
        setError("Failed to load disaster safety types from the server. Please check backend connection.");
      } finally {
        setLoading(false);
      }
    }
    loadTypes();
  }, []);

  // 2. Fetch detailed safety guidance when selected disaster type changes
  useEffect(() => {
    if (!selectedType) return;

    async function loadGuidance() {
      try {
        setLoading(true);
        setError(null);
        const res = await getSafetyGuidance(selectedType);
        setGuidance(res.data);

        // Load saved checklist state from localStorage
        const storageKey = `safety_checklist_${selectedType}`;
        const savedChecklist = localStorage.getItem(storageKey);
        if (savedChecklist) {
          try {
            setCheckedItems(JSON.parse(savedChecklist));
          } catch (e) {
            setCheckedItems({});
          }
        } else {
          setCheckedItems({});
        }
      } catch (err) {
        console.error(`Error loading safety guidance for ${selectedType}:`, err);
        setError(`Failed to retrieve life-safety protocols for "${selectedType}".`);
      } finally {
        setLoading(false);
      }
    }

    loadGuidance();
  }, [selectedType]);

  // Toggle checklist item
  const toggleChecklistItem = (itemId) => {
    setCheckedItems((prev) => {
      const updated = { ...prev, [itemId]: !prev[itemId] };
      const storageKey = `safety_checklist_${selectedType}`;
      localStorage.setItem(storageKey, JSON.stringify(updated));
      return updated;
    });
  };

  // Mark all checklist items as completed
  const handleMarkAllDone = () => {
    if (!guidance?.before?.checklist) return;
    const updated = {};
    guidance.before.checklist.forEach((item) => {
      updated[item.id] = true;
    });
    setCheckedItems(updated);
    localStorage.setItem(`safety_checklist_${selectedType}`, JSON.stringify(updated));
  };

  // Reset all checklist items
  const handleResetChecklist = () => {
    setCheckedItems({});
    localStorage.removeItem(`safety_checklist_${selectedType}`);
  };

  // Compute checklist completion metrics
  const checklistMetrics = useMemo(() => {
    const list = guidance?.before?.checklist || [];
    if (list.length === 0) return { total: 0, completed: 0, percent: 0 };
    const completed = list.filter((item) => !!checkedItems[item.id]).length;
    const percent = Math.round((completed / list.length) * 100);
    return { total: list.length, completed, percent };
  }, [guidance, checkedItems]);

  return (
    <div className="container-fluid px-0 safety-container">
      {/* Page Header */}
      <div className="safety-header d-flex justify-content-between align-items-center flex-wrap gap-3">
        <div>
          <h1 className="safety-title">
            <ShieldCheck size={24} color="#38bdf8" />
            Disaster Safety & Preparedness Hub
          </h1>
          <p className="safety-subtitle">
            Verified, expert-aligned life safety protocols across <strong>PREPARE (Before)</strong>, <strong>RESPOND (During)</strong>, and <strong>RECOVER (After)</strong> phases.
          </p>
        </div>
      </div>

      {/* Disaster Type Selector Bar */}
      <div className="disaster-selector-grid">
        {types.map((typeItem) => {
          const isSelected = selectedType === typeItem.id;
          return (
            <div
              key={typeItem.id}
              className={`disaster-type-card ${isSelected ? "active" : ""}`}
              onClick={() => setSelectedType(typeItem.id)}
            >
              <div
                className="disaster-type-icon"
                style={{
                  background: isSelected ? `${typeItem.badgeColor}25` : "#1e293b",
                  color: isSelected ? typeItem.badgeColor : "#94a3b8",
                  border: `1px solid ${isSelected ? typeItem.badgeColor : "transparent"}`,
                }}
              >
                {getDisasterIcon(typeItem.icon, 22)}
              </div>
              <span className="disaster-type-name">{typeItem.name}</span>
              <span
                className="disaster-type-risk"
                style={getSeverityBadgeStyle(typeItem.severityRisk)}
              >
                {typeItem.severityRisk}
              </span>
            </div>
          );
        })}
      </div>

      {/* Error state */}
      {error && (
        <div className="safety-error-state">
          <AlertTriangle size={28} className="mb-2" />
          <p className="m-0">{error}</p>
        </div>
      )}

      {/* Loading state */}
      {loading && !guidance && (
        <div className="safety-loading-state">
          <Loader2 size={32} className="spin-animation" color="#38bdf8" />
          <p>Loading verified safety protocols...</p>
        </div>
      )}

      {/* Active Disaster Guidance Section */}
      {guidance && (
        <div>
          {/* Overview Hero Banner */}
          <div className="safety-hero-card">
            <div className="safety-hero-top">
              <div>
                <div className="safety-hero-badge-group mb-2">
                  <span
                    className="safety-badge"
                    style={getSeverityBadgeStyle(guidance.severityRisk)}
                  >
                    Risk Level: {guidance.severityRisk}
                  </span>
                  <span
                    className="safety-badge"
                    style={{
                      background: "rgba(56, 189, 248, 0.12)",
                      color: "#38bdf8",
                      border: "1px solid rgba(56, 189, 248, 0.3)",
                    }}
                  >
                    {guidance.category}
                  </span>
                </div>
                <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#f8fafc", margin: 0 }}>
                  {guidance.disasterType} Safety Protocol & Action Guide
                </h2>
              </div>

              {/* Quick Readiness Score Widget */}
              <div
                style={{
                  background: "rgba(15, 23, 42, 0.7)",
                  border: "1px solid #334155",
                  borderRadius: "10px",
                  padding: "10px 16px",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                }}
              >
                <div>
                  <div style={{ fontSize: "11px", color: "#94a3b8", textTransform: "uppercase", fontWeight: "600" }}>
                    Readiness Score
                  </div>
                  <div style={{ fontSize: "16px", fontWeight: "700", color: checklistMetrics.percent === 100 ? "#10b981" : "#38bdf8" }}>
                    {checklistMetrics.completed} / {checklistMetrics.total} Items ({checklistMetrics.percent}%)
                  </div>
                </div>
                <FileCheck2 size={24} color={checklistMetrics.percent === 100 ? "#10b981" : "#38bdf8"} />
              </div>
            </div>

            <p className="safety-hero-desc">{guidance.description}</p>

            {/* Primary Hazards Pills */}
            {guidance.overview?.primaryHazards && (
              <div className="safety-hazard-pills">
                <span style={{ fontSize: "12px", fontWeight: "600", color: "#94a3b8" }}>Primary Hazards:</span>
                {guidance.overview.primaryHazards.map((hazard, idx) => (
                  <span key={idx} className="safety-hazard-pill">
                    <AlertTriangle size={12} />
                    {hazard}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Navigation Phase Tabs */}
          <div className="safety-nav-tabs">
            <button
              className={`safety-tab-btn ${activeTab === "BEFORE" ? "active" : ""}`}
              onClick={() => setActiveTab("BEFORE")}
            >
              <Shield size={16} />
              PREPARE (Before)
            </button>
            <button
              className={`safety-tab-btn ${activeTab === "DURING" ? "active" : ""}`}
              onClick={() => setActiveTab("DURING")}
            >
              <Zap size={16} />
              RESPOND (During)
            </button>
            <button
              className={`safety-tab-btn ${activeTab === "AFTER" ? "active" : ""}`}
              onClick={() => setActiveTab("AFTER")}
            >
              <Clock size={16} />
              RECOVER (After)
            </button>
            <button
              className={`safety-tab-btn ${activeTab === "PRECAUTIONS" ? "active" : ""}`}
              onClick={() => setActiveTab("PRECAUTIONS")}
            >
              <CheckCircle2 size={16} />
              DOs &amp; DON'Ts
            </button>
            <button
              className={`safety-tab-btn ${activeTab === "EMERGENCY_KIT" ? "active" : ""}`}
              onClick={() => setActiveTab("EMERGENCY_KIT")}
            >
              <Package size={16} />
              Emergency Kit
            </button>
            <button
              className={`safety-tab-btn ${activeTab === "CHECKLIST" ? "active" : ""}`}
              onClick={() => setActiveTab("CHECKLIST")}
            >
              <ListChecks size={16} />
              Readiness Checklist
              <span className="safety-tab-badge">
                {checklistMetrics.completed}/{checklistMetrics.total}
              </span>
            </button>
            <button
              className={`safety-tab-btn ${activeTab === "HELPLINES" ? "active" : ""}`}
              onClick={() => setActiveTab("HELPLINES")}
            >
              <PhoneCall size={16} />
              Helplines
            </button>
          </div>

          {/* TAB 1: BEFORE / PREPAREDNESS */}
          {activeTab === "BEFORE" && (
            <div>
              <div className="phase-summary-box">
                <strong>{guidance.before.title}:</strong> {guidance.before.summary}
              </div>
              <div className="row">
                <div className="col-lg-8">
                  {guidance.before.steps.map((step, idx) => (
                    <div key={idx} className="guidance-step-card">
                      <div className="step-number-bubble">{idx + 1}</div>
                      <div className="step-content">
                        <h4>{step.title}</h4>
                        <p>{step.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="col-lg-4">
                  <div
                    style={{
                      background: "#0f172a",
                      border: "1px solid #1e293b",
                      borderRadius: "10px",
                      padding: "18px 20px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px", color: "#38bdf8", fontWeight: "600", fontSize: "14.5px" }}>
                      <Package size={18} />
                      Recommended Gear
                    </div>
                    <ul className="kit-items-list">
                      {guidance.before.emergencyKit.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DURING / IMMEDIATE ACTION */}
          {activeTab === "DURING" && (
            <div>
              <div
                className="phase-summary-box"
                style={{ borderLeftColor: "#ef4444" }}
              >
                <strong style={{ color: "#f87171" }}>{guidance.during.title}:</strong> {guidance.during.summary}
              </div>
              <div className="row">
                <div className="col-lg-8">
                  {guidance.during.steps.map((step, idx) => (
                    <div key={idx} className="guidance-step-card">
                      <div
                        className="step-number-bubble"
                        style={{
                          background: "rgba(239, 68, 68, 0.15)",
                          color: "#f87171",
                          borderColor: "rgba(239, 68, 68, 0.3)",
                        }}
                      >
                        {idx + 1}
                      </div>
                      <div className="step-content">
                        <h4>{step.title}</h4>
                        <p>{step.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="col-lg-4">
                  <div
                    style={{
                      background: "rgba(239, 68, 68, 0.05)",
                      border: "1px solid rgba(239, 68, 68, 0.25)",
                      borderRadius: "10px",
                      padding: "18px 20px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px", color: "#f87171", fontWeight: "600", fontSize: "14.5px" }}>
                      <XCircle size={18} />
                      Critical Prohibitions
                    </div>
                    <ul className="precautions-list">
                      {guidance.during.doNot.map((item, idx) => (
                        <li key={idx} style={{ color: "#cbd5e1" }}>
                          <XCircle size={14} color="#f87171" className="precaution-bullet-icon" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: AFTER / RECOVERY */}
          {activeTab === "AFTER" && (
            <div>
              <div
                className="phase-summary-box"
                style={{ borderLeftColor: "#10b981" }}
              >
                <strong style={{ color: "#34d399" }}>{guidance.after.title}:</strong> {guidance.after.summary}
              </div>
              <div className="row">
                <div className="col-lg-8">
                  {guidance.after.steps.map((step, idx) => (
                    <div key={idx} className="guidance-step-card">
                      <div
                        className="step-number-bubble"
                        style={{
                          background: "rgba(16, 185, 129, 0.15)",
                          color: "#34d399",
                          borderColor: "rgba(16, 185, 129, 0.3)",
                        }}
                      >
                        {idx + 1}
                      </div>
                      <div className="step-content">
                        <h4>{step.title}</h4>
                        <p>{step.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="col-lg-4">
                  <div
                    style={{
                      background: "#0f172a",
                      border: "1px solid #1e293b",
                      borderRadius: "10px",
                      padding: "18px 20px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px", color: "#34d399", fontWeight: "600", fontSize: "14.5px" }}>
                      <ShieldCheck size={18} />
                      Recovery Precautions
                    </div>
                    <ul className="kit-items-list">
                      {guidance.after.precautions.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PRECAUTIONS (DOs & DON'Ts) */}
          {activeTab === "PRECAUTIONS" && (
            <div className="precautions-grid">
              {/* DO's */}
              <div className="precautions-card dos">
                <div className="precautions-header">
                  <CheckCircle2 size={20} color="#34d399" />
                  RECOMMENDED ACTIONS (DO's)
                </div>
                <ul className="precautions-list">
                  {guidance.precautions.dos.map((item, idx) => (
                    <li key={idx}>
                      <CheckCircle2 size={16} color="#34d399" className="precaution-bullet-icon" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* DON'Ts */}
              <div className="precautions-card donts">
                <div className="precautions-header">
                  <XCircle size={20} color="#f87171" />
                  PROHIBITED ACTIONS (DON'Ts)
                </div>
                <ul className="precautions-list">
                  {guidance.precautions.donts.map((item, idx) => (
                    <li key={idx}>
                      <XCircle size={16} color="#f87171" className="precaution-bullet-icon" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* TAB 5: EMERGENCY KIT */}
          {activeTab === "EMERGENCY_KIT" && (
            <div className="emergency-kit-grid">
              <div className="kit-category-card">
                <div className="kit-category-header">
                  <Package size={18} color="#38bdf8" />
                  Survival Basics
                </div>
                <ul className="kit-items-list">
                  {guidance.emergencyKit.survivalBasics.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className="kit-category-card">
                <div className="kit-category-header">
                  <HeartPulse size={18} color="#f87171" />
                  Medical &amp; Hygiene
                </div>
                <ul className="kit-items-list">
                  {guidance.emergencyKit.medicalHygiene.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className="kit-category-card">
                <div className="kit-category-header">
                  <BatteryCharging size={18} color="#f59e0b" />
                  Power &amp; Communication
                </div>
                <ul className="kit-items-list">
                  {guidance.emergencyKit.powerComm.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className="kit-category-card">
                <div className="kit-category-header">
                  <FileCheck2 size={18} color="#10b981" />
                  Critical Documents &amp; Cash
                </div>
                <ul className="kit-items-list">
                  {guidance.emergencyKit.documentsCash.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* TAB 6: READINESS CHECKLIST */}
          {activeTab === "CHECKLIST" && (
            <div className="checklist-tracker-box">
              <div className="checklist-tracker-header">
                <div>
                  <h3 style={{ fontSize: "17px", fontWeight: "700", color: "#f8fafc", margin: 0 }}>
                    {guidance.disasterType} Action Checklist Tracker
                  </h3>
                  <p style={{ fontSize: "13px", color: "#94a3b8", margin: "4px 0 0 0" }}>
                    Interactive preparedness tasks saved locally in your browser.
                  </p>
                </div>

                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={handleMarkAllDone}
                    style={{
                      background: "rgba(16, 185, 129, 0.15)",
                      color: "#34d399",
                      border: "1px solid rgba(16, 185, 129, 0.3)",
                      borderRadius: "6px",
                      padding: "6px 12px",
                      fontSize: "12.5px",
                      fontWeight: "600",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <CheckCheck size={15} />
                    Mark All Done
                  </button>
                  <button
                    onClick={handleResetChecklist}
                    style={{
                      background: "#1e293b",
                      color: "#94a3b8",
                      border: "1px solid #334155",
                      borderRadius: "6px",
                      padding: "6px 12px",
                      fontSize: "12.5px",
                      fontWeight: "600",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <RotateCcw size={14} />
                    Reset
                  </button>
                </div>
              </div>

              {/* Progress bar */}
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span style={{ fontSize: "12.5px", fontWeight: "600", color: "#cbd5e1" }}>
                  Completion Progress
                </span>
                <span style={{ fontSize: "12.5px", fontWeight: "700", color: checklistMetrics.percent === 100 ? "#10b981" : "#38bdf8" }}>
                  {checklistMetrics.completed} of {checklistMetrics.total} completed ({checklistMetrics.percent}%)
                </span>
              </div>
              <div className="checklist-progress-bar-wrap">
                <div
                  className="checklist-progress-bar-fill"
                  style={{ width: `${checklistMetrics.percent}%` }}
                />
              </div>

              {/* Checklist items */}
              <div className="checklist-items-grid">
                {guidance.before.checklist.map((item) => {
                  const isChecked = !!checkedItems[item.id];
                  return (
                    <div
                      key={item.id}
                      className={`checklist-row-item ${isChecked ? "checked" : ""}`}
                      onClick={() => toggleChecklistItem(item.id)}
                    >
                      <div className="checklist-checkbox">
                        {isChecked && <CheckCircle2 size={16} />}
                      </div>
                      <span className="checklist-text">{item.text}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 7: HELPLINES */}
          {activeTab === "HELPLINES" && (
            <div>
              <div className="phase-summary-box mb-3">
                <strong>Emergency Response Hotlines:</strong> 24/7 dedicated dispatch numbers for immediate search &amp; rescue, medical evacuation, and disaster control.
              </div>
              <div className="helplines-grid">
                {(guidance.helplines || []).map((helpline, idx) => (
                  <div key={idx} className="helpline-card">
                    <div className="helpline-info">
                      <h5>{helpline.name}</h5>
                      <p>{helpline.description}</p>
                    </div>
                    <a
                      href={`tel:${helpline.number.split(" ")[0]}`}
                      className="helpline-dial-btn"
                    >
                      <PhoneCall size={14} />
                      {helpline.number}
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SafetyPreparedness;
