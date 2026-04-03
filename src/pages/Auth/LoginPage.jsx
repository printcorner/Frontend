import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./LoginPage.module.css";
import { BACKEND_URL } from "../../config";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${BACKEND_URL}/user/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userEmail: email, userPassword: password }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.msg || "Login failed");

      localStorage.setItem("token", data.token);
      localStorage.setItem("role", data.userRole);

      if (data.userRole === "admin") navigate("/admin/dashboard");
      else if (data.userRole === "worker") navigate("/walk");
      else throw new Error("Unauthorized role");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className={styles.loginContainer}>
        <h2 className={styles.loginTitle}>Login</h2>

        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className={`${styles.formGroup} ${styles.passwordGroup}`}>
            <label>Password</label>
            <div className={styles.passwordWrapper}>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className={styles.togglePassword}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? "HIDE" : "SHOW"}
              </button>
            </div>
          </div>

          <button className={styles.btnLogin} type="submit" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>

      {error && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <p>{error}</p>
            <button className={styles.btnClose} onClick={() => setError("")}>
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default LoginPage;
