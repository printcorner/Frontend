import React, { useState, useEffect } from "react";
import { authFetch } from "../../utils/authFetch";
import "./RegisterPage.css";
import { BACKEND_URL } from "../../config";

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    userName: "",
    userEmail: "",
    userPassword: "",
    userRole: "worker",
  });

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    oldPassword: "",
    newPassword: "",
  });

  const [selectedPasswordUserId, setSelectedPasswordUserId] = useState(null);

  // ✅ Fetch all users
  const fetchUsers = async () => {
    try {
      const res = await authFetch(`${BACKEND_URL}/user`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.msg);

      setUsers(data.users);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // ✅ Register User
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await authFetch(`${BACKEND_URL}/user/register`, {
        method: "POST",
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.msg);

      setSuccess("User registered successfully!");
      setFormData({
        userName: "",
        userEmail: "",
        userPassword: "",
        userRole: "worker",
      });

      fetchUsers(); // 🔥 refresh list
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Delete User
  const handleDelete = async (id) => {
    try {
      const res = await authFetch(`${BACKEND_URL}/user/${id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.msg);

      setUsers(users.filter((user) => user._id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  const confirmDelete = async () => {
    try {
      const res = await authFetch(`${BACKEND_URL}/user/${selectedUserId}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.msg);

      setUsers(users.filter((user) => user._id !== selectedUserId));
      setShowModal(false);
      setSelectedUserId(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const handlePasswordChange = async () => {
    try {
      const res = await authFetch(`${BACKEND_URL}/user/change-password`, {
        method: "PUT",
        body: JSON.stringify(passwordData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.msg);

      setSuccess("Password changed successfully");
      setShowPasswordModal(false);
      setPasswordData({ oldPassword: "", newPassword: "" });
      setSelectedPasswordUserId(null);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="register-container">
      <h2>Register</h2>

      <form onSubmit={handleSubmit} className="register-form">
        <input
          type="text"
          name="userName"
          placeholder="Username"
          value={formData.userName}
          onChange={handleChange}
          required
        />

        <input
          type="email"
          name="userEmail"
          placeholder="Email"
          value={formData.userEmail}
          onChange={handleChange}
          required
        />

        <input
          type="password"
          name="userPassword"
          placeholder="Password"
          value={formData.userPassword}
          onChange={handleChange}
          required
        />

        <button type="submit" disabled={loading}>
          {loading ? "Registering..." : "Register"}
        </button>

        {error && <p className="error-text">{error}</p>}
        {success && <p className="success-text">{success}</p>}
      </form>

      {/* 🔥 Users List */}
      <div className="users-list">
        <h3>All Users</h3>

        {users.length === 0 ? (
          <p>No users found</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user._id}>
                  <td>{user.userName}</td>
                  <td>{user.userEmail}</td>
                  <td>{user.userRole}</td>
                  <td>
                    <div className="action-buttons">
                      {/* ✅ Show Change Password ONLY for admin */}
                      {user.userRole === "admin" && (
                        <button
                          className="change-pass-btn"
                          onClick={() => {
                            setSelectedPasswordUserId(user._id);
                            setShowPasswordModal(true);
                          }}
                        >
                          Change Password
                        </button>
                      )}

                      {/* ✅ Show Delete ONLY for non-admin users */}
                      {user.userRole !== "admin" && (
                        <button
                          className="delete-btn"
                          onClick={() => {
                            setSelectedUserId(user._id);
                            setShowModal(true);
                          }}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Confirm Delete</h3>
            <p>Are you sure you want to delete this user?</p>

            <div className="modal-buttons">
              <button
                className="cancel-btn"
                onClick={() => {
                  setShowModal(false);
                  setSelectedUserId(null);
                }}
              >
                Cancel
              </button>

              <button className="confirm-btn" onClick={confirmDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {showPasswordModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Change Password</h3>

            <input
              type="password"
              placeholder="Old Password"
              value={passwordData.oldPassword}
              onChange={(e) =>
                setPasswordData({
                  ...passwordData,
                  oldPassword: e.target.value,
                })
              }
            />

            <input
              type="password"
              placeholder="New Password"
              value={passwordData.newPassword}
              onChange={(e) =>
                setPasswordData({
                  ...passwordData,
                  newPassword: e.target.value,
                })
              }
            />

            <div className="modal-buttons">
              <button
                className="cancel-btn"
                onClick={() => setShowPasswordModal(false)}
              >
                Cancel
              </button>

              <button className="confirm-btn" onClick={handlePasswordChange}>
                Update
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegisterPage;
