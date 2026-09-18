import { useEffect, useState } from "react";
import "../styles/trainingprograms.css";
import {
  getTrainingPrograms,
  createTrainingProgram,
  updateTrainingProgram,
  deleteTrainingProgram,
} from "../services/trainingProgramService";

function TrainingPrograms() {
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem("user") || "null");
  } catch (e) {
    user = null;
  }
  const role = user?.role || "PARTICIPANT";
  const isAdmin = role === "ADMIN";
  const isTrainer = role === "TRAINER";
  const canManagePrograms = isAdmin || isTrainer;

  const [programs, setPrograms] = useState([]);
  const [enrolledIds, setEnrolledIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [centerFilter, setCenterFilter] = useState("All Centers");
  const [sortBy, setSortBy] = useState("Newest");

  const [showViewModal, setShowViewModal] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);

  const [editing, setEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [selectedProgram, setSelectedProgram] = useState(null);

  const [programForm, setProgramForm] = useState({
    programName: "",
    trainerName: "",
    durationDays: "",
    startDate: "",
    endDate: "",
    maxParticipants: "",
    status: "Upcoming",
    description: "",
    trainingCenterId: "",
  });

  const loadPrograms = async () => {
    try {
      const response = await getTrainingPrograms();

      setPrograms(response.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPrograms();
  }, []);

  const handleEnroll = (programId) => {
    if (enrolledIds.includes(programId)) {
      setEnrolledIds(enrolledIds.filter((id) => id !== programId));
      alert("Registration cancelled for this program.");
    } else {
      setEnrolledIds([...enrolledIds, programId]);
      alert("🎉 Successfully registered for training program!");
    }
  };

  const handleView = (program) => {
    setSelectedProgram(program);
    setShowViewModal(true);
  };

  const handleAddClick = () => {
    setEditing(false);
    setEditingId(null);
    setProgramForm({
      programName: "",
      trainerName: "",
      durationDays: "",
      startDate: "",
      endDate: "",
      maxParticipants: "",
      status: "Upcoming",
      description: "",
      trainingCenterId: "",
    });

    setShowAddModal(true);
  };
  const handleEdit = (program) => {
    setEditing(true);
    setEditingId(program.id);
    setSelectedProgram(program);

    setProgramForm({
      programName: program.programName,
      trainerName: program.trainerName,
      durationDays: program.durationDays,
      startDate: program.startDate,
      endDate: program.endDate,
      maxParticipants: program.maxParticipants,
      status: program.status,
      description: program.description,
      trainingCenterId: program.trainingCenterId,
    });

    setShowAddModal(true);
  };

  const handleSave = async () => {
    try {
      if (editing) {
        await updateTrainingProgram(editingId, programForm);

        alert("Program Updated Successfully");
      } else {
        await createTrainingProgram(programForm);

        alert("Program Added Successfully");
      }

      setShowAddModal(false);

      setEditing(false);

      setEditingId(null);

      setProgramForm({
        programName: "",
        trainerName: "",
        durationDays: "",
        startDate: "",
        endDate: "",
        maxParticipants: "",
        status: "Upcoming",
        description: "",
        trainingCenterId: "",
      });

      loadPrograms();
    } catch (error) {
      console.error(error);

      alert("Operation Failed");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this program?")) return;

    try {
      await deleteTrainingProgram(id);

      alert("Program Deleted Successfully");

      loadPrograms();
    } catch (error) {
      console.error(error);

      alert("Delete Failed");
    }
  };

  if (loading) {
    return (
      <div className="text-center mt-5">
        <div className="spinner-border text-primary"></div>

        <h5 className="mt-3">Loading Programs...</h5>
      </div>
    );
  }
  const totalPrograms = programs.length;

  const activePrograms = programs.filter(
    (program) => program.status === "Active",
  ).length;

  const upcomingPrograms = programs.filter(
    (program) => program.status === "Upcoming",
  ).length;

  const totalParticipants = programs.reduce(
    (sum, program) => sum + Number(program.maxParticipants || 0),
    0,
  );
  const uniqueCenters = [
    "All Centers",
    ...new Set(programs.map((program) => program.trainingCenterName)),
  ];

  const filteredPrograms = programs
    .filter((program) => {
      const matchesSearch =
        program.programName.toLowerCase().includes(search.toLowerCase()) ||
        program.trainerName.toLowerCase().includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "All Status" || program.status === statusFilter;

      const matchesCenter =
        centerFilter === "All Centers" ||
        program.trainingCenterName === centerFilter;

      return matchesSearch && matchesStatus && matchesCenter;
    })
    .sort((a, b) => {
      if (sortBy === "Newest") {
        return new Date(b.startDate) - new Date(a.startDate);
      }

      if (sortBy === "Oldest") {
        return new Date(a.startDate) - new Date(b.startDate);
      }

      if (sortBy === "A-Z") {
        return a.programName.localeCompare(b.programName);
      }

      return 0;
    });

  return (
    <div className="container-fluid">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2>Training Programs</h2>

          <p className="text-muted">Disaster Awareness & Skill Development</p>
        </div>

        {canManagePrograms && (
          <button className="btn btn-primary" onClick={handleAddClick}>
            + Add Program
          </button>
        )}
      </div>

      <div className="training-stats-strip">
        <div className="training-stat-item">
          <div className="training-stat-icon">📚</div>

          <div>
            <h3>{totalPrograms}</h3>
            <p>Programs</p>
          </div>
        </div>

        <div className="training-divider"></div>

        <div className="training-stat-item">
          <div className="training-stat-icon">🟢</div>

          <div>
            <h3>{activePrograms}</h3>
            <p>Active</p>
          </div>
        </div>

        <div className="training-divider"></div>

        <div className="training-stat-item">
          <div className="training-stat-icon">⏳</div>

          <div>
            <h3>{upcomingPrograms}</h3>
            <p>Upcoming</p>
          </div>
        </div>

        <div className="training-divider"></div>

        <div className="training-stat-item">
          <div className="training-stat-icon">👥</div>

          <div>
            <h3>{totalParticipants}</h3>
            <p>Participants</p>
          </div>
        </div>
      </div>

      <div className="training-toolbar">
        <input
          type="text"
          placeholder="Search Program..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option>All Status</option>
          <option>Active</option>
          <option>Upcoming</option>
          <option>Completed</option>
        </select>

        <select
          value={centerFilter}
          onChange={(e) => setCenterFilter(e.target.value)}
        >
          {uniqueCenters.map((center) => (
            <option key={center}>{center}</option>
          ))}
        </select>

        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option>Newest</option>
          <option>Oldest</option>
          <option>A-Z</option>
        </select>
      </div>

      <p className="showing-count">
        Showing {filteredPrograms.length} of {programs.length} programs
      </p>

      <div className="row">
        {filteredPrograms.map((program) => (
          <div className="col-lg-6 mb-4" key={program.id}>
            <div
              style={{
                borderRadius: "18px",
                overflow: "hidden",
                background: "#0f172a",
                border: "1px solid #1e293b",
                boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
                transition: "border-color 0.2s, transform 0.2s",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#334155"; e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#1e293b"; e.currentTarget.style.transform = "translateY(0)"; }}
            >
              <div style={{ display: "flex" }}>
                {/* Date Column */}
                <div style={{
                  width: "80px",
                  flexShrink: 0,
                  background: "#2563eb",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "16px 8px",
                  color: "#fff",
                  textAlign: "center",
                }}>
                  <div style={{ fontSize: "28px", fontWeight: "800", lineHeight: 1 }}>
                    {new Date(program.startDate).getDate()}
                  </div>
                  <div style={{ fontSize: "14px", fontWeight: "600", marginTop: "2px" }}>
                    {new Date(program.startDate).toLocaleString("default", { month: "short" })}
                  </div>
                  <div style={{ fontSize: "12px", opacity: 0.85, marginTop: "2px" }}>
                    {new Date(program.startDate).getFullYear()}
                  </div>
                </div>

                {/* Content Column */}
                <div style={{ flex: 1, padding: "16px 20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ fontSize: "15px", fontWeight: "700", color: "#f8fafc", margin: "0 0 4px 0" }}>
                        {program.programName}
                      </h4>
                      <p style={{ fontSize: "13px", color: "#94a3b8", margin: "0 0 10px 0", lineHeight: 1.4 }}>
                        {program.description}
                      </p>
                    </div>
                    <span style={{
                      fontSize: "11px",
                      fontWeight: "700",
                      padding: "3px 10px",
                      borderRadius: "100px",
                      flexShrink: 0,
                      background: program.status === "Active"
                        ? "rgba(16,185,129,0.15)"
                        : program.status === "Upcoming"
                          ? "rgba(245,158,11,0.15)"
                          : "rgba(100,116,139,0.15)",
                      color: program.status === "Active"
                        ? "#34d399"
                        : program.status === "Upcoming"
                          ? "#fbbf24"
                          : "#94a3b8",
                      border: `1px solid ${
                        program.status === "Active"
                          ? "rgba(16,185,129,0.3)"
                          : program.status === "Upcoming"
                            ? "rgba(245,158,11,0.3)"
                            : "rgba(100,116,139,0.3)"
                      }`,
                    }}>
                      {program.status?.toUpperCase()}
                    </span>
                  </div>

                  <div style={{ height: "1px", background: "#1e293b", margin: "10px 0" }} />

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px", marginBottom: "12px" }}>
                    <div>
                      <div style={{ fontSize: "10px", fontWeight: "700", color: "#64748b", letterSpacing: "0.05em", marginBottom: "2px" }}>👨 TRAINER</div>
                      <div style={{ fontSize: "13px", fontWeight: "600", color: "#e2e8f0" }}>{program.trainerName}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "10px", fontWeight: "700", color: "#64748b", letterSpacing: "0.05em", marginBottom: "2px" }}>👥 PARTICIPANTS</div>
                      <div style={{ fontSize: "13px", fontWeight: "600", color: "#e2e8f0" }}>{program.maxParticipants}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "10px", fontWeight: "700", color: "#64748b", letterSpacing: "0.05em", marginBottom: "2px" }}>🏢 TRAINING CENTER</div>
                      <div style={{ fontSize: "13px", fontWeight: "600", color: "#e2e8f0" }}>{program.trainingCenterName}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "10px", fontWeight: "700", color: "#64748b", letterSpacing: "0.05em", marginBottom: "2px" }}>⏱ DURATION</div>
                      <div style={{ fontSize: "13px", fontWeight: "600", color: "#e2e8f0" }}>{program.durationDays} Days</div>
                    </div>
                  </div>

                  <div style={{ height: "1px", background: "#1e293b", margin: "10px 0" }} />

                  <div className="program-actions">
                    <button
                      className="view-btn"
                      onClick={() => handleView(program)}
                    >
                      👁 View
                    </button>

                    {canManagePrograms && (
                      <button
                        className="edit-btn"
                        onClick={() => handleEdit(program)}
                      >
                        ✏ Edit
                      </button>
                    )}

                    {canManagePrograms && (
                      <button
                        className="delete-btn"
                        onClick={() => handleDelete(program.id)}
                      >
                        🗑 Delete
                      </button>
                    )}

                    {!canManagePrograms && (
                      <button
                        className={`btn btn-sm ${enrolledIds.includes(program.id) ? "btn-success" : "btn-outline-primary"}`}
                        onClick={() => handleEnroll(program.id)}
                      >
                        {enrolledIds.includes(program.id) ? "✅ Enrolled" : "📝 Enroll"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      {showViewModal && selectedProgram && (
        <div
          className="modal fade show d-block"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-lg">
            <div className="modal-content training-program-modal">
              <div className="modal-header training-program-header">
                <h4>Training Program Details</h4>

                <button
                  className="btn-close btn-close-white"
                  onClick={() => setShowViewModal(false)}
                ></button>
              </div>

              <div className="modal-body training-program-body">
                <div className="row">
                  <div className="col-md-6">
                    <p>
                      <strong>Program Name</strong>
                    </p>
                    <p>{selectedProgram.programName}</p>

                    <p>
                      <strong>Trainer</strong>
                    </p>
                    <p>{selectedProgram.trainerName}</p>

                    <p>
                      <strong>Status</strong>
                    </p>
                    <p>{selectedProgram.status}</p>

                    <p>
                      <strong>Duration</strong>
                    </p>
                    <p>{selectedProgram.durationDays} Days</p>
                  </div>

                  <div className="col-md-6">
                    <p>
                      <strong>Participants</strong>
                    </p>
                    <p>{selectedProgram.maxParticipants}</p>

                    <p>
                      <strong>Training Center</strong>
                    </p>
                    <p>{selectedProgram.trainingCenterName}</p>

                    <p>
                      <strong>Start Date</strong>
                    </p>
                    <p>{selectedProgram.startDate}</p>

                    <p>
                      <strong>End Date</strong>
                    </p>
                    <p>{selectedProgram.endDate}</p>
                  </div>
                </div>

                <hr />

                <p>
                  <strong>Description</strong>
                </p>

                <p>{selectedProgram.description}</p>
              </div>

              <div className="modal-footer training-program-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowViewModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <div
          className="modal fade show d-block"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-xl">
            <div className="modal-content training-program-modal">
              <div className="modal-header training-program-header">
                <h4>
                  {editing ? "Edit Program" : "Register New Training Program"}
                </h4>

                <button
                  className="btn-close btn-close-white"
                  onClick={() => setShowAddModal(false)}
                ></button>
              </div>

              <div className="modal-body training-program-body">
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label>Program Name</label>

                    <input
                      className="form-control"
                      value={programForm.programName}
                      onChange={(e) =>
                        setProgramForm({
                          ...programForm,
                          programName: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="col-md-6 mb-3">
                    <label>Trainer Name</label>

                    <input
                      className="form-control"
                      value={programForm.trainerName}
                      onChange={(e) =>
                        setProgramForm({
                          ...programForm,
                          trainerName: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                <div className="row">
                  <div className="col-md-8 mb-3">
                    <label>Description</label>

                    <textarea
                      className="form-control"
                      rows="3"
                      value={programForm.description}
                      onChange={(e) =>
                        setProgramForm({
                          ...programForm,
                          description: e.target.value,
                        })
                      }
                    ></textarea>
                  </div>

                  <div className="col-md-4 mb-3">
                    <label>Training Center ID</label>

                    <input
                      type="number"
                      className="form-control"
                      value={programForm.trainingCenterId}
                      onChange={(e) =>
                        setProgramForm({
                          ...programForm,
                          trainingCenterId: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label>Duration (Days)</label>

                    <input
                      type="number"
                      className="form-control"
                      value={programForm.durationDays}
                      onChange={(e) =>
                        setProgramForm({
                          ...programForm,
                          durationDays: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="col-md-6 mb-3">
                    <label>Maximum Participants</label>

                    <input
                      type="number"
                      className="form-control"
                      value={programForm.maxParticipants}
                      onChange={(e) =>
                        setProgramForm({
                          ...programForm,
                          maxParticipants: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label>Start Date</label>

                    <input
                      type="date"
                      className="form-control"
                      value={programForm.startDate}
                      onChange={(e) =>
                        setProgramForm({
                          ...programForm,
                          startDate: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="col-md-6 mb-3">
                    <label>End Date</label>

                    <input
                      type="date"
                      className="form-control"
                      value={programForm.endDate}
                      onChange={(e) =>
                        setProgramForm({
                          ...programForm,
                          endDate: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                <div className="mb-3">
                  <label>Status</label>

                  <select
                    className="form-select"
                    value={programForm.status}
                    onChange={(e) =>
                      setProgramForm({
                        ...programForm,
                        status: e.target.value,
                      })
                    }
                  >
                    <option value="Upcoming">Upcoming</option>

                    <option value="Active">Active</option>

                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>

              <div className="modal-footer training-program-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>

                <button className="btn btn-success" onClick={handleSave}>
                  {editing ? "Update Program" : "Save Program"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TrainingPrograms;
