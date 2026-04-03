import { useEffect, useState } from "react";
import { authFetch } from "../../utils/authFetch";
import toast, { Toaster } from "react-hot-toast";
import styles from "./CreateOrder.module.css";

import { BACKEND_URL } from "../../config";

export default function CreateOrder() {
  /* =====================
     Helpers
  ===================== */
  const GST_RATE = 0.18;
  const toPaise = (r) => Math.round(r * 100);
  const toRupees = (p) => (p / 100).toFixed(2);

  /* =====================
     Products
  ===================== */
  const [allProducts, setAllProducts] = useState([]);
  const [productQuery, setProductQuery] = useState("");
  const [filteredProducts, setFilteredProducts] = useState([]);

  /* =====================
     Customers
  ===================== */
  const [allCustomers, setAllCustomers] = useState([]);
  const [customerQuery, setCustomerQuery] = useState("");
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const [fullPaid, setFullPaid] = useState(true);

  /* =====================
     Cart
  ===================== */
  const [cart, setCart] = useState([]);

  /* =====================
     Totals
  ===================== */
  const [applyGST, setApplyGST] = useState(true);
  const [subtotalPaise, setSubtotalPaise] = useState(0);
  const [calculatedTotalPaise, setCalculatedTotalPaise] = useState(0);
  const [grandTotalPaise, setGrandTotalPaise] = useState(0);
  const [grandTotalInput, setGrandTotalInput] = useState("0.00");
  const [manualTotal, setManualTotal] = useState(false);

  const [paidAmount, setPaidAmount] = useState("");
  const [loading, setLoading] = useState(false);

  /* =====================
     Initial Fetch
  ===================== */
  useEffect(() => {
    fetchProducts();
    fetchCustomers();
  }, []);

  useEffect(() => {
    if (fullPaid) {
      setPaidAmount(toRupees(grandTotalPaise));
    }
  }, [fullPaid, grandTotalPaise]);

  const fetchProducts = async () => {
    try {
      const res = await authFetch(`${BACKEND_URL}/product`);
      setAllProducts(await res.json());
    } catch {
      toast.error("Failed to load products");
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await authFetch(`${BACKEND_URL}/customer`);
      setAllCustomers(await res.json());
    } catch {
      toast.error("Failed to load customers");
    }
  };

  /* =====================
     Local Search
  ===================== */
  const searchCustomers = (q) => {
    setCustomerQuery(q);
    if (!q.trim()) return setFilteredCustomers([]);

    const v = q.toLowerCase();
    setFilteredCustomers(
      allCustomers.filter(
        (c) =>
          c.custName.toLowerCase().includes(v) ||
          (c.phone && c.phone.includes(v)),
      ),
    );
  };

  const searchProducts = (q) => {
    setProductQuery(q);
    if (!q.trim()) return setFilteredProducts([]);

    const v = q.toLowerCase();
    setFilteredProducts(
      allProducts.filter((p) => p.name.toLowerCase().includes(v)),
    );
  };

  /* =====================
     Cart Logic (NO LOSS)
  ===================== */
  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product === product.id);

      if (existing) {
        if (product.trackStock && existing.qty + 1 > product.stock) {
          toast.error(`Only ${product.stock} ${product.name} left`);
          return prev;
        }
        return prev.map((i) =>
          i.product === product.id ? { ...i, qty: i.qty + 1 } : i,
        );
      }

      if (product.trackStock && product.stock <= 0) {
        toast.error(`${product.name} out of stock`);
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
    const product = allProducts.find((p) => p.id === id);
    const item = cart.find((i) => i.product === id);

    if (product.trackStock && item.qty + 1 > product.stock) {
      toast.error(`Only ${product.stock} ${product.name} left`);
      return;
    }

    updateQty(id, item.qty + 1);
  };

  const decrementQty = (id) => {
    const item = cart.find((i) => i.product === id);
    updateQty(id, item.qty - 1);
  };

  const updateQty = (id, qty) => {
    if (qty <= 0) setCart((prev) => prev.filter((i) => i.product !== id));
    else
      setCart((prev) =>
        prev.map((i) => (i.product === id ? { ...i, qty } : i)),
      );
  };

  /* =====================
     Totals Calculation
  ===================== */
  useEffect(() => {
    const subtotal = cart.reduce((s, i) => s + toPaise(i.price) * i.qty, 0);

    setSubtotalPaise(subtotal);

    const baseTotal = applyGST
      ? subtotal + Math.round(subtotal * GST_RATE)
      : subtotal;

    setCalculatedTotalPaise(baseTotal);

    if (!manualTotal) {
      setGrandTotalPaise(baseTotal);
      setGrandTotalInput(toRupees(baseTotal));
    }
  }, [cart, applyGST, manualTotal]);

  useEffect(() => {
    setManualTotal(false);
  }, [cart]);

  const adjustmentPaise = grandTotalPaise - calculatedTotalPaise;
  const extraChargesPaise = adjustmentPaise > 0 ? adjustmentPaise : 0;
  const discountPaise = adjustmentPaise < 0 ? Math.abs(adjustmentPaise) : 0;

  /* =====================
     Submit Order
  ===================== */
  const submitOrder = async () => {
    if (!selectedCustomer) return toast.error("Customer required");
    if (cart.length === 0) return toast.error("Cart empty");

    setLoading(true);
    const toastId = toast.loading("Creating order...");

    try {
      const payload = {
        customerId: selectedCustomer.id,

        items: cart.map((i) => ({
          product: i.product,
          name: i.name,
          qty: i.qty,
          price: i.price,
          total: i.price * i.qty,
        })),

        subTotal: subtotalPaise / 100,
        gstPercent: applyGST ? 18 : 0,
        gstAmount: (calculatedTotalPaise - subtotalPaise) / 100,

        extraCharges: extraChargesPaise / 100,
        discount: discountPaise / 100,

        totalAmount: grandTotalPaise / 100,
        paidAmount: Number(paidAmount || 0),
      };

      const res = await authFetch(`${BACKEND_URL}/order/createOrder`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.msg || "Order failed");

      toast.success("Order created");
      setCart([]);
      setSelectedCustomer(null);
      fetchProducts();
    } catch (err) {
      toast.error(err.message);
    } finally {
      toast.dismiss(toastId);
      setLoading(false);
    }
  };

  /* =====================
     Render
  ===================== */
  return (
    <div className={styles.container}>
      <Toaster position="top-right" />

      <h2 className={styles.title}>Create Order</h2>

      {/* ================= CUSTOMER ================= */}
      <h3 className={styles.sectionTitle}>Customer</h3>

      {!selectedCustomer ? (
        <>
          <div className={styles.searchWrapper}>
            <input
              className={styles.searchInput}
              placeholder="Search customer..."
              value={customerQuery}
              onChange={(e) => searchCustomers(e.target.value)}
            />

            {customerQuery && (
              <button
                type="button"
                className={styles.clearBtn}
                onClick={() => {
                  setCustomerQuery("");
                  setFilteredCustomers([]);
                }}
              >
                ✕
              </button>
            )}
          </div>

          <div>
            {filteredCustomers.map((c) => (
              <div
                className={styles.listItem}
                key={c.id}
                onClick={() => {
                  setSelectedCustomer(c);
                  setFilteredCustomers([]);
                  setCustomerQuery("");
                }}
              >
                <strong>{c.custName}</strong> — {c.phone}
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className={styles.listItem}>
          <strong>{selectedCustomer.custName}</strong>
          <button onClick={() => setSelectedCustomer(null)}>Change</button>
        </div>
      )}

      <hr className={styles.divider} />

      {/* ================= PRODUCTS ================= */}
      <h3 className={styles.sectionTitle}>Products</h3>

      <div className={styles.searchWrapper}>
        <input
          placeholder="Search product..."
          className={styles.searchInput}
          value={productQuery}
          onChange={(e) => searchProducts(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && filteredProducts.length > 0) {
              addToCart(filteredProducts[0]);
              setProductQuery("");
              setFilteredProducts([]);
            }
          }}
          autoFocus
        />

        {productQuery && (
          <button
            type="button"
            className={styles.clearBtn}
            onClick={() => {
              setProductQuery("");
              setFilteredProducts([]);
            }}
          >
            ✕
          </button>
        )}
      </div>

      <div>
        {filteredProducts.slice(0, 6).map((p) => (
          <div
            key={p.id}
            className={styles.listItem}
            onClick={() => {
              addToCart(p);
              setProductQuery("");
              setFilteredProducts([]);
            }}
          >
            {p.name} — ₹{p.price} • Stock: {p.trackStock ? p.stock : "∞"}
          </div>
        ))}
      </div>

      <hr className={styles.divider} />

      {/* ================= CART ================= */}
      <h3 className={styles.sectionTitle}>Cart</h3>

      <div className={styles.cartScroll}>
        {cart.map((item) => (
          <div key={item.product} className={styles.posItem}>
            {/* Top Row */}
            <div className={styles.posRowTop}>
              <span className={styles.posName}>{item.name}</span>

              <span className={styles.posTotal}>
                ₹{(item.qty * item.price).toFixed(2)}
              </span>
            </div>

            {/* Bottom Row */}
            <div className={styles.posRowBottom}>
              {/* Price */}
              <div className={styles.priceBox}>
                <span className={styles.priceSymbol}>₹</span>
                <input
                  type="number"
                  step="0.01"
                  className={styles.priceInput}
                  value={item.price}
                  onChange={(e) => {
                    const newPrice = Number(e.target.value);
                    setCart((prev) =>
                      prev.map((i) =>
                        i.product === item.product
                          ? { ...i, price: newPrice }
                          : i,
                      ),
                    );
                  }}
                />
              </div>

              {/* Quantity */}
              <div className={styles.qtyWrapper}>
                <button
                  className={styles.qtyBtn}
                  onClick={() => decrementQty(item.product)}
                >
                  −
                </button>

                <input
                  type="number"
                  min="1"
                  className={styles.qtyInput}
                  value={item.qty}
                  onChange={(e) =>
                    updateQty(item.product, Number(e.target.value))
                  }
                />

                <button
                  className={styles.qtyBtn}
                  onClick={() => incrementQty(item.product)}
                >
                  +
                </button>
              </div>

              {/* Remove */}
              <button
                className={styles.removeBtn}
                onClick={() =>
                  setCart((prev) =>
                    prev.filter((i) => i.product !== item.product),
                  )
                }
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>

      <hr className={styles.divider} />

      {/* ================= SUMMARY ================= */}
      <div className={styles.summary}>
        <div className={styles.summaryRow}>
          <span>Subtotal</span>
          <span>₹{toRupees(subtotalPaise)}</span>
        </div>

        <div className={styles.summaryRow}>
          <span>Apply GST (18%)</span>
          <label className={styles.switch}>
            <input
              type="checkbox"
              checked={applyGST}
              onChange={() => setApplyGST(!applyGST)}
            />
            <span className={styles.slider}></span>
          </label>
        </div>

        <div className={styles.summaryRow}>
          <span>GST</span>
          <span>₹{toRupees(calculatedTotalPaise - subtotalPaise)}</span>
        </div>

        <div className={styles.summaryRow}>
          <span>Full Paid</span>
          <label className={styles.switch}>
            <input
              type="checkbox"
              checked={fullPaid}
              onChange={(e) => {
                setFullPaid(e.target.checked);
                if (!e.target.checked) setPaidAmount("");
              }}
            />
            <span className={styles.slider}></span>
          </label>
        </div>

        <div className={styles.summaryRow}>
          <span>Paid Amount</span>
          <input
            type="number"
            value={paidAmount}
            disabled={fullPaid}
            onChange={(e) => setPaidAmount(e.target.value)}
          />
        </div>

        {discountPaise > 0 && (
          <div className={styles.summaryRow} style={{ color: "green" }}>
            Discount −₹{toRupees(discountPaise)}
          </div>
        )}

        {extraChargesPaise > 0 && (
          <div className={styles.summaryRow} style={{ color: "red" }}>
            Extra Charges +₹{toRupees(extraChargesPaise)}
          </div>
        )}

        <div className={styles.summaryRow}>
          <span>Grand Total</span>
          <input
            type="number"
            step="0.01"
            value={grandTotalInput}
            onChange={(e) => {
              setManualTotal(true);
              setGrandTotalInput(e.target.value);
              setGrandTotalPaise(toPaise(Number(e.target.value)));
            }}
          />
        </div>

        <div className={styles.summaryRow}>
          <span className={styles.summaryStrong}>Final Total</span>
          <span className={styles.summaryStrong}>
            ₹{toRupees(grandTotalPaise)}
          </span>
        </div>

        <button
          className={styles.primaryBtn}
          onClick={submitOrder}
          disabled={loading}
        >
          {loading ? "Creating..." : "Create Order"}
        </button>
      </div>
    </div>
  );
}
