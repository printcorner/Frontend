import React, { useState, useEffect, useMemo, memo } from "react";
import { authFetch } from "../../utils/authFetch";
import { useNavigate } from "react-router-dom";
import { BACKEND_URL } from "../../config";
import { Toaster } from "react-hot-toast";
import toast from "react-hot-toast";

import styles from "./GetAllCustomer.module.css";

/* ================= Customer Card ================= */

const CustomerCard = memo(
  ({
    customer,
    isEditing,
    editData,
    setEditData,
    onEdit,
    onCancel,
    onDelete,
    onSubmit,
    handleAddMoney,
    walletLoading,
  }) => {
    return (
      <li className={styles.customerCard}>
        {isEditing ? (
          <form className={styles.editForm} onSubmit={onSubmit}>
            <input
              type="text"
              value={editData.custName}
              onChange={(e) =>
                setEditData({ ...editData, custName: e.target.value })
              }
              required
            />

            <input
              type="number"
              value={editData.phone}
              onChange={(e) =>
                setEditData({
                  ...editData,
                  phone: Number(e.target.value),
                })
              }
              required
            />

            <input
              type="text"
              value={editData.companyName}
              onChange={(e) =>
                setEditData({ ...editData, companyName: e.target.value })
              }
            />

            <div className={styles.customerActions}>
              <button className={styles.btnSave} type="submit">
                Save
              </button>
              <button
                className={styles.btnCancel}
                type="button"
                onClick={onCancel}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className={styles.customerInfo}>
              <span className={styles.customerName}>{customer.custName}</span>

              <span className={styles.phone}>{customer.phone}</span>

              <span className={styles.customerMeta}>
                {customer.companyName}
              </span>
            </div>

            <div className={styles.walletSection}>
              <span className={styles.wallet}>₹ {customer.walletBalance}</span>

              <button
                className={styles.btnWallet}
                onClick={() => handleAddMoney(customer.id)}
                disabled={walletLoading}
              >
                + Add Money
              </button>
            </div>

            <div className={styles.customerActions}>
              <button className={styles.btnEdit} onClick={onEdit}>
                Edit
              </button>

              <button className={styles.btnDelete} onClick={onDelete}>
                Delete
              </button>
            </div>
          </>
        )}
      </li>
    );
  },
);

/* ================= Confirm Modal ================= */

