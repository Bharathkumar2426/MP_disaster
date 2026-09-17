import { useEffect, useState } from "react";
import "../styles/trainingcenters.css";
import {
  getTrainingCenters,
  createTrainingCenter,
  updateTrainingCenter,
  deleteTrainingCenter,
} from "../services/trainingCenterService";

function TrainingCenters() {
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem("user") || "null");
  } catch (e) {
    user = null;
  }
  const role = user?.role || "PARTICIPANT";
  const isAdmin = role === "ADMIN";

  const [centers, setCenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [districtFilter, setDistrictFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [capacityFilter, setCapacityFilter] = useState("ALL");
  const [sortOrder, setSortOrder] = useState("NEWEST");
  const districts = [...new Set(centers.map((center) => center.district))];
  const statuses = [...new Set(centers.map((center) => center.status))];
  const [showModal, setShowModal] = useState(false);
  const [selectedCenter, setSelectedCenter] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [newCenter, setNewCenter] = useState({
    centerName: "",
    district: "",
    address: "",
    capacity: "",
    contactNumber: "",
    coordinatorName: "",
    status: "Active",
    latitude: "",
    longitude: "",
  });
  const loadCenters = async () => {
    try {
      const response = await getTrainingCenters();
      setCenters(response.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCenters();
  }, []);

  const handleView = (center) => {
    setSelectedCenter(center);
    setShowModal(true);
  };

  const handleEdit = (center) => {
    setIsEditMode(true);

    setEditingId(center.id);

    setNewCenter(center);

    setShowAddModal(true);
  };

  const handleAdd = async () => {
    try {
      if (isEditMode) {
        await updateTrainingCenter(editingId, newCenter);

        alert("Training Center Updated Successfully");
      } else {
        await createTrainingCenter(newCenter);

        alert("Training Center Added Successfully");
      }

      setShowAddModal(false);

      setIsEditMode(false);

      setEditingId(null);

      setNewCenter({
        centerName: "",
        district: "",
        address: "",
        capacity: "",
        contactNumber: "",
        coordinatorName: "",
        status: "Active",
        latitude: "",
        longitude: "",
      });

      loadCenters();
    } catch (error) {
      console.error(error);

      alert("Operation Failed");
    }
  };

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this Training Center?",
    );

    if (!confirmDelete) return;

    try {
      await deleteTrainingCenter(id);

      alert("Training Center deleted successfully.");

      loadCenters();
    } catch (error) {
      console.error(error);

      alert("Failed to delete Training Center.");
    }
  };

  if (loading) {
    return (
      <div className="text-center mt-5">
        <div className="spinner-border text-primary"></div>
        <h5 className="mt-3">Loading Training Centers...</h5>
      </div>
    );
  }

  const filteredCenters = centers
    .filter((center) => {
      const matchesSearch =
        center.centerName.toLowerCase().includes(search.toLowerCase()) ||
        center.district.toLowerCase().includes(search.toLowerCase()) ||
        center.coordinatorName.toLowerCase().includes(search.toLowerCase());
      const matchesDistrict =
        districtFilter === "ALL" || center.district === districtFilter;

      const matchesStatus =
        statusFilter === "ALL" || center.status === statusFilter;

      const matchesCapacity =
        capacityFilter === "ALL" ||
        (capacityFilter === "0-100" && center.capacity <= 100) ||
        (capacityFilter === "101-200" &&
          center.capacity > 100 &&
          center.capacity <= 200) ||
        (capacityFilter === "201+" && center.capacity > 200);

      return (
        matchesSearch && matchesDistrict && matchesStatus && matchesCapacity
      );
    })

    .sort((a, b) => {
      switch (sortOrder) {
        case "NAME_ASC":
          return a.centerName.localeCompare(b.centerName);

        case "NAME_DESC":
          return b.centerName.localeCompare(a.centerName);
        case "CAPACITY_HIGH":
          return b.capacity - a.capacity;

        case "CAPACITY_LOW":
          return a.capacity - b.capacity;

        default:
          return b.id - a.id;
      }
    });

  return (
    <div className="container-fluid">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2>Training Centers</h2>
          <p className="text-muted">Manage Disaster Training Infrastructure</p>
        </div>

        {isAdmin && (
          <button
            className="btn btn-success"
            onClick={() => {
              setIsEditMode(false);

              setEditingId(null);

              setNewCenter({
                centerName: "",
                district: "",
                address: "",
                capacity: "",
                contactNumber: "",
                coordinatorName: "",
                status: "Active",
                latitude: "",
                longitude: "",
              });

              setShowAddModal(true);
            }}
          >
            + Add Training Center
          </button>
        )}
      </div>

      <div className="training-stats-strip">
        <div className="training-stat-item">
          <span className="training-stat-icon">🏢</span>

          <div>
            <h3>{centers.length}</h3>
            <p>Centers</p>
          </div>
        </div>

        <div className="training-divider"></div>

        <div className="training-stat-item">
          <span className="training-stat-icon">🟢</span>

          <div>
            <h3>{centers.filter((c) => c.status === "Active").length}</h3>

            <p>Active</p>
          </div>
        </div>

        <div className="training-divider"></div>

        <div className="training-stat-item">
          <span className="training-stat-icon">👨</span>

          <div>
            <h3>{centers.length * 4}</h3>

            <p>Trainers</p>
          </div>
        </div>

        <div className="training-divider"></div>

        <div className="training-stat-item">
          <span className="training-stat-icon">👥</span>

          <div>
            <h3>{centers.reduce((sum, c) => sum + c.capacity, 0)}</h3>

            <p>Capacity</p>
          </div>
        </div>
      </div>

      <div className="training-toolbar">
        <input
          type="text"
          placeholder="Search Training Center..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
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
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="ALL">All Status</option>

          {statuses.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>

        <select
          value={capacityFilter}
          onChange={(e) => setCapacityFilter(e.target.value)}
        >
          <option value="ALL">All Capacity</option>

          <option value="0-100">0 - 100</option>

          <option value="101-200">101 - 200</option>

          <option value="201+">201+</option>
        </select>

        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
        >
          <option value="NEWEST">Newest</option>

          <option value="NAME_ASC">Name A-Z</option>

          <option value="NAME_DESC">Name Z-A</option>

          <option value="CAPACITY_HIGH">Capacity High</option>

          <option value="CAPACITY_LOW">Capacity Low</option>
        </select>
      </div>
      <p className="showing-count">
        Showing {filteredCenters.length} of {centers.length} centers
      </p>

      <div className="row">
        {filteredCenters.map((center) => (
          <div className="col-lg-4 mb-4" key={center.id}>
            <div className="card shadow h-100">
              <div className="card-body">
                <h4>{center.centerName}</h4>

                <hr />

                <p>
                  <strong>District:</strong>

                  {center.district}
                </p>

                <p>
                  <strong>Capacity:</strong>

                  {center.capacity}
                </p>

                <p>
                  <strong>Coordinator:</strong>

                  {center.coordinatorName}
                </p>

                <p>
                  <strong>Status:</strong>

                  <span
                    className={
                      center.status === "Active"
                        ? "badge bg-success"
                        : "badge bg-secondary"
                    }
                  >
                    {center.status}
                  </span>
                </p>
              </div>

              <div className="center-actions">
                <button className="view-btn" onClick={() => handleView(center)}>
                  👁 View
                </button>

                {isAdmin && (
                  <button className="edit-btn" onClick={() => handleEdit(center)}>
                    ✏ Edit
                  </button>
                )}

                {isAdmin && (
                  <button
                    className="delete-btn"
                    onClick={() => handleDelete(center.id)}
                  >
                    🗑 Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && selectedCenter && (
        <div
          className="modal fade show d-block"
          style={{ background: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-lg">
            <div className="modal-content training-add-modal">
              <div className="modal-header training-modal-header">
                <h4>Training Center Details</h4>

                <button
                  className="btn-close btn-close-white"
                  onClick={() => setShowModal(false)}
                ></button>
              </div>

              <div className="modal-body training-modal-body">
                <div className="row">
                  <div className="col-md-6">
                    <p>
                      <strong>Center Name:</strong>
                    </p>
                    <p>{selectedCenter.centerName}</p>

                    <p>
                      <strong>District:</strong>
                    </p>
                    <p>{selectedCenter.district}</p>

                    <p>
                      <strong>Address:</strong>
                    </p>
                    <p>{selectedCenter.address}</p>

                    <p>
                      <strong>Capacity:</strong>
                    </p>
                    <p>{selectedCenter.capacity}</p>
                  </div>

                  <div className="col-md-6">
                    <p>
                      <strong>Coordinator:</strong>
                    </p>
                    <p>{selectedCenter.coordinatorName}</p>

                    <p>
                      <strong>Contact:</strong>
                    </p>
                    <p>{selectedCenter.contactNumber}</p>

                    <p>
                      <strong>Status:</strong>
                    </p>
                    <p>{selectedCenter.status}</p>

                    <p>
                      <strong>Latitude:</strong>
                    </p>
                    <p>{selectedCenter.latitude}</p>

                    <p>
                      <strong>Longitude:</strong>
                    </p>
                    <p>{selectedCenter.longitude}</p>
                  </div>
                </div>
              </div>

              <div className="modal-footer training-modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowModal(false)}
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
            <div className="modal-content training-add-modal">
              <div className="modal-header training-modal-header">
                <h4>
                  {isEditMode ? "Edit Training Center" : "Add Training Center"}
                </h4>

                <button
                  className="btn-close btn-close-white"
                  onClick={() => setShowAddModal(false)}
                ></button>
              </div>

              <div className="modal-body training-modal-body">
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label>Center Name</label>

                    <input
                      className="form-control"
                      value={newCenter.centerName}
                      onChange={(e) =>
                        setNewCenter({
                          ...newCenter,
                          centerName: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="col-md-6 mb-3">
                    <label>District</label>

                    <input
                      className="form-control"
                      value={newCenter.district}
                      onChange={(e) =>
                        setNewCenter({
                          ...newCenter,
                          district: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label>Address</label>

                    <input
                      className="form-control"
                      value={newCenter.address}
                      onChange={(e) =>
                        setNewCenter({
                          ...newCenter,
                          address: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="col-md-6 mb-3">
                    <label>Capacity</label>

                    <input
                      type="number"
                      className="form-control"
                      value={newCenter.capacity}
                      onChange={(e) =>
                        setNewCenter({
                          ...newCenter,
                          capacity: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label>Contact Number</label>

                    <input
                      className="form-control"
                      value={newCenter.contactNumber}
                      onChange={(e) =>
                        setNewCenter({
                          ...newCenter,
                          contactNumber: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="col-md-6 mb-3">
                    <label>Coordinator Name</label>

                    <input
                      className="form-control"
                      value={newCenter.coordinatorName}
                      onChange={(e) =>
                        setNewCenter({
                          ...newCenter,
                          coordinatorName: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-4 mb-3">
                    <label>Status</label>

                    <select
                      className="form-select"
                      value={newCenter.status}
                      onChange={(e) =>
                        setNewCenter({
                          ...newCenter,
                          status: e.target.value,
                        })
                      }
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>

                  <div className="col-md-4 mb-3">
                    <label>Latitude</label>

                    <input
                      type="number"
                      step="any"
                      className="form-control"
                      value={newCenter.latitude}
                      onChange={(e) =>
                        setNewCenter({
                          ...newCenter,
                          latitude: Number(e.target.value),
                        })
                      }
                    />
                  </div>

                  <div className="col-md-4 mb-3">
                    <label>Longitude</label>

                    <input
                      type="number"
                      step="any"
                      className="form-control"
                      value={newCenter.longitude}
                      onChange={(e) =>
                        setNewCenter({
                          ...newCenter,
                          longitude: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer training-modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>

                <button className="btn btn-primary" onClick={handleAdd}>
                  {isEditMode ? "Update Center" : "Save Center"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TrainingCenters;
