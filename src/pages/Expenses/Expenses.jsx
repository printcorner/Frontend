import React, { useEffect, useMemo, useState } from "react";
import { authFetch } from "../../utils/authFetch";
import DeleteExpenseModal from "./DeleteExpenseModal";
import { useNavigate } from "react-router-dom";
import "./Expenses.css";
import { BACKEND_URL } from "../../config";

const Expenses = () => {
  // ---------- Base ----------
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ---------- Edit / Delete ----------
  const [editExpense, setEditExpense] = useState(null);
  const [deleteExpense, setDeleteExpense] = useState(null);

  // ---------- Search ----------
  const [search, setSearch] = useState("");

  // ---------- Date filter ----------
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [viewMode, setViewMode] = useState("filter"); // start empty

  // ---------- Filtered results ----------
  const [filteredResult, setFilteredResult] = useState(null);
  const [revenueSummary, setRevenueSummary] = useState(null);
  const [dateError, setDateError] = useState("");

  const [filterLoading, setFilterLoading] = useState(false);

  const profit =
    revenueSummary && filteredResult
      ? revenueSummary.total - filteredResult.totalExpense
      : 0;

  const navigate = useNavigate();

  const formatINR = (amount = 0) =>
    Number(amount).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  // ---------- Fetch all expenses ----------
  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const res = await authFetch(`${BACKEND_URL}/expense`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.msg || "Failed to fetch expenses");
      setExpenses(data.expenses);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  // ---------- Search ----------
  const filteredExpenses = useMemo(() => {
    return expenses.filter((exp) =>
      exp.expenseCategory.toLowerCase().includes(search.toLowerCase()),
    );
  }, [expenses, search]);

  // ---------- FILTER (EXPENSE + REVENUE) ----------
  const handleFetchBetweenDates = async () => {
    if (!start || !end) {
      setDateError("Please select start and end dates");
      return;
    }

    try {
      setDateError("");
      setFilterLoading(true); // 🔥 start loading
      setViewMode("filter");

      const expRes = await authFetch(
        `${BACKEND_URL}/expense/totalExpenseBet?start=${start}&end=${end}`,
      );
      const expData = await expRes.json();
      if (!expRes.ok) throw new Error(expData.error || "Expense fetch failed");

      const revRes = await authFetch(
        `${BACKEND_URL}/revenue?startDate=${start}&endDate=${end}`,
      );
      const revData = await revRes.json();
      if (!revRes.ok)
        throw new Error(revData.message || "Revenue fetch failed");

      setFilteredResult(expData);
      setRevenueSummary({
        total: revData.totalRevenue,
        count: revData.count,
      });
    } catch (err) {
      setDateError(err.message);
    } finally {
      setFilterLoading(false); // 🔥 stop loading
    }
  };

  const clearFilter = () => {
    setStart("");
    setEnd("");
    setFilteredResult(null);
    setRevenueSummary(null);
    setEditExpense(null);
    setDateError("");
  };

  return (
    <div className="expense-container">
      <div className="expense-header">
        <h2>Expenses</h2>

        <button
          className="btn-add-expense"
          disabled={!!filteredResult}
          title={
            filteredResult
              ? "Clear filter to add new expense"
              : "Add new expense"
          }
          onClick={() => navigate("/expense/create")}
        >
          + Add Expense
        </button>
      </div>

      {/* 🔍 Search (only for ALL view) */}
      {viewMode === "all" && (
        <input
          type="text"
          placeholder="Search by category..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-input"
        />
      )}

      {/* 📅 Date Filter */}
      <div className="date-filter">
        <input
          type="date"
          value={start}
          onChange={(e) => setStart(e.target.value)}
        />
        <input
          type="date"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
        />
        <button onClick={handleFetchBetweenDates} disabled={filterLoading}>
          {filterLoading ? "Filtering..." : "Filter"}
        </button>
      </div>

      {filterLoading && <p style={{ marginTop: "10px" }}>Fetching data...</p>}

      {filteredResult && (
        <div className="filter-chip">
          📅 {new Date(start).toLocaleDateString()} →{" "}
          {new Date(end).toLocaleDateString()}
          <button onClick={clearFilter}>×</button>
        </div>
      )}

      {dateError && <p className="error-text">{dateError}</p>}

      {/* ===== EMPTY STATE (NO EXPENSES) ===== */}
      {!loading && !filteredResult && expenses.length === 0 && (
        <div className="empty-state">
          <p>No expenses found</p>
          <p>Click “Add Expense” to create your first expense.</p>
        </div>
      )}

      {/* ================= FILTER VIEW ================= */}
      {viewMode === "filter" && filteredResult && (
        <>
          <div className="summary-box">
            <h3>Total Expense: ₹{formatINR(filteredResult.totalExpense)}</h3>
            <h3>Total Revenue: ₹{formatINR(revenueSummary?.total)}</h3>

            <h3
              className={
                profit >= 0 ? "profit-text profit" : "profit-text loss"
              }
            >
              {profit >= 0 ? "Profit" : "Loss"}: ₹{formatINR(Math.abs(profit))}
            </h3>

            {/* <p>Expense Records: {filteredResult.expenses.length}</p>
            <p>Revenue Records: {revenueSummary?.count || 0}</p> */}
          </div>

          <ul className="expense-list">
            {filteredResult.expenses.map((exp) => {
              const isEditing = editExpense?._id === exp._id;

              return (
                <li
                  key={exp._id}
                  className={`expense-card ${isEditing ? "editing" : ""}`}
                >
                  {isEditing ? (
                    <form
                      className="expense-edit-form"
                      onSubmit={async (e) => {
                        e.preventDefault();
                        try {
                          const res = await authFetch(
                            `${BACKEND_URL}/expense/${exp._id}`,
                            {
                              method: "PUT",
                              body: JSON.stringify({
                                expenseAmount: Number(
                                  editExpense.expenseAmount,
                                ),
                                expenseCategory: editExpense.expenseCategory,
                                expenseDescription:
                                  editExpense.expenseDescription,
                              }),
                            },
                          );

                          if (!res.ok) throw new Error("Update failed");

                          setEditExpense(null);
                          handleFetchBetweenDates();
                        } catch (err) {
                          alert(err.message);
                        }
                      }}
                    >
                      <input
                        type="number"
                        value={editExpense.expenseAmount}
                        onChange={(e) =>
                          setEditExpense({
                            ...editExpense,
                            expenseAmount: e.target.value,
                          })
                        }
                        required
                      />

                      <input
                        type="text"
                        value={editExpense.expenseCategory}
                        onChange={(e) =>
                          setEditExpense({
                            ...editExpense,
                            expenseCategory: e.target.value,
                          })
                        }
                        required
                      />

                      <textarea
                        rows={2}
                        value={editExpense.expenseDescription}
                        onChange={(e) =>
                          setEditExpense({
                            ...editExpense,
                            expenseDescription: e.target.value,
                          })
                        }
                      />

                      <div className="expense-edit-actions">
                        <button
                          type="button"
                          className="btn-cancel"
                          onClick={() => setEditExpense(null)}
                        >
                          Cancel
                        </button>
                        <button type="submit" className="btn-save">
                          Save
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div>
                        <strong>{exp.expenseCategory}</strong> — ₹
                        {formatINR(exp.expenseAmount)}
                        <p>{exp.expenseDescription}</p>
                        <small style={{ color: "#6b7280" }}>
                          {new Date(
                            exp.createdAtFormatted,
                          ).toLocaleDateString()}{" "}
                          {new Date(exp.createdAtFormatted).toLocaleTimeString(
                            [],
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )}
                        </small>
                      </div>

                      <div className="actions">
                        <button onClick={() => setEditExpense(exp)}>
                          Edit
                        </button>
                        <button onClick={() => setDeleteExpense(exp)}>
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}

      {/* ================= ALL VIEW ================= */}

      {/* 🗑️ Delete */}
      {deleteExpense && (
        <DeleteExpenseModal
          expense={deleteExpense}
          onCancel={() => setDeleteExpense(null)}
          onDeleted={() =>
            viewMode === "filter" ? handleFetchBetweenDates() : fetchExpenses()
          }
        />
      )}
    </div>
  );
};

export default Expenses;
