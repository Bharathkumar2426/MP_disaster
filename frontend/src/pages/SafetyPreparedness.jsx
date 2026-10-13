import { useState, useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import "../styles/safety.css";
import { getSafetyTypes, getSafetyGuidance, getSafetyRecommendations } from "../services/safetyService";
import { getTrainingProgramById } from "../services/trainingProgramService";
import { getTrainingCenterById } from "../services/trainingCenterService";
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
  GraduationCap,
  Building2,
  MapPin,
  ExternalLink,
  Sparkles,
  BookOpen,
  X,
  Calendar,
  Users,
  Phone,
  Compass,
  Crosshair,
  Sliders,
  LocateFixed,
  Edit3,
} from "lucide-react";
import { getLocationPreferences, updateLocationPreferences } from "../services/notificationService";

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

  // Recommendations state (Phase 6) with in-memory caching to eliminate redundant loading delays
  const [recommendations, setRecommendations] = useState(null);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [recommendationsError, setRecommendationsError] = useState(null);
  const recommendationsCacheRef = useRef({});

  // 3. Fetch intelligent recommendations when disaster type changes
  useEffect(() => {
    if (!selectedType) return;

    // Check fast cache first for instantaneous tab switching
    const cached = recommendationsCacheRef.current[selectedType];
    if (cached) {
      setRecommendations(cached);
      setLoadingRecommendations(false);
      return;
    }

    let isMounted = true;
    async function loadRecommendations() {
      try {
        setLoadingRecommendations(true);
        setRecommendationsError(null);
        const res = await getSafetyRecommendations({ disaster_type: selectedType });
        if (isMounted && res?.data) {
          recommendationsCacheRef.current[selectedType] = res.data;
          setRecommendations(res.data);
        }
      } catch (err) {
        if (isMounted) {
          console.error(`Error loading recommendations for ${selectedType}:`, err);
          setRecommendationsError("Could not retrieve personalized recommendations.");
        }
      } finally {
        if (isMounted) {
          setLoadingRecommendations(false);
        }
      }
    }

    loadRecommendations();
    return () => {
      isMounted = false;
    };
  }, [selectedType]);

  // Location Customization Modal state (for localized recommendations)
  const [showLocModal, setShowLocModal] = useState(false);
  const [locTab, setLocTab] = useState("GPS"); // "GPS" | "MANUAL"
  const [locManualMode, setLocManualMode] = useState("PLACE"); // "PLACE" | "COORDS"
  const [locManualPlace, setLocManualPlace] = useState("");
  const [locManualLat, setLocManualLat] = useState("");
  const [locManualLon, setLocManualLon] = useState("");
  const [locRadius, setLocRadius] = useState(50);
  const [gpsModalCoords, setGpsModalCoords] = useState(null);
  const [gpsModalLoading, setGpsModalLoading] = useState(false);
  const [gpsModalError, setGpsModalError] = useState(null);
  const [gpsModalSuccess, setGpsModalSuccess] = useState(null);
  const [locModalError, setLocModalError] = useState(null);
  const [isLocSaving, setIsLocSaving] = useState(false);

  // Open Location Modal and prefill from existing preferences
  const handleOpenLocModal = async () => {
    setLocModalError(null);
    setGpsModalError(null);
    setGpsModalSuccess(null);
    setShowLocModal(true);

    try {
      const pref = await getLocationPreferences();
      if (pref) {
        setLocRadius(pref.radiusKm || 50);
        const isGps = Boolean(pref.locationName && pref.locationName.toLowerCase().includes("gps"));
        if (isGps) {
          setLocTab("GPS");
          if (pref.latitude != null && pref.longitude != null) {
            setGpsModalCoords({ latitude: pref.latitude, longitude: pref.longitude });
            setGpsModalSuccess(`Saved GPS Coordinates: ${pref.latitude.toFixed(4)}°, ${pref.longitude.toFixed(4)}°`);
          }
        } else {
          setLocTab("MANUAL");
          setLocManualPlace(pref.locationName || "");
          if (pref.latitude != null) setLocManualLat(String(pref.latitude));
          if (pref.longitude != null) setLocManualLon(String(pref.longitude));
        }
      }
    } catch (e) {
      console.warn("Could not prefill location preferences:", e);
    }
  };

  const handleCloseLocModal = () => {
    setShowLocModal(false);
    setLocModalError(null);
    setGpsModalLoading(false);
  };

  // Fast, resilient browser GPS retrieval
  const handleDetectGPSInModal = () => {
    if (!navigator.geolocation) {
      setGpsModalError("Browser geolocation is not supported on this device. Please use manual location entry.");
      setGpsModalSuccess(null);
      return;
    }

    setGpsModalLoading(true);
    setGpsModalError(null);
    setGpsModalSuccess(null);

    const onGeoSuccess = (pos) => {
      setGpsModalLoading(false);
      const lat = parseFloat(pos.coords.latitude.toFixed(4));
      const lon = parseFloat(pos.coords.longitude.toFixed(4));

      if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
        setGpsModalCoords(null);
        setGpsModalError("Retrieved coordinates are outside valid geographical bounds (-90 to 90 lat, -180 to 180 lon).");
        return;
      }

      const accuracy = pos.coords.accuracy ? ` (accuracy ~${Math.round(pos.coords.accuracy)}m)` : "";
      setGpsModalCoords({ latitude: lat, longitude: lon });
      setGpsModalSuccess(`GPS coordinates verified: ${lat}°, ${lon}°${accuracy}`);
    };

    // Attempt 1: Fast Wi-Fi/IP location (returns within 300ms on desktop browsers without hardware GPS delay)
    navigator.geolocation.getCurrentPosition(
      onGeoSuccess,
      (err) => {
        if (err.code === 3) {
          // If network timed out, retry with high accuracy for a short 4s window
          navigator.geolocation.getCurrentPosition(
            onGeoSuccess,
            (err2) => {
              setGpsModalLoading(false);
              setGpsModalCoords(null);
              setGpsModalError("GPS fix timed out. You can enter your city or coordinates directly in the Manual Location tab.");
            },
            { timeout: 4000, enableHighAccuracy: true }
          );
          return;
        }

        setGpsModalLoading(false);
        setGpsModalCoords(null);
        let msg = "GPS location access denied or unavailable.";
        if (err.code === 1) {
          msg = "Location permission denied. Please allow location access or use the Manual Location tab.";
        } else if (err.code === 2) {
          msg = "Device location unavailable. Please enter your location manually.";
        }
        setGpsModalError(msg);
      },
      { timeout: 5000, enableHighAccuracy: false, maximumAge: 300000 }
    );
  };

  // Save location preferences and refresh recommendations
  const handleSaveLocPreferences = async (e) => {
    if (e) e.preventDefault();
    setLocModalError(null);

    const rad = Number(locRadius);
    if (isNaN(rad) || rad < 25 || rad > 200) {
      setLocModalError("Alert radius must be between 25 km and 200 km.");
      return;
    }

    let payload = { radiusKm: rad };

    if (locTab === "GPS") {
      if (!gpsModalCoords || gpsModalCoords.latitude == null || gpsModalCoords.longitude == null) {
        setLocModalError("Please click 'Detect Current GPS' to obtain fresh coordinates before saving.");
        return;
      }
      payload.latitude = gpsModalCoords.latitude;
      payload.longitude = gpsModalCoords.longitude;
      payload.locationName = "Current GPS Location";
    } else {
      if (locManualMode === "PLACE") {
        const place = locManualPlace.trim();
        if (!place) {
          setLocModalError("Please enter a city, town, or district name.");
          return;
        }
        payload.locationName = place;
      } else {
        const lat = parseFloat(locManualLat);
        const lon = parseFloat(locManualLon);

        if (isNaN(lat) || isNaN(lon)) {
          setLocModalError("Please enter valid numerical latitude and longitude.");
          return;
        }
        if (lat < -90 || lat > 90) {
          setLocModalError("Latitude must be between -90.0 and +90.0.");
          return;
        }
        if (lon < -180 || lon > 180) {
          setLocModalError("Longitude must be between -180.0 and +180.0.");
          return;
        }

        payload.latitude = lat;
        payload.longitude = lon;
        payload.locationName = `Manual (${lat.toFixed(4)}°, ${lon.toFixed(4)}°)`;
      }
    }

    try {
      setIsLocSaving(true);
      await updateLocationPreferences(payload);
      // Invalidate recommendation cache so fresh location is reflected
      recommendationsCacheRef.current = {};
      setShowLocModal(false);
    } catch (err) {
      console.error("Failed to update location preferences:", err);
      setLocModalError(err.response?.data?.detail || "Failed to save location preferences. Please check inputs.");
      setIsLocSaving(false);
      return;
    } finally {
      setIsLocSaving(false);
    }

    // Refresh recommendations with fresh localized data
    try {
      setLoadingRecommendations(true);
      const res = await getSafetyRecommendations({ disaster_type: selectedType });
      if (res?.data) {
        recommendationsCacheRef.current[selectedType] = res.data;
        setRecommendations(res.data);
      }
    } catch (recErr) {
      console.warn("Could not reload recommendations after location update:", recErr);
    } finally {
      setLoadingRecommendations(false);
    }
  };

  // Program Details Modal state (Phase 6 Fix)
  const [selectedProgramModal, setSelectedProgramModal] = useState(null);
  const [loadingProgramDetails, setLoadingProgramDetails] = useState(false);

  // Center Info Modal state (Phase 6 Fix)
  const [selectedCenterModal, setSelectedCenterModal] = useState(null);
  const [loadingCenterDetails, setLoadingCenterDetails] = useState(false);

  // Open Program Details Modal with verified details
  const handleOpenProgramDetails = async (program) => {
    setSelectedProgramModal(program);
    setLoadingProgramDetails(true);
    try {
      const res = await getTrainingProgramById(program.id);
      if (res.data) {
        setSelectedProgramModal((prev) => ({
          ...prev,
          ...res.data,
          matchScore: program.matchScore ?? program.match_score,
          recommendationReason: program.recommendationReason ?? (program.match_reasons?.join(". ")),
          targetSkills: program.targetSkills ?? program.relevant_skills ?? [],
          distanceKm: program.distanceKm ?? program.distance_km,
        }));
      }
    } catch (e) {
      console.warn("Could not fetch extended program record, using recommendation metadata:", e);
    } finally {
      setLoadingProgramDetails(false);
    }
  };

  // Open Center Info Modal with verified details
  const handleOpenCenterDetails = async (center) => {
    setSelectedCenterModal(center);
    setLoadingCenterDetails(true);
    try {
      const res = await getTrainingCenterById(center.id);
      if (res.data) {
        setSelectedCenterModal((prev) => ({
          ...prev,
          ...res.data,
          distanceKm: center.distanceKm ?? center.distance_km,
          activeProgramsCount: center.activeProgramsCount ?? center.active_programs_count,
          recommendationReason: center.recommendationReason,
        }));
      }
    } catch (e) {
      console.warn("Could not fetch extended center record, using recommendation metadata:", e);
    } finally {
      setLoadingCenterDetails(false);
    }
  };

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
            <button
              className={`safety-tab-btn ${activeTab === "RECOMMENDATIONS" ? "active" : ""}`}
              onClick={() => setActiveTab("RECOMMENDATIONS")}
              style={activeTab === "RECOMMENDATIONS" ? { color: "#38bdf8", borderColor: "rgba(56, 189, 248, 0.4)", background: "rgba(56, 189, 248, 0.15)" } : {}}
            >
              <GraduationCap size={16} />
              Intelligent Recommendations
              {((recommendations?.recommendedPrograms?.length || recommendations?.training_programs?.length) > 0) && (
                <span className="safety-tab-badge">
                  {recommendations?.recommendedPrograms?.length || recommendations?.training_programs?.length}
                </span>
              )}
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

          {/* TAB 8: INTELLIGENT RECOMMENDATIONS (PHASE 6) */}
          {activeTab === "RECOMMENDATIONS" && (() => {
            const riskCtx = recommendations?.riskContext || recommendations?.risk_context;
            const progs = recommendations?.recommendedPrograms || recommendations?.training_programs || [];
            const centers = recommendations?.recommendedCenters || recommendations?.training_centers || [];
            const userLoc = recommendations?.userLocation || recommendations?.user_location_applied?.label;
            const userCoords = recommendations?.userCoordinates || (recommendations?.user_location_applied?.latitude ? { latitude: recommendations.user_location_applied.latitude, longitude: recommendations.user_location_applied.longitude } : null);

            return (
              <div className="recommendations-wrapper">
                {/* Supporting Phase 5 Risk Context Banner */}
                {riskCtx && (
                  <div
                    className={`recommendations-risk-banner ${
                      riskCtx.riskCategory === "CRITICAL"
                        ? "risk-critical"
                        : riskCtx.riskCategory === "HIGH"
                        ? "risk-high"
                        : riskCtx.riskCategory === "MEDIUM"
                        ? "risk-medium"
                        : "risk-low"
                    }`}
                  >
                    <div className="recommendations-risk-header">
                      <div className="d-flex align-items-center gap-2 flex-wrap">
                        <span className="provisional-badge">
                          <AlertTriangle size={13} />
                          {riskCtx.assessmentMethod || "Phase 5 Provisional Assessment"}
                        </span>
                        <span
                          className="safety-badge"
                          style={getSeverityBadgeStyle(riskCtx.riskCategory)}
                        >
                          Risk Category: {riskCtx.riskCategory}
                        </span>
                        {riskCtx.riskScore !== undefined && riskCtx.riskScore !== null && (
                          <span style={{ fontSize: "12px", color: "#94a3b8", fontWeight: 600 }}>
                            Score: {riskCtx.riskScore}/100
                          </span>
                        )}
                      </div>

                      {userCoords ? (
                        <button
                          type="button"
                          onClick={handleOpenLocModal}
                          title="Click to edit alert and recommendation location (Default: dashboard location)"
                          style={{
                            background: "rgba(56, 189, 248, 0.12)",
                            border: "1px solid rgba(56, 189, 248, 0.35)",
                            borderRadius: "20px",
                            padding: "4px 12px",
                            fontSize: "12px",
                            fontWeight: 600,
                            color: "#38bdf8",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            transition: "all 0.2s ease",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "rgba(56, 189, 248, 0.22)";
                            e.currentTarget.style.borderColor = "#38bdf8";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "rgba(56, 189, 248, 0.12)";
                            e.currentTarget.style.borderColor = "rgba(56, 189, 248, 0.35)";
                          }}
                        >
                          <MapPin size={13} />
                          <span>
                            {userLoc ? `Localized for: ${userLoc}` : `Coordinates: ${userCoords.latitude.toFixed(2)}°, ${userCoords.longitude.toFixed(2)}°`}
                          </span>
                          <span
                            style={{
                              fontSize: "10px",
                              background: "rgba(56, 189, 248, 0.25)",
                              color: "#e0f2fe",
                              padding: "1px 6px",
                              borderRadius: "10px",
                              marginLeft: "3px",
                            }}
                          >
                            Edit
                          </span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleOpenLocModal}
                          title="Click to set your alert & recommendation location"
                          style={{
                            background: "rgba(148, 163, 184, 0.12)",
                            border: "1px solid rgba(148, 163, 184, 0.3)",
                            borderRadius: "20px",
                            padding: "4px 12px",
                            fontSize: "12px",
                            fontWeight: 600,
                            color: "#94a3b8",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            transition: "all 0.2s ease",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "rgba(148, 163, 184, 0.22)";
                            e.currentTarget.style.borderColor = "#cbd5e1";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "rgba(148, 163, 184, 0.12)";
                            e.currentTarget.style.borderColor = "rgba(148, 163, 184, 0.3)";
                          }}
                        >
                          <Compass size={13} />
                          <span>No saved alert location; showing regional overview</span>
                          <span
                            style={{
                              fontSize: "10px",
                              background: "rgba(148, 163, 184, 0.25)",
                              color: "#f1f5f9",
                              padding: "1px 6px",
                              borderRadius: "10px",
                              marginLeft: "3px",
                            }}
                          >
                            Set
                          </span>
                        </button>
                      )}
                    </div>

                    {riskCtx.contributingFactors?.length > 0 && (
                      <div style={{ fontSize: "13px", color: "#e2e8f0", margin: "6px 0 4px 0" }}>
                        <strong>Atmospheric &amp; Environmental Factors:</strong> {riskCtx.contributingFactors.join(" • ")}
                      </div>
                    )}

                    <p className="risk-disclaimer-note">
                      <strong>Important Note:</strong> {riskCtx.disclaimer || riskCtx.heuristic_disclaimer}
                    </p>
                  </div>
                )}

                {/* Loading Recommendations */}
                {loadingRecommendations && (
                  <div className="safety-loading-state" style={{ padding: "30px 20px" }}>
                    <Loader2 size={28} className="spin-animation" color="#38bdf8" />
                    <p>Matching hazard-specific training programs and training centers...</p>
                  </div>
                )}

                {recommendationsError && (
                  <div className="safety-error-state" style={{ margin: "10px 0", padding: "16px" }}>
                    <p className="m-0">{recommendationsError}</p>
                  </div>
                )}

                {/* Section 1: Recommended Training Programs */}
                <div>
                  <div className="recommendations-section-title">
                    <div>
                      <h3>
                        <GraduationCap size={20} color="#38bdf8" />
                        Recommended Training Programs
                      </h3>
                      <div className="recommendations-section-subtitle">
                        Intelligently matched and ranked from verified institutional programs based on hazard taxonomy and operational competencies.
                      </div>
                    </div>
                    <Link to="/training-programs" className="recommendation-action-btn">
                      View Full Catalog <ExternalLink size={14} />
                    </Link>
                  </div>

                  {progs.length > 0 ? (
                    <div className="programs-grid">
                      {progs.map((program) => {
                        const score = program.matchScore !== undefined ? program.matchScore : program.match_score || 0;
                        const matchClass =
                          score >= 80
                            ? "match-high"
                            : score >= 50
                            ? "match-med"
                            : "match-low";
                        const title = program.programName || program.title;
                        const trainer = program.trainerName || program.instructor || "NDRF Certified Instructor";
                        const reason = program.recommendationReason || (program.match_reasons?.join(". ")) || "General preparedness skills.";
                        const skills = program.targetSkills || program.relevant_skills || [];

                        return (
                          <div key={program.id} className="program-recommend-card">
                            <div>
                              <div className="program-card-header mb-2">
                                <div>
                                  <h4 style={{ fontSize: "15px", fontWeight: "700", color: "#f8fafc", margin: "0 0 4px 0" }}>
                                    {title}
                                  </h4>
                                  <div style={{ fontSize: "12px", color: "#94a3b8" }}>
                                    Instructor: <span style={{ color: "#cbd5e1" }}>{trainer}</span>
                                  </div>
                                </div>
                                <span className={`match-score-pill ${matchClass}`}>
                                  <Sparkles size={12} />
                                  {score}% Match
                                </span>
                              </div>

                              <p style={{ fontSize: "13px", color: "#94a3b8", lineHeight: 1.5, margin: "0 0 12px 0" }}>
                                {program.description}
                              </p>

                              {/* Skills Tags */}
                              {skills.length > 0 && (
                                <div className="d-flex flex-wrap gap-1 mb-3">
                                  {skills.map((skill, sIdx) => (
                                    <span
                                      key={sIdx}
                                      style={{
                                        fontSize: "11px",
                                        padding: "2px 7px",
                                        borderRadius: "4px",
                                        background: "rgba(56, 189, 248, 0.12)",
                                        color: "#38bdf8",
                                      }}
                                    >
                                      {skill}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {/* Explainable Rationale */}
                              <div className="program-rationale-box">
                                <strong>Why Recommended:</strong> {reason}
                              </div>
                            </div>

                            <div className="d-flex justify-content-between align-items-center pt-2" style={{ borderTop: "1px solid #1e293b", marginTop: "8px" }}>
                              <span style={{ fontSize: "12px", color: "#64748b" }}>
                                {program.durationDays ? `Duration: ${program.durationDays} day(s)` : (program.schedule || "Verified Syllabus")}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleOpenProgramDetails(program)}
                                className="recommendation-action-btn"
                                style={{ padding: "5px 12px", fontSize: "12px", cursor: "pointer" }}
                              >
                                Program Details
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : !loadingRecommendations ? (
                    <div
                      style={{
                        background: "#0f172a",
                        border: "1px solid #1e293b",
                        borderRadius: "10px",
                        padding: "24px",
                        textAlign: "center",
                        color: "#94a3b8",
                        fontSize: "13.5px",
                      }}
                    >
                      <BookOpen size={28} className="mb-2" style={{ color: "#64748b" }} />
                      <p className="m-0">
                        No specialized training programs currently cataloged for <strong>{selectedType}</strong>. We do not invent fictional courses.
                      </p>
                    </div>
                  ) : null}
                </div>

                {/* Section 2: Relevant Training Centers */}
                <div>
                  <div className="recommendations-section-title">
                    <div>
                      <h3>
                        <Building2 size={20} color="#34d399" />
                        Relevant Training Centers
                      </h3>
                      <div className="recommendations-section-subtitle">
                        Operational disaster-response institutions ranked by geographical proximity using verified spatial coordinates.
                      </div>
                    </div>
                    <Link to="/training-centers" className="recommendation-action-btn">
                      View All Centers <ExternalLink size={14} />
                    </Link>
                  </div>

                  {centers.length > 0 ? (
                    <div className="centers-grid">
                      {centers.map((center, cIdx) => {
                        const dist = center.distanceKm !== undefined ? center.distanceKm : center.distance_km;
                        const hasCoords = (center.latitude !== null && center.latitude !== undefined && center.longitude !== null && center.longitude !== undefined);
                        const isClosest = cIdx === 0 && dist !== null && dist !== undefined;
                        const cName = center.centerName || center.name;
                        const cLoc = center.district || center.location;
                        const reason = center.recommendationReason;

                        return (
                          <div key={center.id} className="center-recommend-card">
                            <div>
                              <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                                <div>
                                  <h4 style={{ fontSize: "15px", fontWeight: "700", color: "#f8fafc", margin: "0 0 3px 0" }}>
                                    {cName}
                                  </h4>
                                  <div style={{ fontSize: "12.5px", color: "#94a3b8", display: "flex", alignItems: "center", gap: "4px" }}>
                                    <MapPin size={13} color="#38bdf8" />
                                    {cLoc || "Registered Facility"}
                                  </div>
                                </div>

                                {dist !== null && dist !== undefined ? (
                                  <span className="distance-badge">
                                    {isClosest && <Sparkles size={11} />}
                                    {dist} km
                                  </span>
                                ) : (
                                  <span className="no-coords-badge">
                                    Coordinates unlisted
                                  </span>
                                )}
                              </div>

                              <div style={{ fontSize: "12px", color: "#64748b", margin: "8px 0" }}>
                                {center.contactNumber && <div>Phone: {center.contactNumber}</div>}
                                {center.capacity && <div>Facility Capacity: {center.capacity} trainees</div>}
                                <div>Active Programs: {center.activeProgramsCount ?? center.active_programs_count ?? 0}</div>
                              </div>

                              {reason && (
                                <div style={{ fontSize: "12px", color: "#94a3b8", fontStyle: "italic", marginTop: "4px" }}>
                                  {reason}
                                </div>
                              )}
                            </div>

                            <div className="d-flex justify-content-between align-items-center pt-2" style={{ borderTop: "1px solid #1e293b" }}>
                              <span style={{ fontSize: "11.5px", color: "#94a3b8" }}>
                                {hasCoords ? "GPS Verified Location" : "Address Record Only"}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleOpenCenterDetails(center)}
                                className="recommendation-action-btn"
                                style={{ padding: "5px 12px", fontSize: "12px", cursor: "pointer" }}
                              >
                                Center Info
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : !loadingRecommendations ? (
                    <div
                      style={{
                        background: "#0f172a",
                        border: "1px solid #1e293b",
                        borderRadius: "10px",
                        padding: "24px",
                        textAlign: "center",
                        color: "#94a3b8",
                        fontSize: "13.5px",
                      }}
                    >
                      <Building2 size={28} className="mb-2" style={{ color: "#64748b" }} />
                      <p className="m-0">No operational training centers currently cataloged.</p>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })()}

          {/* Program Details Modal */}
          {selectedProgramModal && (
            <div
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(10, 15, 30, 0.8)",
                backdropFilter: "blur(6px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 10000,
                padding: "16px",
              }}
              onClick={() => setSelectedProgramModal(null)}
            >
              <div
                style={{
                  background: "#0f172a",
                  border: "1px solid #334155",
                  borderRadius: "14px",
                  maxWidth: "600px",
                  width: "100%",
                  boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.75)",
                  overflow: "hidden",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div
                  style={{
                    padding: "16px 20px",
                    background: "#1e293b",
                    borderBottom: "1px solid #334155",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <GraduationCap size={20} color="#38bdf8" />
                    <div>
                      <h4 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "#f8fafc" }}>
                        {selectedProgramModal.programName || selectedProgramModal.title}
                      </h4>
                      <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                        Program ID: #{selectedProgramModal.id} • Status: {selectedProgramModal.status || "Active"}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedProgramModal(null)}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#94a3b8",
                      cursor: "pointer",
                      padding: "4px",
                      borderRadius: "4px",
                    }}
                  >
                    <X size={18} />
                  </button>
                </div>

                <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "14px", maxHeight: "75vh", overflowY: "auto" }}>
                  <div
                    style={{
                      background: "rgba(56, 189, 248, 0.08)",
                      border: "1px solid rgba(56, 189, 248, 0.25)",
                      borderRadius: "8px",
                      padding: "12px 14px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "11px", fontWeight: "700", color: "#38bdf8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Intelligent Recommendation Match
                      </span>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: "700",
                          background: "rgba(16, 185, 129, 0.2)",
                          color: "#34d399",
                          padding: "2px 8px",
                          borderRadius: "100px",
                        }}
                      >
                        <Sparkles size={11} style={{ display: "inline", marginRight: "3px" }} />
                        {selectedProgramModal.matchScore}% Match
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: "12.5px", color: "#e2e8f0", lineHeight: 1.45 }}>
                      <strong>Why Recommended:</strong> {selectedProgramModal.recommendationReason || "Matches active hazard preparedness protocol."}
                    </p>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "12px",
                      background: "#090d1a",
                      border: "1px solid #1e293b",
                      borderRadius: "10px",
                      padding: "14px",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "10.5px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>👨 Instructor / Trainer</div>
                      <div style={{ fontSize: "13px", fontWeight: "600", color: "#f1f5f9", marginTop: "2px" }}>
                        {selectedProgramModal.trainerName || selectedProgramModal.instructor || "NDRF Certified Trainer"}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: "10.5px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>⏱ Course Duration</div>
                      <div style={{ fontSize: "13px", fontWeight: "600", color: "#f1f5f9", marginTop: "2px" }}>
                        {selectedProgramModal.durationDays ? `${selectedProgramModal.durationDays} Days` : "Standard Course"}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: "10.5px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>🏢 Training Center</div>
                      <div style={{ fontSize: "13px", fontWeight: "600", color: "#f1f5f9", marginTop: "2px" }}>
                        {selectedProgramModal.trainingCenterName || "Regional Relief Hub"}
                        {selectedProgramModal.trainingCenterDistrict ? ` (${selectedProgramModal.trainingCenterDistrict})` : ""}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: "10.5px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>📍 Facility Proximity</div>
                      <div style={{ fontSize: "13px", fontWeight: "600", color: "#38bdf8", marginTop: "2px" }}>
                        {selectedProgramModal.distanceKm != null ? `${selectedProgramModal.distanceKm} km from alert zone` : "Distance uncalculated"}
                      </div>
                    </div>

                    {selectedProgramModal.maxParticipants && (
                      <div>
                        <div style={{ fontSize: "10.5px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>👥 Cohort Capacity</div>
                        <div style={{ fontSize: "13px", fontWeight: "600", color: "#f1f5f9", marginTop: "2px" }}>
                          {selectedProgramModal.maxParticipants} Participants
                        </div>
                      </div>
                    )}

                    {selectedProgramModal.startDate && (
                      <div>
                        <div style={{ fontSize: "10.5px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>📅 Schedule Dates</div>
                        <div style={{ fontSize: "13px", fontWeight: "600", color: "#f1f5f9", marginTop: "2px" }}>
                          {selectedProgramModal.startDate} {selectedProgramModal.endDate ? `to ${selectedProgramModal.endDate}` : ""}
                        </div>
                      </div>
                    )}
                  </div>

                  {selectedProgramModal.targetSkills?.length > 0 && (
                    <div>
                      <div style={{ fontSize: "11px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", marginBottom: "6px" }}>
                        Target Preparedness Competencies:
                      </div>
                      <div style={{ display: "flex", flexWrap: "gap 6px", gap: "6px" }}>
                        {selectedProgramModal.targetSkills.map((skill, idx) => (
                          <span
                            key={idx}
                            style={{
                              fontSize: "11.5px",
                              padding: "3px 8px",
                              borderRadius: "4px",
                              background: "rgba(56, 189, 248, 0.12)",
                              color: "#38bdf8",
                              border: "1px solid rgba(56, 189, 248, 0.25)",
                            }}
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <div style={{ fontSize: "11px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", marginBottom: "4px" }}>
                      Description &amp; Syllabus Overview:
                    </div>
                    <p style={{ margin: 0, fontSize: "13px", color: "#cbd5e1", lineHeight: 1.55 }}>
                      {selectedProgramModal.description}
                    </p>
                  </div>
                </div>

                <div
                  style={{
                    padding: "14px 20px",
                    background: "#1e293b",
                    borderTop: "1px solid #334155",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Link
                    to="/training-programs"
                    style={{
                      fontSize: "12px",
                      color: "#60a5fa",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      textDecoration: "none",
                    }}
                  >
                    View in Full Catalog <ExternalLink size={13} />
                  </Link>

                  <button
                    onClick={() => setSelectedProgramModal(null)}
                    style={{
                      background: "#334155",
                      border: "none",
                      color: "#ffffff",
                      padding: "7px 18px",
                      borderRadius: "6px",
                      fontSize: "12.5px",
                      fontWeight: "600",
                      cursor: "pointer",
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Center Info Modal */}
          {selectedCenterModal && (
            <div
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(10, 15, 30, 0.8)",
                backdropFilter: "blur(6px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 10000,
                padding: "16px",
              }}
              onClick={() => setSelectedCenterModal(null)}
            >
              <div
                style={{
                  background: "#0f172a",
                  border: "1px solid #334155",
                  borderRadius: "14px",
                  maxWidth: "600px",
                  width: "100%",
                  boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.75)",
                  overflow: "hidden",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div
                  style={{
                    padding: "16px 20px",
                    background: "#1e293b",
                    borderBottom: "1px solid #334155",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <Building2 size={20} color="#34d399" />
                    <div>
                      <h4 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "#f8fafc" }}>
                        {selectedCenterModal.centerName || selectedCenterModal.name}
                      </h4>
                      <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                        Center ID: #{selectedCenterModal.id} • Status: {selectedCenterModal.status || "Operational"}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedCenterModal(null)}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#94a3b8",
                      cursor: "pointer",
                      padding: "4px",
                      borderRadius: "4px",
                    }}
                  >
                    <X size={18} />
                  </button>
                </div>

                <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "14px", maxHeight: "75vh", overflowY: "auto" }}>
                  <div
                    style={{
                      background: selectedCenterModal.distanceKm != null ? "rgba(16, 185, 129, 0.08)" : "rgba(100, 116, 139, 0.1)",
                      border: `1px solid ${selectedCenterModal.distanceKm != null ? "rgba(16, 185, 129, 0.25)" : "rgba(100, 116, 139, 0.25)"}`,
                      borderRadius: "8px",
                      padding: "12px 14px",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <MapPin size={18} color={selectedCenterModal.distanceKm != null ? "#34d399" : "#94a3b8"} />
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: "700", color: selectedCenterModal.distanceKm != null ? "#34d399" : "#cbd5e1" }}>
                        {selectedCenterModal.distanceKm != null
                          ? `Distance: ${selectedCenterModal.distanceKm} km from your saved alert zone`
                          : "Distance uncalculated (valid coordinates required for proximity calculation)"}
                      </div>
                      <div style={{ fontSize: "11.5px", color: "#94a3b8", marginTop: "2px" }}>
                        {selectedCenterModal.recommendationReason || "Operational disaster-response and rescue facility."}
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "12px",
                      background: "#090d1a",
                      border: "1px solid #1e293b",
                      borderRadius: "10px",
                      padding: "14px",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "10.5px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>🏛️ District / Region</div>
                      <div style={{ fontSize: "13px", fontWeight: "600", color: "#f1f5f9", marginTop: "2px" }}>
                        {selectedCenterModal.district || "Operational Sector"}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: "10.5px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>📍 Physical Address</div>
                      <div style={{ fontSize: "13px", fontWeight: "600", color: "#f1f5f9", marginTop: "2px" }}>
                        {selectedCenterModal.address || "State Civil Defense Record"}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: "10.5px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>👤 Center Coordinator</div>
                      <div style={{ fontSize: "13px", fontWeight: "600", color: "#f1f5f9", marginTop: "2px" }}>
                        {selectedCenterModal.coordinatorName || "Regional Director"}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: "10.5px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>📞 Contact Number</div>
                      <div style={{ fontSize: "13px", fontWeight: "600", color: "#38bdf8", marginTop: "2px" }}>
                        {selectedCenterModal.contactNumber || "Dispatch Center"}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: "10.5px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>👥 Trainee Capacity</div>
                      <div style={{ fontSize: "13px", fontWeight: "600", color: "#f1f5f9", marginTop: "2px" }}>
                        {selectedCenterModal.capacity ? `${selectedCenterModal.capacity} trainees` : "Operational capacity"}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: "10.5px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>🌐 Spatial Coordinates</div>
                      <div style={{ fontSize: "13px", fontWeight: "600", color: "#f1f5f9", marginTop: "2px" }}>
                        {selectedCenterModal.latitude != null && selectedCenterModal.longitude != null
                          ? `${selectedCenterModal.latitude.toFixed(4)}°, ${selectedCenterModal.longitude.toFixed(4)}°`
                          : "Coordinates unlisted"}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: "10.5px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>📚 Active Programs</div>
                      <div style={{ fontSize: "13px", fontWeight: "600", color: "#f1f5f9", marginTop: "2px" }}>
                        {selectedCenterModal.activeProgramsCount ?? 0} Active Module(s)
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: "10.5px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>🏷️ Facility Status</div>
                      <div style={{ fontSize: "13px", fontWeight: "600", color: "#34d399", marginTop: "2px" }}>
                        {selectedCenterModal.status || "Active"}
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    padding: "14px 20px",
                    background: "#1e293b",
                    borderTop: "1px solid #334155",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Link
                    to="/training-centers"
                    style={{
                      fontSize: "12px",
                      color: "#60a5fa",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      textDecoration: "none",
                    }}
                  >
                    View in All Centers <ExternalLink size={13} />
                  </Link>

                  <button
                    onClick={() => setSelectedCenterModal(null)}
                    style={{
                      background: "#334155",
                      border: "none",
                      color: "#ffffff",
                      padding: "7px 18px",
                      borderRadius: "6px",
                      fontSize: "12.5px",
                      fontWeight: "600",
                      cursor: "pointer",
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Location Customization Modal for Recommendations */}
          {showLocModal && (
            <div
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(10, 15, 30, 0.8)",
                backdropFilter: "blur(6px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 1050,
                padding: "20px",
              }}
              onClick={(e) => {
                if (e.target === e.currentTarget) handleCloseLocModal();
              }}
            >
              <div
                style={{
                  background: "#0f172a",
                  border: "1px solid #1e293b",
                  borderRadius: "14px",
                  maxWidth: "540px",
                  width: "100%",
                  maxHeight: "90vh",
                  overflowY: "auto",
                  boxShadow: "0 20px 45px rgba(0,0,0,0.6)",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {/* Modal Header */}
                <div
                  style={{
                    padding: "16px 20px",
                    background: "#1e293b",
                    borderBottom: "1px solid #334155",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div className="d-flex align-items-center gap-2">
                    <MapPin size={20} color="#38bdf8" />
                    <div>
                      <h4 style={{ margin: 0, fontSize: "16px", color: "#f8fafc", fontWeight: 700 }}>
                        Edit Alert &amp; Recommendation Location
                      </h4>
                      <p style={{ margin: 0, fontSize: "11.5px", color: "#94a3b8" }}>
                        Default: dashboard zone. Change to localize risk alerts &amp; training centers.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleCloseLocModal}
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

                {/* Modal Body */}
                <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
                  {locModalError && (
                    <div
                      style={{
                        background: "rgba(239, 68, 68, 0.15)",
                        border: "1px solid rgba(239, 68, 68, 0.3)",
                        color: "#f87171",
                        borderRadius: "8px",
                        padding: "10px 14px",
                        fontSize: "12.5px",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <AlertTriangle size={16} />
                      <span>{locModalError}</span>
                    </div>
                  )}

                  {/* Mode Tabs */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "8px",
                      background: "#090d1a",
                      padding: "4px",
                      borderRadius: "8px",
                      border: "1px solid #1e293b",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setLocTab("GPS");
                        setLocModalError(null);
                      }}
                      style={{
                        padding: "8px 12px",
                        background: locTab === "GPS" ? "rgba(56, 189, 248, 0.18)" : "transparent",
                        border: locTab === "GPS" ? "1px solid rgba(56, 189, 248, 0.4)" : "1px solid transparent",
                        borderRadius: "6px",
                        color: locTab === "GPS" ? "#38bdf8" : "#94a3b8",
                        fontWeight: 600,
                        fontSize: "12.5px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                      }}
                    >
                      <Crosshair size={14} />
                      Use Browser GPS
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setLocTab("MANUAL");
                        setLocModalError(null);
                      }}
                      style={{
                        padding: "8px 12px",
                        background: locTab === "MANUAL" ? "rgba(56, 189, 248, 0.18)" : "transparent",
                        border: locTab === "MANUAL" ? "1px solid rgba(56, 189, 248, 0.4)" : "1px solid transparent",
                        borderRadius: "6px",
                        color: locTab === "MANUAL" ? "#38bdf8" : "#94a3b8",
                        fontWeight: 600,
                        fontSize: "12.5px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                      }}
                    >
                      <MapPin size={14} />
                      Manual Location
                    </button>
                  </div>

                  {/* Tab 1: Browser GPS */}
                  {locTab === "GPS" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      <div
                        style={{
                          background: "#090d1a",
                          border: "1px solid #1e293b",
                          borderRadius: "8px",
                          padding: "14px",
                          fontSize: "12.5px",
                          color: "#cbd5e1",
                          lineHeight: 1.5,
                        }}
                      >
                        Click below to fetch your current GPS coordinates directly from your device. Browser permission is required once.
                      </div>

                      <button
                        type="button"
                        onClick={handleDetectGPSInModal}
                        disabled={gpsModalLoading}
                        style={{
                          background: "rgba(56, 189, 248, 0.15)",
                          border: "1px solid rgba(56, 189, 248, 0.4)",
                          color: "#38bdf8",
                          padding: "10px 16px",
                          borderRadius: "8px",
                          fontSize: "13px",
                          fontWeight: 600,
                          cursor: gpsModalLoading ? "wait" : "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "8px",
                        }}
                      >
                        {gpsModalLoading ? (
                          <>
                            <Loader2 size={16} className="spin-animation" />
                            Detecting Satellite GPS Fix...
                          </>
                        ) : (
                          <>
                            <LocateFixed size={16} />
                            Detect Current GPS Coordinates
                          </>
                        )}
                      </button>

                      {gpsModalSuccess && (
                        <div
                          style={{
                            background: "rgba(16, 185, 129, 0.12)",
                            border: "1px solid rgba(16, 185, 129, 0.3)",
                            color: "#34d399",
                            borderRadius: "8px",
                            padding: "10px 14px",
                            fontSize: "12.5px",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                        >
                          <CheckCircle2 size={16} />
                          <span>{gpsModalSuccess}</span>
                        </div>
                      )}

                      {gpsModalError && (
                        <div
                          style={{
                            background: "rgba(239, 68, 68, 0.12)",
                            border: "1px solid rgba(239, 68, 68, 0.3)",
                            color: "#f87171",
                            borderRadius: "8px",
                            padding: "10px 14px",
                            fontSize: "12.5px",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                        >
                          <AlertTriangle size={16} />
                          <span>{gpsModalError}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tab 2: Manual Location */}
                  {locTab === "MANUAL" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      <div className="d-flex gap-2">
                        <button
                          type="button"
                          onClick={() => setLocManualMode("PLACE")}
                          style={{
                            padding: "5px 12px",
                            background: locManualMode === "PLACE" ? "#334155" : "transparent",
                            border: "1px solid #334155",
                            borderRadius: "6px",
                            color: locManualMode === "PLACE" ? "#ffffff" : "#94a3b8",
                            fontSize: "12px",
                            cursor: "pointer",
                          }}
                        >
                          City / District Name
                        </button>
                        <button
                          type="button"
                          onClick={() => setLocManualMode("COORDS")}
                          style={{
                            padding: "5px 12px",
                            background: locManualMode === "COORDS" ? "#334155" : "transparent",
                            border: "1px solid #334155",
                            borderRadius: "6px",
                            color: locManualMode === "COORDS" ? "#ffffff" : "#94a3b8",
                            fontSize: "12px",
                            cursor: "pointer",
                          }}
                        >
                          Direct Coordinates (Lat, Lon)
                        </button>
                      </div>

                      {locManualMode === "PLACE" ? (
                        <div>
                          <label style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "6px", display: "block" }}>
                            City, Town, or District
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Chennai, Kochi, Mumbai, Delhi"
                            value={locManualPlace}
                            onChange={(e) => setLocManualPlace(e.target.value)}
                            style={{
                              width: "100%",
                              background: "#090d1a",
                              border: "1px solid #334155",
                              color: "#f1f5f9",
                              padding: "10px 12px",
                              borderRadius: "8px",
                              fontSize: "13px",
                              outline: "none",
                            }}
                          />
                        </div>
                      ) : (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                          <div>
                            <label style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "6px", display: "block" }}>
                              Latitude (-90 to 90)
                            </label>
                            <input
                              type="number"
                              step="any"
                              placeholder="e.g. 13.0827"
                              value={locManualLat}
                              onChange={(e) => setLocManualLat(e.target.value)}
                              style={{
                                width: "100%",
                                background: "#090d1a",
                                border: "1px solid #334155",
                                color: "#f1f5f9",
                                padding: "10px 12px",
                                borderRadius: "8px",
                                fontSize: "13px",
                                outline: "none",
                              }}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "6px", display: "block" }}>
                              Longitude (-180 to 180)
                            </label>
                            <input
                              type="number"
                              step="any"
                              placeholder="e.g. 80.2707"
                              value={locManualLon}
                              onChange={(e) => setLocManualLon(e.target.value)}
                              style={{
                                width: "100%",
                                background: "#090d1a",
                                border: "1px solid #334155",
                                color: "#f1f5f9",
                                padding: "10px 12px",
                                borderRadius: "8px",
                                fontSize: "13px",
                                outline: "none",
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Radius Slider */}
                  <div
                    style={{
                      background: "#090d1a",
                      border: "1px solid #1e293b",
                      borderRadius: "8px",
                      padding: "14px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <span style={{ fontSize: "12.5px", color: "#cbd5e1", fontWeight: 600 }}>
                        Alert &amp; Recommendation Radius
                      </span>
                      <span style={{ fontSize: "12.5px", color: "#38bdf8", fontWeight: 700 }}>
                        {locRadius} km
                      </span>
                    </div>
                    <input
                      type="range"
                      min="25"
                      max="200"
                      step="5"
                      value={locRadius}
                      onChange={(e) => setLocRadius(Number(e.target.value))}
                      style={{ width: "100%", accentColor: "#38bdf8", cursor: "pointer" }}
                    />
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#64748b", marginTop: "4px" }}>
                      <span>25 km (Local)</span>
                      <span>100 km (Regional)</span>
                      <span>200 km (Wide)</span>
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div
                  style={{
                    padding: "14px 20px",
                    background: "#1e293b",
                    borderTop: "1px solid #334155",
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: "10px",
                  }}
                >
                  <button
                    type="button"
                    onClick={handleCloseLocModal}
                    disabled={isLocSaving}
                    style={{
                      background: "#334155",
                      border: "none",
                      color: "#cbd5e1",
                      padding: "8px 16px",
                      borderRadius: "6px",
                      fontSize: "12.5px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveLocPreferences}
                    disabled={isLocSaving}
                    style={{
                      background: "#0284c7",
                      border: "none",
                      color: "#ffffff",
                      padding: "8px 20px",
                      borderRadius: "6px",
                      fontSize: "12.5px",
                      fontWeight: 600,
                      cursor: isLocSaving ? "wait" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    {isLocSaving ? (
                      <>
                        <Loader2 size={15} className="spin-animation" />
                        Saving &amp; Updating...
                      </>
                    ) : (
                      "Save Location & Localize"
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SafetyPreparedness;
