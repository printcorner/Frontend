import React, { useState } from "react";
import { authFetch } from "../../utils/authFetch";
import { BACKEND_URL } from "../../config";

import "./DeleteExpenseModal.css";

const DeleteExpenseModal = ({ expense, onCancel, onDeleted }) => {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      const res = await authFetch(`${BACKEND_URL}/expense/${expense._id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Delete failed");

      onDeleted();
      onCancel();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h3>Delete Expense?</h3>
        <p>This action cannot be undone.</p>

        <div className="modal-actions">
          <button onClick={onCancel}>Cancel</button>
          <button onClick={handleDelete} disabled={loading}>
            {loading ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteExpenseModal;
