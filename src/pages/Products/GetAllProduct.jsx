import React, { useState, useEffect, useMemo, memo } from "react";
import { authFetch } from "../../utils/authFetch";
import { useNavigate } from "react-router-dom";
import { BACKEND_URL } from "../../config";

import styles from "./GetAllProduct.module.css";

/* -------------------- Product Card -------------------- */
const ProductCard = memo(
  ({
    product,
    isEditing,
    editData,
    setEditData,
    onEdit,
    onCancel,
    onDelete,
    onSubmit,
    saving,
  }) => {
    return (
      <li className={styles.productCard}>
        {isEditing ? (
          <form className={styles.editForm} onSubmit={onSubmit}>
            <input
              type="text"
              value={editData.name}
              onChange={(e) =>
                setEditData({ ...editData, name: e.target.value })
              }
              required
            />

            <input
              type="number"
              value={editData.price}
              onChange={(e) =>
                setEditData({
                  ...editData,
                  price: Number(e.target.value),
                })
              }
              required
            />

            <label className={styles.editCheckbox}>
              <input
                type="checkbox"
                checked={editData.trackStock}
                onChange={(e) =>
                  setEditData({
                    ...editData,
                    trackStock: e.target.checked,
                  })
                }
              />
              Track Stock
            </label>

            {editData.trackStock && (
              <input
                type="number"
                value={editData.stock}
                onChange={(e) =>
                  setEditData({
                    ...editData,
                    stock: Number(e.target.value),
                  })
                }
                placeholder="Stock"
              />
            )}

            <div className={styles.productActions}>
              <button
                className={styles.btnSave}
                type="submit"
                disabled={saving}
              >
                {saving ? "Saving..." : "Save"}
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
            <div className={styles.productInfo}>
              <span className={styles.productName}>{product.name}</span>
              <span className={styles.price}>₹{product.price}</span>

              {product.trackStock && (
                <span
                  className={`${styles.stockBadge} ${
                    product.stock <= 5 ? styles.lowStock : ""
                  }`}
                >
                  Stock: {product.stock}
                </span>
              )}
            </div>

            <div className={styles.productActions}>
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

/* -------------------- Confirm Modal -------------------- */
const ConfirmModal = ({ open, onCancel, onConfirm, deleting }) => {
  useEffect(() => {
    if (!open) return;

    const handleKey = (e) => {
      if (e.key === "Enter") onConfirm();
      if (e.key === "Escape") onCancel();
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onCancel, onConfirm]);

  if (!open) return null;

  return (
    <div className={styles.confirmOverlay}>
      <div className={styles.confirmModal}>
        <h3>Delete Product?</h3>
        <p>This action cannot be undone.</p>

        <div className={styles.confirmActions}>
          <button className={styles.btnCancel} onClick={onCancel}>
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

/* -------------------- Main Component -------------------- */
const GetAllProduct = () => {
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({
    name: "",
    price: 0,
    trackStock: false,
    stock: 0,
  });

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const LOW_STOCK_LIMIT = 5;
  const [deleteId, setDeleteId] = useState(null);
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  const navigate = useNavigate();

  /* Fetch products */
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await authFetch(`${BACKEND_URL}/product`);
        const data = await res.json();

        console.log("Products API response:", data);

        if (Array.isArray(data)) {
          setAllProducts(data);
        } else if (Array.isArray(data.products)) {
          setAllProducts(data.products);
        } else {
          setAllProducts([]);
        }
      } catch (err) {
        console.error("Fetch products failed:", err);
        setAllProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  /* Debounce search */
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const lowStockProducts = useMemo(() => {
    if (!Array.isArray(allProducts)) return [];
    return allProducts.filter(
      (p) => p.trackStock && p.stock <= LOW_STOCK_LIMIT,
    );
  }, [allProducts]);

  const filteredProducts = useMemo(() => {
    let list = showLowStockOnly ? lowStockProducts : allProducts;
    if (!debouncedSearch) return list;

    return list.filter((p) =>
      p.name.toLowerCase().includes(debouncedSearch.toLowerCase()),
    );
  }, [debouncedSearch, allProducts, lowStockProducts, showLowStockOnly]);

  const handleEdit = (p) => {
    setEditingId(p.id);
    setEditData({
      name: p.name,
      price: p.price,
      trackStock: p.trackStock || false,
      stock: p.stock || 0,
    });
  };

  const handleDeleteConfirm = async () => {
    setDeleting(true);
    try {
      await authFetch(`${BACKEND_URL}/product/${deleteId}`, {
        method: "DELETE",
      });

      setAllProducts((prev) => prev.filter((p) => p.id !== deleteId));
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    const payload = {
      name: editData.name,
      price: editData.price,
      trackStock: editData.trackStock,
      ...(editData.trackStock && { stock: editData.stock }),
    };

    try {
      const res = await authFetch(`${BACKEND_URL}/product/${editingId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      const updated = await res.json();

      setAllProducts((prev) =>
        prev.map((p) => (p.id === updated.id ? updated : p)),
      );

      setEditingId(null);

      // 🔥 FIX low stock issue
      setShowLowStockOnly(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className={styles.productsContainer}>
      <div className={styles.productsHeader}>
        <h2>Products</h2>

        <button
          className={styles.btnAddProduct}
          disabled={Boolean(editingId)}
          onClick={() => navigate("/addproduct")}
        >
          + Add Product
        </button>
      </div>

      {lowStockProducts.length > 0 && (
        <div className={styles.lowStockBar}>
          <span className={styles.lowStockAlert}>
            ⚠️ Low Stock: {lowStockProducts.length}
          </span>

          <button
            className={styles.btnLowStock}
            onClick={() => setShowLowStockOnly((v) => !v)}
          >
            {showLowStockOnly ? "Show All" : "View Low Stock"}
          </button>
        </div>
      )}

      <div className={styles.searchWrapper}>
        <input
          className={styles.searchInput}
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button className={styles.clearBtn} onClick={() => setSearch("")}>
            ✕
          </button>
        )}
      </div>

      <ul className={styles.productList}>
        {filteredProducts.length === 0 ? (
          <li className={styles.emptyText}>No products found</li>
        ) : (
          filteredProducts.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              isEditing={editingId === p.id}
              editData={editData}
              setEditData={setEditData}
              onEdit={() => handleEdit(p)}
              onDelete={() => setDeleteId(p.id)}
              onCancel={() => setEditingId(null)}
              onSubmit={handleEditSubmit}
              saving={saving}
            />
          ))
        )}
      </ul>

      <ConfirmModal
        open={Boolean(deleteId)}
        onCancel={() => setDeleteId(null)}
        onConfirm={handleDeleteConfirm}
        deleting={deleting}
      />
    </div>
  );
};

export default GetAllProduct;
