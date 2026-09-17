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
              className="card shadow-lg border-0"
              style={{
                borderRadius: "18px",
                overflow: "hidden",
              }}
            >
              <div className="row g-0">
                <div className="col-2 bg-primary text-white text-center p-3">
                  <h2>{new Date(program.startDate).getDate()}</h2>

                  <h5>
                    {new Date(program.startDate).toLocaleString("default", {
                      month: "short",
                    })}
                  </h5>

                  <small>{new Date(program.startDate).getFullYear()}</small>
                </div>

                <div className="col-10">
                  <div className="p-4">
                    <div className="d-flex justify-content-between">
                      <div>
                        <h4 className="fw-bold">{program.programName}</h4>

                        <p className="text-muted mb-2">{program.description}</p>
                      </div>

                      <span
                        className={
                          program.status === "Active"
                            ? "badge bg-success h-25"
                            : program.status === "Upcoming"
                              ? "badge bg-warning text-dark h-25"
                              : "badge bg-secondary h-25"
                        }
                      >
                        {program.status}
                      </span>
                    </div>

                    <hr />

                    <div className="row">
                      <div className="col-md-6">
                        <div className="mb-3">
                          <small className="text-muted">👨 TRAINER</small>
                          <h6 className="fw-bold">{program.trainerName}</h6>
                        </div>

                        <div>
                          <small className="text-muted">
                            🏢 TRAINING CENTER
                          </small>
                          <h6>{program.trainingCenterName}</h6>
                        </div>
                      </div>

                      <div className="col-md-6">
                        <div className="mb-3">
                          <small className="text-muted">👥 PARTICIPANTS</small>
                          <h6>{program.maxParticipants}</h6>
                        </div>

                        <div>
                          <small className="text-muted">⏱ DURATION</small>
                          <h6>{program.durationDays} Days</h6>
                        </div>
                      </div>
                    </div>

                    <hr />

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
