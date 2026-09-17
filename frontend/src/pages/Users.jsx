import { useEffect, useState } from "react";
import {
  FaSearch,
  FaFilter,
  FaUserPlus,
  FaEdit,
  FaTrash,
} from "react-icons/fa";
import "../styles/users.css";
import {
  getUsers,
  deleteUser,
  createUser,
  updateUser,
} from "../services/userService";

function Users() {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [newUser, setNewUser] = useState({
    fullName: "",
    email: "",
    password: "",
    phoneNumber: "",
    role: "PARTICIPANT",
  });

  const loadUsers = async () => {
    try {
      const response = await getUsers();

      setUsers(response.data);
    } catch (error) {
      console.error("Error loading users:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  async function handleDelete(id) {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this user?",
    );

    if (!confirmDelete) return;

    try {
      await deleteUser(id);

      alert("✅ User deleted successfully.");

      loadUsers();
    } catch (error) {
      console.error(error);

      alert("Failed to delete user.");
    }
  }
  function handleEdit(user) {
    setIsEditMode(true);

    setSelectedUserId(user.id);

    setNewUser({
      fullName: user.fullName,
      email: user.email,
      password: "",
      phoneNumber: user.phoneNumber,
      role: user.role,
    });

    setShowModal(true);
  }
  async function handleSaveUser() {
    try {
      if (isEditMode) {
        await updateUser(selectedUserId, newUser);

        alert("✅ User updated successfully.");
      } else {
        await createUser(newUser);

        alert("✅ User added successfully.");
      }

      loadUsers();

      setShowModal(false);

      setIsEditMode(false);

      setSelectedUserId(null);

      setNewUser({
        fullName: "",
        email: "",
        password: "",
        phoneNumber: "",
        role: "PARTICIPANT",
      });
    } catch (error) {
      console.error(error);

      alert("Operation failed.");
    }
  }
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = roleFilter === "ALL" || user.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  if (loading) {
    return (
      <div className="text-center py-5">
        <div
          className="spinner-border text-primary"
          style={{
            width: "3rem",
            height: "3rem",
          }}
        ></div>

        <h5 className="mt-4 text-white">Loading Users...</h5>

        <p className="text-secondary">
          Please wait while fetching user records.
        </p>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="users-title">Users</h2>

          <p className="users-subtitle">
            Manage registered users, trainers and administrators.
          </p>
        </div>

        <button
          className="btn btn-primary users-add-btn"
          onClick={() => {
            setIsEditMode(false);

            setSelectedUserId(null);

            setNewUser({
              fullName: "",
              email: "",
              password: "",
              phoneNumber: "",
              role: "PARTICIPANT",
            });

            setShowModal(true);
          }}
        >
          <>
            <FaUserPlus className="me-2" />
            Add User
          </>
        </button>
      </div>
      <div className="users-toolbar">
        <div className="search-box">
          <FaSearch className="search-icon" />

          <input
            type="text"
            placeholder="Search users..."
            className="form-control users-search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-box">
          <FaFilter className="filter-icon" />

          <select
            className="form-select users-filter"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="ALL">All Roles</option>
            <option value="ADMIN">Admin</option>
            <option value="TRAINER">Trainer</option>
            <option value="PARTICIPANT">Participant</option>
          </select>
        </div>

        <div className="users-count">
          Total Users: <strong>{filteredUsers.length}</strong>
        </div>
      </div>

      <div className="users-card">
        <div className="p-0">
          <table className="users-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Full Name</th>
                <th>Email</th>
                <th>Phone Number</th>
                <th>Role</th>
                <th width="180">Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-5 text-secondary">
                    No users found.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td className="user-id">{user.id}</td>

                    <td>{user.fullName}</td>

                    <td>{user.email}</td>

                    <td>{user.phoneNumber}</td>

                    <td>
                      <span
                        className={`role-badge ${
                          user.role === "ADMIN"
                            ? "role-admin"
                            : user.role === "TRAINER"
                              ? "role-trainer"
                              : "role-participant"
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>

                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn btn-warning btn-sm edit-btn"
                          onClick={() => handleEdit(user)}
                        >
                          <FaEdit className="me-1" />
                          Edit
                        </button>

                        <button
                          className="btn btn-danger btn-sm delete-btn"
                          onClick={() => handleDelete(user.id)}
                        >
                          <FaTrash className="me-1" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div
          className="modal d-block"
          tabIndex="-1"
          style={{
            backgroundColor: "rgba(0,0,0,0.5)",
          }}
        >
          <div className="modal-dialog">
            <div className="modal-content users-modal">
              <div className="modal-header users-modal-header">
                <h5 className="modal-title">
                  <h5 className="modal-title">
                    {isEditMode ? "Edit User" : "Add New User"}
                  </h5>
                </h5>

                <button
                  className="btn-close"
                  onClick={() => setShowModal(false)}
                ></button>
              </div>

              <div className="modal-body users-modal-body">
                <div className="mb-3">
                  <label className="form-label">Full Name</label>

                  <input
                    type="text"
                    className="form-control"
                    value={newUser.fullName}
                    onChange={(e) =>
                      setNewUser({
                        ...newUser,
                        fullName: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Email</label>

                  <input
                    type="email"
                    className="form-control"
                    value={newUser.email}
                    onChange={(e) =>
                      setNewUser({
                        ...newUser,
                        email: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Password</label>

                  <input
                    type="password"
                    className="form-control"
                    value={newUser.password}
                    onChange={(e) =>
                      setNewUser({
                        ...newUser,
                        password: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Phone Number</label>

                  <input
                    type="text"
                    className="form-control"
                    value={newUser.phoneNumber}
                    onChange={(e) =>
                      setNewUser({
                        ...newUser,
                        phoneNumber: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Role</label>

                  <select
                    className="form-select"
                    value={newUser.role}
                    onChange={(e) =>
                      setNewUser({
                        ...newUser,
                        role: e.target.value,
                      })
                    }
                  >
                    <option value="ADMIN">ADMIN</option>

                    <option value="TRAINER">TRAINER</option>

                    <option value="PARTICIPANT">PARTICIPANT</option>
                  </select>
                </div>
              </div>

              <div className="modal-footer users-modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>

                <button className="btn btn-primary" onClick={handleSaveUser}>
                  {isEditMode ? "Update User" : "Save User"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Users;
