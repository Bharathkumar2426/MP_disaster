import { useEffect, useState } from "react";
import "../styles/disasters.css";
import "../styles/dashboard.css";
import {
  Search,
  Filter,
  Plus,
  FileText,
  Download,
  Flame,
  CheckCircle2,
  ShieldCheck,
  AlertTriangle,
  Edit2,
  Trash2,
  X,
  MapPin,
} from "lucide-react";
import {
  getDisasters,
  createDisaster,
  updateDisaster,
  deleteDisaster,
} from "../services/disasterService";
import { exportDisastersPDF, exportToCSV } from "../utils/reportGenerator";
import { resolveCoordinates } from "../utils/geoResolver";

function Disasters() {
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem("user") || "null");
  } catch (e) {
    user = null;
  }
  const role = user?.role || "PARTICIPANT";
  const isAdmin = role === "ADMIN";
  const isTrainer = role === "TRAINER";
  const canManage = isAdmin || isTrainer;

  const [disasters, setDisasters] = useState([]);
  const [filteredDisasters, setFilteredDisasters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] = useState("ALL");
  const [severityFilter, setSeverityFilter] = useState("ALL");
  const [districtFilter, setDistrictFilter] = useState("ALL");
  const [disasterTypeFilter, setDisasterTypeFilter] = useState("ALL");
  const [sortOrder, setSortOrder] = useState("NEWEST");

  const [showModal, setShowModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedDisasterId, setSelectedDisasterId] = useState(null);
  const [modalError, setModalError] = useState("");

  const [newDisaster, setNewDisaster] = useState({
    disasterName: "",
    disasterType: "",
    district: "",
    location: "",
    severity: "MEDIUM",
    status: "ACTIVE",
    description: "",
    latitude: "",
    longitude: "",
  });


  const loadDisasters = async () => {
    setLoading(true);
    try {
      const response = await getDisasters();
      setDisasters(response.data);
      setFilteredDisasters(response.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDisasters();
  }, []);

  useEffect(() => {
    let result = disasters.filter((d) => {
      const matchesSearch =
        (d.disasterName || "").toLowerCase().includes(search.toLowerCase()) ||
        (d.district || "").toLowerCase().includes(search.toLowerCase()) ||
        (d.disasterType || "").toLowerCase().includes(search.toLowerCase());

      const matchesStatus = statusFilter === "ALL" || d.status === statusFilter;
      const matchesSeverity = severityFilter === "ALL" || d.severity === severityFilter;
      const matchesDistrict = districtFilter === "ALL" || d.district === districtFilter;
      const matchesType = disasterTypeFilter === "ALL" || d.disasterType === disasterTypeFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesSeverity &&
        matchesDistrict &&
        matchesType
      );
    });

    result.sort((a, b) => (sortOrder === "NEWEST" ? b.id - a.id : a.id - b.id));
    setFilteredDisasters(result);
  }, [
    disasters,
    search,
    statusFilter,
    severityFilter,
    districtFilter,
    disasterTypeFilter,
    sortOrder,
  ]);

  async function handleDelete(id) {
    if (!window.confirm("Are you sure you want to delete this incident record?")) return;
    try {
      await deleteDisaster(id);
      loadDisasters();
    } catch (error) {
      console.error("Delete operation failed:", error);
    }
  }

  function handleFieldChange(field, value) {
    const updated = { ...newDisaster, [field]: value };
    // Auto-resolve coordinates if district/location/name/description changed and user hasn't manually overridden coords
    if (["district", "location", "disasterName", "description"].includes(field)) {
      const resolved = resolveCoordinates(
        updated.district,
        updated.location,
        updated.disasterName,
        updated.description
      );
      if (resolved) {
        updated.latitude = resolved[0];
        updated.longitude = resolved[1];
      }
    }
    setNewDisaster(updated);
    if (modalError) setModalError("");
  }

  function handleEdit(disaster) {
    setIsEditMode(true);
    setSelectedDisasterId(disaster.id);
    setModalError("");
    setNewDisaster({
      disasterName: disaster.disasterName || "",
      disasterType: disaster.disasterType || "",
      district: disaster.district || "",
      location: disaster.location || "",
      severity: disaster.severity || "MEDIUM",
      status: disaster.status || "ACTIVE",
      description: disaster.description || "",
      latitude: disaster.latitude || "",
      longitude: disaster.longitude || "",
    });
    setShowModal(true);
  }

  async function handleSave() {
    try {
      setModalError("");
      const payload = { ...newDisaster };

      // Ensure coordinates are resolved if missing
      if (!payload.latitude || !payload.longitude) {
        const resolved = resolveCoordinates(
          payload.district,
          payload.location,
          payload.disasterName,
          payload.description
        );
        if (resolved) {
          payload.latitude = resolved[0];
          payload.longitude = resolved[1];
        }
      }

      if (isEditMode) {
        await updateDisaster(selectedDisasterId, payload);
      } else {
        await createDisaster(payload);
      }

      setShowModal(false);
      setIsEditMode(false);
      setSelectedDisasterId(null);
      setNewDisaster({
        disasterName: "",
        disasterType: "",
        district: "",
        location: "",
        severity: "MEDIUM",
        status: "ACTIVE",
        description: "",
        latitude: "",
        longitude: "",
      });
      loadDisasters();
    } catch (error) {
      console.error(error);
      setModalError(
        error?.response?.data?.detail || "Operation failed. Please verify the input fields."
      );
    }
  }


  const total = disasters.length;
  const active = disasters.filter((d) => d.status === "ACTIVE").length;
  const controlled = disasters.filter((d) => d.status === "UNDER_CONTROL" || d.status === "RESOLVED").length;
  const high = disasters.filter((d) => d.severity === "HIGH").length;
  const districts = [...new Set(disasters.map((d) => d.district).filter(Boolean))].sort();
  const disasterTypes = [...new Set(disasters.map((d) => d.disasterType).filter(Boolean))].sort();

  return (
    <div className="container-fluid px-0">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Disaster Incident Registry</h1>
          <p className="page-subtitle">
            Log, filter and dispatch response operations for natural and industrial incidents.
          </p>
        </div>

        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {/* PDF Report Export */}
          <button
            className="btn-export"
            onClick={() => exportDisastersPDF(filteredDisasters, { userName: user?.fullName })}
            title="Download PDF Situation Report"
          >
            <FileText size={14} color="#60a5fa" />
            SitRep (PDF)
          </button>

          {/* CSV Export */}
          <button
            className="btn-export"
            onClick={() => exportToCSV(filteredDisasters, "disaster_incidents.csv")}
            title="Download CSV spreadsheet"
          >
            <Download size={14} color="#38bdf8" />
            CSV
          </button>

          {canManage && (
            <button
              className="btn-primary-action"
              onClick={() => {
                setIsEditMode(false);
                setSelectedDisasterId(null);
                setNewDisaster({
                  disasterName: "",
                  disasterType: "",
                  district: "",
                  location: "",
                  severity: "MEDIUM",
                  status: "ACTIVE",
                  description: "",
                  latitude: "",
                  longitude: "",
                });
                setShowModal(true);
              }}
            >
              <Plus size={15} />
              Report Incident
            </button>
          )}
        </div>
      </div>

      {/* Status Metric Strip */}
      <div className="status-strip">
        <div className="status-item">
          <div className="status-icon-box" style={{ background: "rgba(59, 130, 246, 0.12)", color: "#60a5fa" }}>
            <Flame size={18} />
          </div>
          <div>
            <h3>{total}</h3>
            <p>Total Incidents</p>
          </div>
        </div>

        <div className="status-divider"></div>

        <div className="status-item">
          <div className="status-icon-box" style={{ background: "rgba(220, 38, 38, 0.12)", color: "#f87171" }}>
            <AlertTriangle size={18} />
          </div>
          <div>
            <h3>{active}</h3>
            <p>Active Crises</p>
          </div>
        </div>

        <div className="status-divider"></div>

        <div className="status-item">
          <div className="status-icon-box" style={{ background: "rgba(34, 197, 94, 0.12)", color: "#4ade80" }}>
            <CheckCircle2 size={18} />
          </div>
          <div>
            <h3>{controlled}</h3>
            <p>Controlled / Resolved</p>
          </div>
        </div>

        <div className="status-divider"></div>

        <div className="status-item">
          <div className="status-icon-box" style={{ background: "rgba(245, 158, 11, 0.12)", color: "#fbbf24" }}>
            <ShieldCheck size={18} />
          </div>
          <div>
            <h3>{high}</h3>
            <p>High Priority</p>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="section-card p-3">
        {/* Toolbar & Filter Controls */}
        <div className="toolbar-container">
          <div className="search-box">
            <Search size={14} className="search-icon" />
            <input
              type="text"
              placeholder="Search by incident, district, or type..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <select
              className="filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="UNDER_CONTROL">Under Control</option>
              <option value="RESOLVED">Resolved</option>
            </select>

            <select
              className="filter-select"
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
            >
              <option value="ALL">All Severity</option>
              <option value="HIGH">High Severity</option>
              <option value="MEDIUM">Medium Severity</option>
              <option value="LOW">Low Severity</option>
            </select>

            <select
              className="filter-select"
              value={disasterTypeFilter}
              onChange={(e) => setDisasterTypeFilter(e.target.value)}
            >
              <option value="ALL">All Types</option>
              {disasterTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>

            <select
              className="filter-select"
              value={districtFilter}
              onChange={(e) => setDistrictFilter(e.target.value)}
            >
              <option value="ALL">All Districts</option>
              {districts.map((district) => (
                <option key={district} value={district}>
                  {district}
                </option>
              ))}
            </select>

            <select
              className="filter-select"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
            >
              <option value="NEWEST">Newest First</option>
              <option value="OLDEST">Oldest First</option>
            </select>
          </div>
        </div>

        {/* Quick Filter Type Pills */}
        <div className="quick-pills">
          <span style={{ fontSize: "11px", color: "#64748b", fontWeight: "600", marginRight: "4px" }}>
            QUICK TYPE:
          </span>
          {["Flood", "Fire", "Earthquake", "Landslide", "Cyclone"].map((type) => (
            <button
              key={type}
              className={`quick-pill ${disasterTypeFilter === type ? "active" : ""}`}
              onClick={() => setDisasterTypeFilter(disasterTypeFilter === type ? "ALL" : type)}
            >
              {type}
            </button>
          ))}
          {disasterTypeFilter !== "ALL" && (
            <button
              className="quick-pill"
              style={{ color: "#ef4444", borderColor: "rgba(239, 68, 68, 0.3)" }}
              onClick={() => setDisasterTypeFilter("ALL")}
            >
              Clear
            </button>
          )}

          <span style={{ marginLeft: "auto", fontSize: "12px", color: "#64748b" }}>
            Showing {filteredDisasters.length} of {disasters.length} records
          </span>
        </div>

        {/* Data Table */}
        <div className="table-wrapper">
          <table className="dashboard-table">
            <thead>
              <tr>
                <th style={{ width: "60px" }}>ID</th>
                <th>Incident Name</th>
                <th>Category</th>
                <th>District / Location</th>
                <th>Severity</th>
                <th>Status</th>
                <th style={{ textAlign: "right", width: "120px" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDisasters.map((d) => (
                <tr key={d.id}>
                  <td className="table-id">#{d.id}</td>
                  <td className="table-name">{d.disasterName || "Incident"}</td>
                  <td>
                    <span
                      style={{
                        fontSize: "11.5px",
                        color: "#94a3b8",
                        background: "#1e293b",
                        padding: "2px 6px",
                        borderRadius: "4px",
                      }}
                    >
                      {d.disasterType || "Emergency"}
                    </span>
                  </td>
                  <td className="table-location">
                    <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <MapPin size={12} color="#60a5fa" />
                      {d.district} {d.location ? `• ${d.location}` : ""}
                    </span>
                  </td>
                  <td>
                    <span
                      className={
                        d.severity === "HIGH"
                          ? "high"
                          : d.severity === "MEDIUM"
                          ? "medium"
                          : "low"
                      }
                    >
                      {d.severity || "LOW"}
                    </span>
                  </td>
                  <td>
                    <span
                      className={
                        d.status === "ACTIVE"
                          ? "status-badge status-active"
                          : "status-badge status-control"
                      }
                    >
                      {d.status || "ACTIVE"}
                    </span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "inline-flex", gap: "6px" }}>
                      {canManage && (
                        <button
                          onClick={() => handleEdit(d)}
                          style={{
                            background: "#1e293b",
                            border: "1px solid #334155",
                            color: "#94a3b8",
                            padding: "4px 8px",
                            borderRadius: "4px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                          }}
                          title="Edit incident"
                        >
                          <Edit2 size={13} />
                        </button>
                      )}
                      {isAdmin && (
                        <button
                          onClick={() => handleDelete(d.id)}
                          style={{
                            background: "rgba(239, 68, 68, 0.1)",
                            border: "1px solid rgba(239, 68, 68, 0.3)",
                            color: "#f87171",
                            padding: "4px 8px",
                            borderRadius: "4px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                          }}
                          title="Delete incident"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredDisasters.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center", padding: "30px", color: "#64748b" }}>
                    No incident records matching the selected criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Incident Modal (Create / Edit) */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(3px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1500,
            padding: "16px",
          }}
        >
          <div className="disaster-modal" style={{ width: "100%", maxWidth: "620px" }}>
            <div className="disaster-modal-header">
              <h5>{isEditMode ? "Edit Incident Record" : "Log New Emergency Incident"}</h5>
              <button
                onClick={() => setShowModal(false)}
                style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer" }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="disaster-modal-body">
              {modalError && (
                <div
                  style={{
                    background: "rgba(239, 68, 68, 0.15)",
                    border: "1px solid rgba(239, 68, 68, 0.4)",
                    color: "#fca5a5",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    marginBottom: "14px",
                    fontSize: "13px",
                  }}
                >
                  ⚠ {modalError}
                </div>
              )}

              <div className="row g-3">
                <div className="col-md-6">
                  <label>Disaster Name</label>
                  <input
                    className="form-control"
                    placeholder="e.g. Flash Flood / Landslide"
                    value={newDisaster.disasterName}
                    onChange={(e) => handleFieldChange("disasterName", e.target.value)}
                  />
                </div>

                <div className="col-md-6">
                  <label>Disaster Type</label>
                  <input
                    className="form-control"
                    placeholder="e.g. Flood, Cyclone, Landslide, Fire"
                    value={newDisaster.disasterType}
                    onChange={(e) => handleFieldChange("disasterType", e.target.value)}
                  />
                </div>

                <div className="col-md-6">
                  <label>District / Region</label>
                  <input
                    className="form-control"
                    placeholder="e.g. Kangra, Kullu, Shimla, Mandi"
                    value={newDisaster.district}
                    onChange={(e) => handleFieldChange("district", e.target.value)}
                  />
                </div>

                <div className="col-md-6">
                  <label>Location / Area</label>
                  <input
                    className="form-control"
                    placeholder="e.g. Dharamshala, Manali, Himachal Pradesh"
                    value={newDisaster.location}
                    onChange={(e) => handleFieldChange("location", e.target.value)}
                  />
                </div>

                <div className="col-md-6">
                  <label>Severity Level</label>
                  <select
                    className="form-select"
                    value={newDisaster.severity}
                    onChange={(e) => handleFieldChange("severity", e.target.value)}
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH (Immediate Dispatch)</option>
                  </select>
                </div>

                <div className="col-md-6">
                  <label>Operational Status</label>
                  <select
                    className="form-select"
                    value={newDisaster.status}
                    onChange={(e) => handleFieldChange("status", e.target.value)}
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="UNDER_CONTROL">UNDER_CONTROL</option>
                    <option value="RESOLVED">RESOLVED</option>
                  </select>
                </div>

                {/* GIS Coordinates */}
                <div className="col-md-6">
                  <label>Latitude (GIS)</label>
                  <input
                    type="number"
                    step="0.0001"
                    className="form-control"
                    placeholder="e.g. 31.1048"
                    value={newDisaster.latitude}
                    onChange={(e) => setNewDisaster({ ...newDisaster, latitude: e.target.value })}
                  />
                </div>

                <div className="col-md-6">
                  <label>Longitude (GIS)</label>
                  <input
                    type="number"
                    step="0.0001"
                    className="form-control"
                    placeholder="e.g. 77.1734"
                    value={newDisaster.longitude}
                    onChange={(e) => setNewDisaster({ ...newDisaster, longitude: e.target.value })}
                  />
                </div>

                {newDisaster.latitude && newDisaster.longitude && (
                  <div className="col-12" style={{ marginTop: "-2px" }}>
                    <div style={{ fontSize: "12px", color: "#38bdf8", display: "flex", alignItems: "center", gap: "6px" }}>
                      <MapPin size={13} />
                      Target Map Coordinates: [{Number(newDisaster.latitude).toFixed(4)}, {Number(newDisaster.longitude).toFixed(4)}]
                    </div>
                  </div>
                )}

                <div className="col-12">
                  <label>Incident Details & Observations</label>
                  <textarea
                    rows="3"
                    className="form-control"
                    placeholder="Provide details regarding damages, required personnel, or relief equipment needed..."
                    value={newDisaster.description}
                    onChange={(e) => handleFieldChange("description", e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="disaster-modal-footer">
              <button
                className="btn-export"
                onClick={() => setShowModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn-primary-action"
                onClick={handleSave}
              >
                {isEditMode ? "Save Changes" : "Submit Report"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Disasters;
