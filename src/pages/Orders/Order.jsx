import { useState } from "react";
import { authFetch } from "../../utils/authFetch"; // adjust path if needed
import { BACKEND_URL } from "../../config";

const Order = ({ products = [], customers = [], isAdmin = false }) => {
  const [customerId, setCustomerId] = useState("");
  const [items, setItems] = useState([]);
  const [gstPercent, setGstPercent] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);
  const [loading, setLoading] = useState(false);

  // ➕ Add product row
  const addItem = () => {
    setItems((prev) => [...prev, { product: "", qty: 1, price: 0, total: 0 }]);
  };

  // 🔄 Update item safely
  const updateItem = (index, field, value) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: value,
      };

      if (field === "qty" || field === "price") {
        updated[index].total =
          Number(updated[index].qty) * Number(updated[index].price);
      }

      return updated;
    });
  };

  // 🧮 Calculations
  const subTotal = items.reduce((sum, i) => sum + i.total, 0);
  const gstAmount = (subTotal * gstPercent) / 100;
  const totalAmount = subTotal + gstAmount;
  const balanceAmount = totalAmount - paidAmount;

  // 🧾 Submit order
  const submitOrder = async () => {
    if (!customerId) {
      alert("Please select customer");
      return;
    }

    if (items.length === 0) {
      alert("Please add at least one item");
      return;
    }

    try {
      setLoading(true);

      const payload = {
        customerId,
        items,
        gstPercent,
        paidAmount,
      };

      const res = await authFetch(`${BACKEND_URL}/order/createOrder`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.msg || "Failed to create order");
      }

      alert("Order created successfully");
      console.log(data);

      // 🔄 Reset form
      setCustomerId("");
      setItems([]);
      setPaidAmount(0);
      setGstPercent(0);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="order-page" style={{ maxWidth: 700, margin: "auto" }}>
      <h2>Create Order</h2>

      {/* 👤 Customer */}
      <label>Customer</label>
      <select
        value={customerId}
        onChange={(e) => setCustomerId(e.target.value)}
      >
        <option value="">Select Customer</option>
        {customers.map((c) => (
          <option key={c._id} value={c._id}>
            {c.custName}
          </option>
        ))}
      </select>

      <hr />

      {/* 🛒 Items */}
      {items.map((item, index) => (
        <div key={index} style={{ marginBottom: 10 }}>
          <select
            value={item.product}
            onChange={(e) => {
              const product = products.find((p) => p._id === e.target.value);
              if (!product) return;

              updateItem(index, "product", product._id);
              updateItem(index, "price", product.price);
            }}
          >
            <option value="">Select Product</option>
            {products.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name}
              </option>
            ))}
          </select>

          <input
            type="number"
            min="1"
            value={item.qty}
            onChange={(e) => updateItem(index, "qty", Number(e.target.value))}
          />

          {isAdmin && (
            <input
              type="number"
              value={item.price}
              onChange={(e) =>
                updateItem(index, "price", Number(e.target.value))
              }
            />
          )}

          <strong style={{ marginLeft: 10 }}>₹{item.total.toFixed(2)}</strong>
        </div>
      ))}

      <button onClick={addItem}>➕ Add Item</button>

      <hr />

      {/* 💰 Summary */}
      <p>Sub Total: ₹{subTotal.toFixed(2)}</p>

      <label>GST %</label>
      <input
        type="number"
        value={gstPercent}
        onChange={(e) => setGstPercent(Number(e.target.value))}
      />

      <p>GST Amount: ₹{gstAmount.toFixed(2)}</p>

      <p>
        <strong>Total: ₹{totalAmount.toFixed(2)}</strong>
      </p>

      <label>Paid Amount</label>
      <input
        type="number"
        value={paidAmount}
        onChange={(e) => setPaidAmount(Number(e.target.value))}
      />

      <p>
        Balance:{" "}
        <strong style={{ color: balanceAmount > 0 ? "red" : "green" }}>
          ₹{balanceAmount.toFixed(2)}
        </strong>
      </p>

      <button disabled={loading} onClick={submitOrder}>
        {loading ? "Saving..." : "Create Order"}
      </button>
    </div>
  );
};

export default Order;