const ConfirmModal = ({ open, onCancel, onConfirm, deleting }) => {
  if (!open) return null;

  return (
    <div className={styles.confirmOverlay}>
      <div className={styles.confirmModal}>
        <h3>Delete Customer?</h3>
        <p>This action cannot be undone.</p>

        <div className={styles.confirmActions}>
          <button
            className={styles.btnCancel}
            onClick={onCancel}
            disabled={deleting}
          >
            Cancel
          </button>

          <button
            className={styles.btnDelete}
            onClick={onConfirm}
            disabled={deleting}
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
};

const WalletModal = ({ open, onClose, onSubmit, loading }) => {
  const [amount, setAmount] = useState("");

  useEffect(() => {
    if (!open) setAmount("");
  }, [open]);

  if (!open) return null; // ✅ AFTER hooks

  const handleSubmit = () => {
    const num = Number(amount);

    if (isNaN(num) || num <= 0) {
      toast.error("Enter valid amount > 0");
      return;
    }

    onSubmit(num);
    setAmount("");
  };

  return (
    <div className={styles.confirmOverlay}>
      <div className={styles.confirmModal}>
        <h3>Add Wallet Money</h3>

        <input
          type="number"
          placeholder="Enter amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />

        <div className={styles.confirmActions}>
          <button onClick={onClose} disabled={loading}>
            Cancel
          </button>

          <button onClick={handleSubmit} disabled={loading}>
            {loading ? "Adding..." : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ================= Main Component ================= */

const GetAllCustomer = () => {
  const [allCustomer, setAllCustomer] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({
    custName: "",
    phone: 0,
    companyName: "",
  });

  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [walletCustomerId, setWalletCustomerId] = useState(null);
  const [walletLoading, setWalletLoading] = useState(false);

  const navigate = useNavigate();

  const handleAddMoney = (id) => {
    setWalletCustomerId(id);
  };

  const handleWalletSubmit = async (amount) => {
    try {
      setWalletLoading(true);

      const res = await authFetch(
        `${BACKEND_URL}/customer/customer/${walletCustomerId}/wallet`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount,
            type: "credit",
          }),
        },
      );

      if (!res.ok) throw new Error("Failed");

      const data = await res.json();

      setAllCustomer((prev) =>
        prev.map((c) =>
          c.id === walletCustomerId
            ? { ...c, walletBalance: data.walletBalance }
            : c,
        ),
      );

      toast.success("Money added successfully"); // ✅ toast

      setWalletCustomerId(null);
    } catch (err) {
      console.error(err);
      toast.error("Failed to update wallet"); // ✅ toast
    } finally {
      setWalletLoading(false);
    }
  };

  /* ---------------- Fetch ---------------- */

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const res = await authFetch(`${BACKEND_URL}/customer`);
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setAllCustomer(data);
      } catch (err) {
        console.error(err);
        setAllCustomer([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomers();
  }, []);

  /* ---------------- Debounce ---------------- */

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  /* ---------------- Filter ---------------- */

  const filteredCustomers = useMemo(() => {
    if (!debouncedSearch) return allCustomer;

    const s = debouncedSearch.toLowerCase();

    return allCustomer.filter(
      (c) =>
        c.companyName?.toLowerCase().includes(s) ||
        c.custName?.toLowerCase().includes(s),
    );
  }, [debouncedSearch, allCustomer]);

  /* ---------------- Handlers ---------------- */

  const handleEdit = (c) => {
    setEditingId(c.id);
    setEditData({
      custName: c.custName,
      phone: c.phone,
      companyName: c.companyName,
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;

    try {
      setDeleting(true);

      const res = await authFetch(`${BACKEND_URL}/customer/${deleteId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Delete failed");

      setAllCustomer((prev) => prev.filter((c) => c.id !== deleteId));
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await authFetch(`${BACKEND_URL}/customer/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editData),
      });

      if (!res.ok) throw new Error("Update failed");

      const updated = await res.json();

      setAllCustomer((prev) =>
        prev.map((c) => (c.id === updated.id ? updated : c)),
      );

      setEditingId(null);
    } catch (err) {
      console.error(err);
    }
  };

  /* ---------------- Render ---------------- */

  if (loading) return <div>Loading...</div>;

  return (
    <div className={styles.customerContainer}>
      <Toaster position="top-right" />
      <div className={styles.customerHeader}>
        <h2>Customers</h2>

        <button
          className={styles.btnAddCustomer}
          disabled={Boolean(editingId)}
          onClick={() => navigate("/addcustomer")}
        >
          + Add Customer
        </button>
      </div>

      <div className={styles.searchWrapper}>
        <input
          className={styles.searchInput}
          placeholder="Search customer..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {search && (
          <button
            type="button"
            className={styles.searchClear}
            onClick={() => {
              setSearch("");
              setDebouncedSearch("");
            }}
          >
            ✕
          </button>
        )}
      </div>

      <ul className={styles.customerList}>
        {filteredCustomers.length === 0 ? (
          <li className={`${styles.customerCard} ${styles.emptyText}`}>
            No customer found
          </li>
        ) : (
          filteredCustomers.map((c) => (
            <CustomerCard
              key={c.id}
              customer={c}
              handleAddMoney={handleAddMoney}
              walletLoading={walletLoading}
              isEditing={editingId === c.id}
              editData={editData}
              setEditData={setEditData}
              onEdit={() => handleEdit(c)}
              onDelete={() => setDeleteId(c.id)}
              onCancel={() => setEditingId(null)}
              onSubmit={handleEditSubmit}
            />
          ))
        )}
      </ul>

      <ConfirmModal
        open={Boolean(deleteId)}
        onCancel={() => !deleting && setDeleteId(null)}
        onConfirm={handleDeleteConfirm}
        deleting={deleting}
      />
      <WalletModal
        open={Boolean(walletCustomerId)}
        onClose={() => setWalletCustomerId(null)}
        onSubmit={handleWalletSubmit}
        loading={walletLoading}
      />
    </div>
  );
};

export default GetAllCustomer;
