import React, { useState } from "react";
import { authFetch } from "../../utils/authFetch"; // adjust path if needed
import styles from "./CreateExpense.module.css";

import { BACKEND_URL } from "../../config";

const CreateExpense = () => {
  const [formData, setFormData] = useState({
    expenseAmount: "",
    expenseCategory: "",
    expenseDescription: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await authFetch(`${BACKEND_URL}/expense`, {
        method: "POST",
        body: JSON.stringify({
          expenseAmount: Number(formData.expenseAmount),
          expenseCategory: formData.expenseCategory,
          expenseDescription: formData.expenseDescription,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.msg || "Failed to create expense");
      }

      setSuccess("Expense created successfully!");
      setFormData({
        expenseAmount: "",
        expenseCategory: "",
        expenseDescription: "",
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Create Expense</h2>

      <form onSubmit={handleSubmit} className={styles.form}>
        <input
          type="number"
          name="expenseAmount"
          placeholder="Expense Amount"
          value={formData.expenseAmount}
          onChange={handleChange}
          className={styles.input}
          required
        />

        <select
          name="expenseCategory"
          value={formData.expenseCategory}
          onChange={handleChange}
          className={styles.select}
          required
        >
          <option value="">Select Expense Category</option>
          <option value="paper">Paper & Stationery</option>
          <option value="toner">Toner / Ink</option>
          <option value="maintenance">Machine Repair & Maintenance</option>
          <option value="electricity">Electricity Bill</option>
          <option value="rent">Rent</option>
          <option value="salary">Staff Salary / Wages</option>
          <option value="transport">Transport / Delivery</option>
          <option value="cleaning">Cleaning & Misc</option>
          <option value="other">Other</option>
        </select>

        <textarea
          name="expenseDescription"
          placeholder="Expense Description (optional)"
          value={formData.expenseDescription}
          onChange={handleChange}
          rows={3}
          className={styles.textarea}
        />

        <button type="submit" disabled={loading} className={styles.button}>
          {loading ? "Saving..." : "Create Expense"}
        </button>

        {error && <p className={styles.error}>{error}</p>}
        {success && <p className={styles.success}>{success}</p>}
      </form>
    </div>
  );
};

export default CreateExpense;
