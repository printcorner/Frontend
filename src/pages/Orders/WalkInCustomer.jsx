import { useEffect, useState } from "react";
import { authFetch } from "../../utils/authFetch";
import styles from "./WalkInCustomer.module.css";

import { useNavigate } from "react-router-dom";
import { BACKEND_URL } from "../../config";

import toast, { Toaster } from "react-hot-toast";

export default function WalkInCustomer() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);

  const [subtotalPaise, setSubtotalPaise] = useState(0);
  const [grandTotalPaise, setGrandTotalPaise] = useState(0);
  const [applyGST, setApplyGST] = useState(false);

  const GST_RATE = 0.18;

  const [grandTotalInput, setGrandTotalInput] = useState("0.00");
  const [calculatedTotalPaise, setCalculatedTotalPaise] = useState(0);
  const [manualTotal, setManualTotal] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");

  const toPaise = (rupees) => Math.round(rupees * 100);
  const toRupees = (paise) => (paise / 100).toFixed(2);

  const navigate = useNavigate();

  const handleLogout = () => {
    // clear auth data
    localStorage.removeItem("token");
    localStorage.removeItem("role");

    toast.success("Logged out");

    navigate("/login", { replace: true });
  };

  /* =====================
     Fetch products
  ===================== */
  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await authFetch(`${BACKEND_URL}/product`);

      const data = await res.json();
      setProducts(data);
    } catch (err) {
      toast.error("Failed to load products");
    }
  };

  /* =====================
     Totals calculation
  ===================== */
  useEffect(() => {
    const calculatedSubtotalPaise = cart.reduce(
      (sum, item) => sum + toPaise(item.price) * item.qty,
      0,
    );

    setSubtotalPaise(calculatedSubtotalPaise);

    const baseTotalPaise = applyGST
      ? calculatedSubtotalPaise + Math.round(calculatedSubtotalPaise * GST_RATE)
      : calculatedSubtotalPaise;

    setCalculatedTotalPaise(baseTotalPaise);

    // ✅ Only auto-fill when NOT manual
    if (!manualTotal) {
      setGrandTotalPaise(baseTotalPaise);
      setGrandTotalInput(baseTotalPaise === 0 ? "" : toRupees(baseTotalPaise));
    }
  }, [cart, applyGST, manualTotal]);

  useEffect(() => {
    setManualTotal(false);
  }, [cart]);

  const adjustmentPaise = grandTotalPaise - calculatedTotalPaise;
  const extraChargesPaise = adjustmentPaise > 0 ? adjustmentPaise : 0;
  const discountPaise = adjustmentPaise < 0 ? Math.abs(adjustmentPaise) : 0;

  const filteredProducts = Array.isArray(products)
    ? products.filter((p) =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    : [];

  /* =====================
     Cart actions
  ===================== */
  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product === product.id);

      if (existing) {
        if (product.trackStock && existing.qty + 1 > product.stock) {
          toast.error(`Only ${product.stock} ${product.name} left in stock`);
          return prev;
        }

        return prev.map((i) =>
          i.product === product.id ? { ...i, qty: i.qty + 1 } : i,
        );
      }

      if (product.trackStock && product.stock <= 0) {
        toast.error(`${product.name} is out of stock`);
        return prev;
      }

      return [
        ...prev,
        {
          product: product.id,
          name: product.name,
          price: product.price,
          qty: 1,
        },
      ];
    });
  };

  const incrementQty = (id) => {
    const item = cart.find((i) => i.product === id);
    if (!item) return;

    const product = products.find((p) => p.id === id);

    // If product doesn't exist (service / quick order), allow increment
    if (!product || !product.trackStock) {
      updateQty(id, item.qty + 1);
      return;
    }

    if (item.qty + 1 > product.stock) {
      toast.error(`Only ${product.stock} ${product.name} left in stock`);
      return;
    }

    updateQty(id, item.qty + 1);
  };

  const decrementQty = (id) => {
    const item = cart.find((i) => i.product === id);
    if (!item) return;

    updateQty(id, item.qty - 1);
  };

  const updateQty = (id, qty) => {
    if (qty <= 0) {
      setCart((prev) => prev.filter((i) => i.product !== id));
    } else {
      setCart((prev) =>
        prev.map((i) => (i.product === id ? { ...i, qty } : i)),
      );
    }
  };

  const validateStock = () => {
    for (const item of cart) {
      const product = products.find((p) => p.id === item.product);

      // Skip stock check for services / quick orders
      if (!product || !product.trackStock) continue;

      if (item.qty > product.stock) {
        return `Insufficient stock for ${product.name}`;
      }
    }
    return null;
  };

  const addQuickOrder = () => {
    if (!serviceProduct) {
      toast.error("Service product not available yet");
      return;
    }

    setCart([
      {
        product: serviceProduct.id,
        name: serviceProduct.name,
        price: serviceProduct.price,
        qty: 1,
      },
    ]);

    // 👇 FORCE manual mode
    setManualTotal(true);
    setGrandTotalInput(""); // EMPTY (not 0.00)
    setGrandTotalPaise(0); // internal value only
  };

  /* =====================
     Submit order
  ===================== */
  const submitOrder = async () => {
    if (cart.length === 0) return;

    const stockError = validateStock();
    if (stockError) {
      toast.error(stockError);
      return;
    }

    const toastId = toast.loading("Processing sale...");
    setLoading(true);

    try {
      const payload = {
        items: cart.map((i) => ({ product: i.product, qty: i.qty })),
        finalTotal: grandTotalPaise / 100,
        gstApplied: applyGST,
      };

      const res = await authFetch(`${BACKEND_URL}/order/quickSale`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.msg || "Sale failed");

      toast.success(`Sale completed • ₹${grandTotalPaise / 100}`);
      setCart([]);
    } catch (err) {
      toast.error(err.message);
    } finally {
      toast.dismiss(toastId);
      setLoading(false);
    }
  };

  const serviceProduct = products.find(
    (p) => p.name?.trim().toLowerCase() === "service",
  );

  /* =====================
     Render
  ===================== */
  return (
    <div className={styles.productsContainer}>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 2500,
          style: { fontWeight: 600 },
        }}
      />

      <div className={styles.walkinHeader}>
        <h2>Walk-in Customer</h2>

        <button className={styles.btnLogout} onClick={handleLogout}>
          Logout
        </button>
      </div>

      {/* Search */}
      <div className={styles.searchWrapper}>
        <input
          type="text"
          placeholder="Search product..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={styles.searchInput}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter" && filteredProducts.length > 0) {
              addToCart(filteredProducts[0]);
              setSearchTerm("");
            }
          }}
        />

        {searchTerm && (
          <button
            type="button"
            className={styles.searchClear}
            onClick={() => setSearchTerm("")}
            aria-label="Clear search"
          >
            ✕
          </button>
        )}

        {searchTerm && filteredProducts.length > 0 && (
          <div className={styles.searchDropdown}>
            {filteredProducts.slice(0, 6).map((p) => (
              <div
                key={p.id}
                className={styles.searchItem}
                onClick={() => {
                  addToCart(p);
                  setSearchTerm("");
                }}
              >
                <div>
                  <div className={styles.searchName}>{p.name}</div>
                  <div className={styles.searchMeta}>
                    ₹{p.price} • Stock: {p.trackStock ? p.stock : "∞"}
                  </div>
                </div>
                <span className={styles.searchAdd}>＋</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cart */}
      <div className={styles.cartPanel}>
        <div className={styles.cartHeader}>
          <h3 className={styles.cartHeading}>Cart</h3>

          <button
            type="button"
            className={styles.btnQuickOrder}
            onClick={addQuickOrder}
            disabled={!serviceProduct}
            title={
              serviceProduct ? "Add Service" : "Service product not loaded"
            }
          >
            ⚡
          </button>
        </div>

        <div className={styles.cartItems}>
          {cart.length === 0 && <p>No items</p>}

          {cart.map((item) => (
            <div key={item.product} className={styles.cartItem}>
              <strong>{item.name}</strong>

              <div className={styles.qtyRow}>
                <button onClick={() => decrementQty(item.product)}>-</button>

                <input
                  className={styles.qtyInput}
                  type="number"
                  min="1"
                  value={item.qty}
                  onChange={(e) =>
                    updateQty(item.product, Number(e.target.value))
                  }
                />

                <button onClick={() => incrementQty(item.product)}>+</button>

                <button
                  onClick={() =>
                    setCart((prev) =>
                      prev.filter((i) => i.product !== item.product),
                    )
                  }
                >
                  Remove
                </button>
              </div>

              <p>Subtotal: ₹{item.qty * item.price}</p>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className={styles.cartSummary}>
          <div className={styles.gstToggleRow}>
            <span>Apply GST (18%)</span>

            <button
              type="button"
              className={`${styles.toggle} ${applyGST ? styles.active : ""}`}
              onClick={() => {
                setManualTotal(false);
                setApplyGST((g) => !g);
              }}
            >
              <span className={styles.thumb} />
            </button>
          </div>

          <p>
            <span>Subtotal</span>
            <span>₹{toRupees(subtotalPaise)}</span>
          </p>

          <p>
            <span>GST</span>
            <span>
              ₹{toRupees(applyGST ? calculatedTotalPaise - subtotalPaise : 0)}
            </span>
          </p>

          {discountPaise > 0 && (
            <p style={{ color: "green" }}>
              Discount −₹{toRupees(discountPaise)}
            </p>
          )}

          {extraChargesPaise > 0 && (
            <p style={{ color: "red" }}>
              Extra Charges +₹{toRupees(extraChargesPaise)}
            </p>
          )}

          <label>
            Grand Total
            <input
              type="number"
              min="0"
              step="0.01"
              value={grandTotalInput}
              onChange={(e) => {
                setManualTotal(true);
                setGrandTotalInput(e.target.value);

                const num = Number(e.target.value);
                if (!isNaN(num)) {
                  setGrandTotalPaise(toPaise(num));
                }
              }}
              style={{ width: 120, marginLeft: 8 }}
            />
          </label>

          <p>
            <strong>Final Total: ₹{toRupees(grandTotalPaise)}</strong>
          </p>
        </div>

        <button
          className={styles.completeSale}
          onClick={submitOrder}
          disabled={loading}
        >
          {loading ? "Processing..." : "Complete Sale"}
        </button>
      </div>
    </div>
  );
}
