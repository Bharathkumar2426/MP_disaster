import { useEffect, useState, useCallback, useRef } from "react";
import "../styles/dashboard.css";
import api from "../services/api";
import DashboardCharts from "../components/DashboardCharts";
import DashboardCard from "../components/DashboardCard";
import DisasterMap from "../components/DisasterMap";
import AlertBanner from "../components/AlertBanner";
import LocationAlertWidget from "../components/LocationAlertWidget";
import RiskAssessmentPanel from "../components/RiskAssessmentPanel";
import { Users, AlertTriangle, Building2, GraduationCap, ChevronRight, Activity, ShieldCheck, RefreshCw, ShieldAlert, X } from "lucide-react";
import { Link } from "react-router-dom";

function formatTimeAgo(date) {
  if (!date) return "";
  const diff = Date.now() - new Date(date).getTime();
  const secs = Math.floor(diff / 1000);
  const mins = Math.floor(diff / 60000);
  if (secs < 30) return "Just now";
  if (mins < 1) return `${secs}s ago`;
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

function Dashboard() {
  const [dashboard, setDashboard] = useState({
    totalUsers: 0,
    totalDisasters: 0,
    totalTrainingCenters: 0,
    totalTrainingPrograms: 0,
  });

  const [allDisasters, setAllDisasters] = useState([]);
  const [allCenters, setAllCenters] = useState([]);
  const [recentPrograms, setRecentPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [error, setError] = useState(null);

  // Phase 4: Location Alert Zone & Incident Focus State
  const [userAlertLocation, setUserAlertLocation] = useState(null);
  const [focusedIncidentId, setFocusedIncidentId] = useState(null);
  // Phase 5: Selected Incident for Explainable Risk Assessment
  const [selectedRiskDisaster, setSelectedRiskDisaster] = useState(null);


  const handleFocusIncident = (id) => {
    setFocusedIncidentId(id);
    const mapElement = document.getElementById("disaster-map-section");
    if (mapElement) {
      mapElement.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const isFetchingRef = useRef(false);

  const refreshData = useCallback(async (isBackground = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    if (!isBackground) {
      setLoading(true);
    } else {
      setIsRefreshing(true);
    }

    try {
      const [dashRes, disastersRes, centersRes, programsRes] = await Promise.allSettled([
        api.get("/dashboard"),
        api.get("/disasters"),
        api.get("/training-centers"),
        api.get("/training-programs"),
      ]);

      let fetchedDisasters = [];
      if (disastersRes.status === "fulfilled" && Array.isArray(disastersRes.value?.data)) {
        fetchedDisasters = disastersRes.value.data;
        setAllDisasters(fetchedDisasters);
      }

      let fetchedCenters = [];
      if (centersRes.status === "fulfilled" && Array.isArray(centersRes.value?.data)) {
        fetchedCenters = centersRes.value.data;
        setAllCenters(fetchedCenters);
      }

      let fetchedPrograms = [];
      if (programsRes.status === "fulfilled" && Array.isArray(programsRes.value?.data)) {
        fetchedPrograms = programsRes.value.data;
        setRecentPrograms(fetchedPrograms);
      }

      const dashData = dashRes.status === "fulfilled" ? dashRes.value?.data : null;
      setDashboard({
        totalUsers: dashData?.totalUsers ?? 12,
        totalDisasters: fetchedDisasters.length,
        totalTrainingCenters: fetchedCenters.length,
        totalTrainingPrograms: dashData?.totalTrainingPrograms ?? fetchedPrograms.length,
      });

      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      console.error("Dashboard Load Error:", err);
      if (!isBackground) {
        setError("Failed to load operations telemetry. Please check server connectivity.");
      }
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Single unified 30s polling cycle; prevents duplicate timers and overlapping calls
  useEffect(() => {
    refreshData(false);
    const interval = setInterval(() => {
      refreshData(true);
    }, 30000);
    return () => clearInterval(interval);
  }, [refreshData]);

  return (
    <div className="container-fluid px-0">
      {/* Alert Banner for Active High Severity Disasters */}
      <AlertBanner activeDisasters={allDisasters} />

      {/* Error state alert if initial fetch fails */}
      {error && (
        <div style={{
          background: "rgba(239, 68, 68, 0.15)",
          border: "1px solid rgba(239, 68, 68, 0.35)",
          borderRadius: "8px",
          padding: "10px 16px",
          color: "#fca5a5",
          fontSize: "13px",
          marginBottom: "16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <span>{error}</span>
          <button
            onClick={() => refreshData(false)}
            style={{
              background: "#ef4444",
              border: "none",
              color: "#fff",
              padding: "4px 10px",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: "600",
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Header */}
      <div className="dashboard-header d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="dashboard-title">Operations Command Center</h1>
          <p className="dashboard-subtitle">
            Real-time disaster telemetry, GIS incident mapping, and training relief coordination.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          {/* Manual Refresh Button & Live Status */}
          <button
            onClick={() => refreshData(false)}
            disabled={isRefreshing}
            style={{
              background: "rgba(30, 41, 59, 0.7)",
              color: "#cbd5e1",
              border: "1px solid #334155",
              padding: "7px 12px",
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              cursor: isRefreshing ? "wait" : "pointer",
              transition: "all 0.15s ease",
            }}
            title="Refresh live incident telemetry"
          >
            <RefreshCw size={13} style={{ animation: isRefreshing ? "mapSpin 0.8s linear infinite" : "none" }} />
            {isRefreshing ? "Syncing..." : "Refresh"}
          </button>
          <span style={{ fontSize: "11px", color: "#64748b", marginRight: "4px" }}>
            Updated {formatTimeAgo(lastUpdated)}
          </span>
          <Link
            to="/safety"
            style={{
              background: "rgba(56, 189, 248, 0.15)",
              color: "#38bdf8",
              border: "1px solid rgba(56, 189, 248, 0.3)",
              padding: "7px 14px",
              borderRadius: "6px",
              fontSize: "13px",
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              textDecoration: "none",
            }}
          >
            <ShieldCheck size={14} /> Safety Hub
          </Link>
          <Link
            to="/disasters"
            style={{
              background: "#2563eb",
              color: "#fff",
              padding: "7px 14px",
              borderRadius: "6px",
              fontSize: "13px",
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              textDecoration: "none",
            }}
          >
            Report Disaster <ChevronRight size={14} />
          </Link>
        </div>
      </div>

      {/* High-Level Stat Cards */}
      <div className="row g-3 mb-4">
        <div className="col-xl-3 col-md-6">
          <DashboardCard
            icon={<AlertTriangle size={18} />}
            title="Total Incidents"
            value={dashboard.totalDisasters}
            subtitle="Logged Emergencies"
          />
        </div>

        <div className="col-xl-3 col-md-6">
          <DashboardCard
            icon={<Building2 size={18} />}
            title="Relief Centers"
            value={dashboard.totalTrainingCenters}
            subtitle="Operational Hubs"
          />
        </div>

        <div className="col-xl-3 col-md-6">
          <DashboardCard
            icon={<GraduationCap size={18} />}
            title="Training Modules"
            value={dashboard.totalTrainingPrograms}
            subtitle="Preparedness Programs"
          />
        </div>

        <div className="col-xl-3 col-md-6">
          <DashboardCard
            icon={<Users size={18} />}
            title="Registered Responders"
            value={dashboard.totalUsers}
            subtitle="Active Personnel"
          />
        </div>
      </div>

      {/* Personal Alert Zone & Nearby Incidents Widget */}
      <LocationAlertWidget
        onFocusIncident={handleFocusIncident}
        onLocationChange={setUserAlertLocation}
      />

      {/* GIS Interactive Incident Map */}
      <div id="disaster-map-section" className="mb-4">
        <DisasterMap
          disasters={allDisasters}
          centers={allCenters}
          lastUpdated={lastUpdated}
          onRefresh={() => refreshData(false)}
          isRefreshing={isRefreshing}
          focusedDisasterId={focusedIncidentId}
          userAlertLocation={userAlertLocation}
        />
      </div>

      {/* Live Computed Charts */}
      <div className="mb-4">
        <DashboardCharts disasters={allDisasters} programs={recentPrograms} />
      </div>

      {/* Tables Row: Recent Incidents & Training Activities */}
      <div className="row g-3">
        {/* Recent Disasters */}
        <div className="col-lg-6">
          <div className="section-card">
            <div className="section-title">
              <div>
                <h4>Recent Incident Reports</h4>
                <p>Latest emergency transmissions from field units</p>
              </div>
              <Link
                to="/disasters"
                style={{ fontSize: "12px", color: "#60a5fa", display: "flex", alignItems: "center", gap: "2px" }}
              >
                View all <ChevronRight size={13} />
              </Link>
            </div>

            <div className="table-wrapper">
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Incident</th>
                    <th>District</th>
                    <th>Severity</th>
                    <th>Status</th>
                    <th style={{ textAlign: "right" }}>Risk Assessment</th>
                  </tr>
                </thead>
                <tbody>
                  {allDisasters.slice(0, 5).map((disaster, idx) => (
                    <tr key={disaster.id || idx}>
                      <td className="table-id">#{disaster.id || idx + 1}</td>
                      <td className="table-name">{disaster.disasterName || "Incident"}</td>
                      <td className="table-location">{disaster.district || "Sector"}</td>
                      <td>
                        <span
                          className={
                            disaster.severity?.toUpperCase() === "HIGH"
                              ? "high"
                              : disaster.severity?.toUpperCase() === "MEDIUM"
                              ? "medium"
                              : "low"
                          }
                        >
                          {disaster.severity || "LOW"}
                        </span>
                      </td>
                      <td>
                        <span
                          className={
                            disaster.status?.toUpperCase() === "ACTIVE"
                              ? "status-badge status-active"
                              : "status-badge status-control"
                          }
                        >
                          {disaster.status || "ACTIVE"}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          onClick={() => setSelectedRiskDisaster(disaster)}
                          style={{
                            background: "rgba(168, 85, 247, 0.15)",
                            border: "1px solid rgba(168, 85, 247, 0.4)",
                            color: "#c084fc",
                            fontSize: "11px",
                            fontWeight: "600",
                            padding: "3px 8px",
                            borderRadius: "5px",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                          title="Assess explainable disaster risk"
                        >
                          <ShieldAlert size={12} />
                          Assess
                        </button>
                      </td>
                    </tr>
                  ))}
                  {allDisasters.length === 0 && (
                    <tr>
                      <td colSpan="6" style={{ textAlign: "center", padding: "20px", color: "#64748b" }}>
                        No incidents currently logged.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Training Programs */}
        <div className="col-lg-6">
          <div className="section-card">
            <div className="section-title">
              <div>
                <h4>Active Training Programs</h4>
                <p>Scheduled emergency preparedness courses</p>
              </div>
              <Link
                to="/training-programs"
                style={{ fontSize: "12px", color: "#60a5fa", display: "flex", alignItems: "center", gap: "2px" }}
              >
                View all <ChevronRight size={13} />
              </Link>
            </div>

            <div className="table-wrapper">
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Program</th>
                    <th>Trainer</th>
                    <th>Status</th>
                    <th>Center</th>
                  </tr>
                </thead>
                <tbody>
                  {recentPrograms.slice(0, 5).map((program, idx) => (
                    <tr key={program.id || idx}>
                      <td className="table-id">#{program.id || idx + 1}</td>
                      <td className="table-name">{program.programName || "Program"}</td>
                      <td className="table-location">{program.trainerName || "Instructor"}</td>
                      <td>
                        <span className="status-badge status-active">{program.status || "SCHEDULED"}</span>
                      </td>
                      <td className="table-location">{program.trainingCenterName || "Center Hub"}</td>
                    </tr>
                  ))}
                  {recentPrograms.length === 0 && (
                    <tr>
                      <td colSpan="5" style={{ textAlign: "center", padding: "20px", color: "#64748b" }}>
                        No programs currently registered.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Phase 5: Explainable Disaster Risk Assessment Modal */}
      {selectedRiskDisaster && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(10, 15, 30, 0.78)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "16px",
          }}
          onClick={() => setSelectedRiskDisaster(null)}
        >
          <div
            style={{
              background: "#0f172a",
              border: "1px solid #334155",
              borderRadius: "14px",
              maxWidth: "540px",
              width: "100%",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: "14px 18px",
                background: "#1e293b",
                borderBottom: "1px solid #334155",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
                <ShieldAlert size={17} color="#c084fc" />
                <div>
                  <h4
                    style={{
                      margin: 0,
                      fontSize: "14.5px",
                      fontWeight: "700",
                      color: "#f8fafc",
                    }}
                  >
                    {selectedRiskDisaster.disasterName || "Incident Risk Assessment"}
                  </h4>
                  <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                    {selectedRiskDisaster.district} • {selectedRiskDisaster.disasterType}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedRiskDisaster(null)}
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

            <div>
              <RiskAssessmentPanel
                disasterId={selectedRiskDisaster.id}
                hasCoords={Boolean(
                  selectedRiskDisaster.latitude && selectedRiskDisaster.longitude
                )}
                compact={false}
              />
            </div>

            <div
              style={{
                padding: "12px 18px",
                background: "#0f172a",
                borderTop: "1px solid #1e293b",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <button
                onClick={() => {
                  const id = selectedRiskDisaster.id;
                  setSelectedRiskDisaster(null);
                  handleFocusIncident(id);
                }}
                style={{
                  background: "#3b82f6",
                  border: "none",
                  color: "#ffffff",
                  fontSize: "12px",
                  fontWeight: "600",
                  padding: "6px 14px",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                Focus On GIS Map
              </button>
              <button
                onClick={() => setSelectedRiskDisaster(null)}
                style={{
                  background: "#1e293b",
                  border: "1px solid #334155",
                  color: "#94a3b8",
                  fontSize: "12px",
                  padding: "6px 14px",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
