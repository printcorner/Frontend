import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { authFetch } from "../../utils/authFetch";
import toast from "react-hot-toast";
import "./EditOrder.css";
import { nanoid } from "nanoid";
import { BACKEND_URL } from "../../config";

export default function EditOrder() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [manualTotal, setManualTotal] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    fetchOrder();
    fetchProducts();
  }, []);

  useEffect(() => {
    setManualTotal(false);
  }, [order?.items]);

  const fetchOrder = async () => {
    try {
      const res = await authFetch(`${BACKEND_URL}/order/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.msg);

      setOrder({
        ...data,
        gstApplied: data.gstPercent > 0, // ✅ correct logic
        items: (data.items || []).map((i) => ({
          ...i,
          rowId: nanoid(),
          product: typeof i.product === "object" ? i.product : null,
        })),
      });

      setIsHydrated(true); // ✅ VERY IMPORTANT
    } catch (err) {
      toast.error(err.message);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await authFetch(`${BACKEND_URL}/product`);
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load products");
    }
  };

  /* Quantity */
  // const incrementQty = (index) => {
  //   setOrder((prev) => {
  //     const items = [...prev.items];
  //     items[index].qty += 1;
  //     return { ...prev, items };
  //   });
  // };

  const incrementQty = (index) => {
    setOrder((prev) => {
      const item = prev.items[index];
      const product = products.find((p) => p.id === item.product.id);

      if (product?.trackStock && item.qty + 1 > product.stock) {
        toast.error(`Only ${product.stock} ${product.name} left`);
        return prev;
      }

      const items = [...prev.items];
      items[index].qty += 1;
      return { ...prev, items };
    });
  };

  const decrementQty = (index) => {
    setOrder((prev) => {
      const items = [...prev.items];
      items[index].qty -= 1;
      return { ...prev, items: items.filter((i) => i.qty > 0) };
    });
  };

  /* ❌ Remove item */
  const removeItem = (index) => {
    setOrder((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  /* Add product */
  const addProduct = (product) => {
    setOrder((prev) => {
      const idx = prev.items.findIndex((i) => i.product?.id === product.id);

      if (idx !== -1) {
        const items = [...prev.items];
        items[idx].qty += 1;
        return { ...prev, items };
      }

      return {
        ...prev,
        items: [
          ...prev.items,
          {
            product,
            qty: 1,
            price: product.price, // ✅ store price at time of edit
            rowId: nanoid(), // ✅ NEW ROW KEY
          },
        ],
      };
    });
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()),
  );

  /* Totals */
  const subTotal =
    order?.items.reduce((sum, i) => sum + (i.price || 0) * i.qty, 0) || 0;

  const gstAmount = order?.gstApplied ? subTotal * 0.18 : 0;
  const totalAmount = subTotal + gstAmount;

  const calculateAdjustment = (manualTotal) => {
    const subTotal =
      order.items.reduce((sum, i) => sum + (i.price || 0) * i.qty, 0) || 0;

    const gstAmount = order.gstApplied ? subTotal * 0.18 : 0;

    const calculatedTotal = subTotal + gstAmount;
    const adjustment = manualTotal - calculatedTotal;

    return {
      extraCharges: adjustment > 0 ? adjustment : 0,
      discount: adjustment < 0 ? Math.abs(adjustment) : 0,
    };
  };

  useEffect(() => {
    if (!order || !isHydrated || manualTotal) return;

    const subTotal =
      order.items.reduce((sum, i) => sum + (i.price || 0) * i.qty, 0) || 0;

    const gstAmount = order.gstApplied ? subTotal * 0.18 : 0;

    const extraCharges = Number(order.extraCharges || 0);
    const discount = Number(order.discount || 0);

    const finalTotal = subTotal + gstAmount + extraCharges - discount;

    setOrder((prev) => ({
      ...prev,
      totalAmount: Number(finalTotal.toFixed(2)),
    }));
  }, [order?.items, order?.gstApplied, isHydrated]);

  const saveChanges = async () => {
    setLoading(true);
    try {
      const payload = {
        items: order.items.map((i) => ({
          product: i.product.id || i.product._id, // ✅ id-first
          qty: i.qty,
          price: i.price, // ✅ send edited price
        })),
        gstApplied: order.gstApplied,
        totalAmount: order.totalAmount, // ✅ optional manual override
        extraCharges: order.extraCharges || 0,
        discount: order.discount || 0,
      };

      const res = await authFetch(`${BACKEND_URL}/order/edit/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.msg);

      toast.success("Order updated");
      // navigate("/orderlist");
      navigate("/admin/dashboard", { replace: true });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!order) return <p>Loading...</p>;

  return (
    <div className="edit-order-overlay">
      <div className="edit-order-modal">
        <div className="order-header">
          <div>{order.customer?.custName || "—"}</div>

          <button
            className="btn-close"
            onClick={() => navigate("/admin/dashboard", { replace: true })}
          >
            ✕
          </button>
        </div>

        {/* Items */}
        <h3>Items</h3>

        {order.items.length === 0 && <p>No items</p>}

        <div className="order-items-list">
          {order.items.map((item, idx) => (
            <div key={item.rowId} className="order-item">
              <div className="item-left">
                <strong>{item.product?.name}</strong>
                <div className="price-edit">
                  ₹
                  <input
                    type="number"
                    value={item.price}
                    min="0"
                    onChange={(e) => {
                      const newPrice = Number(e.target.value);

                      setOrder((prev) => {
                        const items = [...prev.items];
                        items[idx].price = newPrice;
                        return { ...prev, items };
                      });
                    }}
                  />
                </div>
              </div>

              <div className="qty-controls">
                <button onClick={() => decrementQty(idx)}>-</button>
                <span>{item.qty}</span>
                <button onClick={() => incrementQty(idx)}>+</button>

                <span className="item-total">
                  ₹{(item.qty * (item.price || 0)).toFixed(2)}
                </span>

                <button className="btn-remove" onClick={() => removeItem(idx)}>
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Product search */}
        <h3>Add Products</h3>

        <div className="product-search-wrapper">
          <input
            className="product-search"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {search && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={() => setSearch("")}
            >
              ×
            </button>
          )}
        </div>

        {search.trim() !== "" && (
          <div className="product-list">
            {filteredProducts.length === 0 && (
              <p className="no-products">No products found</p>
            )}

            {filteredProducts.map((p) => (
              <button
                key={p._id}
                className="product-chip"
                onClick={() => addProduct(p)}
              >
                {p.name}
              </button>
            ))}
          </div>
        )}

        <hr />

        {/* GST */}
        <div className="gst-toggle-row">
          <span className="gst-label">Apply GST (18%)</span>

          <label className="switch">
            <input
              type="checkbox"
              checked={!!order.gstApplied}
              onChange={() =>
                setOrder((prev) => ({
                  ...prev,
                  gstApplied: !prev.gstApplied,
                }))
              }
            />
            <span className="slider"></span>
          </label>
        </div>

        <div className="totals">
          <p>Subtotal: ₹{subTotal.toFixed(2)}</p>
          <p>GST: ₹{gstAmount.toFixed(2)}</p>
          {/* <p className="grand-total">Total: ₹{totalAmount.toFixed(2)}</p> */}

          {order.extraCharges > 0 && (
            <p style={{ color: "red" }}>
              Extra Charges: +₹{order.extraCharges.toFixed(2)}
            </p>
          )}

          {order.discount > 0 && (
            <p style={{ color: "green" }}>
              Discount: −₹{order.discount.toFixed(2)}
            </p>
          )}

          <label>
            Total Amount
            <input
              type="number"
              value={order.totalAmount}
              onChange={(e) => {
                const manualTotal = Number(e.target.value);
                setManualTotal(true);

                const { extraCharges, discount } =
                  calculateAdjustment(manualTotal);

                setOrder((p) => ({
                  ...p,
                  totalAmount: manualTotal,
                  extraCharges,
                  discount,
                }));
              }}
            />
          </label>
        </div>

        <button
          className="btn-save-order"
          onClick={saveChanges}
          disabled={loading}
        >
          {loading ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
