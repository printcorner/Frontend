import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authFetch } from "../../utils/authFetch";
import toast from "react-hot-toast";
import OrderPaymentModal from "./OrderPaymentModal";
import styles from "./OrdersList.module.css";
import { BACKEND_URL } from "../../config";

/* ✅ Proper INR Formatter */
const formatINR = (amount = 0) =>
  Number(amount).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export default function OrdersList() {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [search, setSearch] = useState("");
  const [payingOrderId, setPayingOrderId] = useState(null);
  const [loading, setLoading] = useState(true);

  const [filterStatus, setFilterStatus] = useState("pending");
  // "pending" | "paid" | "all"

  const navigate = useNavigate();

  const loadOrders = async () => {
    try {
      setLoading(true); // 🔥 start loading

      const res = await authFetch(`${BACKEND_URL}/order`);
      const data = await res.json();

      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error("Failed to load orders");
    } finally {
      setLoading(false); // 🔥 stop loading
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  /* ===============================
     ESC CLEARS SEARCH
  ============================== */
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") setSearch("");
    };

    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  /* ===============================
     FORMAT DATE
  ============================== */
  const formatDate = (date) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  /* ===============================
     FILTER LOGIC
  ============================== */
  const filteredOrders = orders.filter((o) => {
    const name = (o.customer?.custName || o.customerName || "").toLowerCase();

    const matchesSearch = name.includes(search.trim().toLowerCase());

    if (filterStatus === "pending") {
      return o.status !== "paid" && matchesSearch;
    }

    if (filterStatus === "paid") {
      return o.status === "paid" && matchesSearch;
    }

    return matchesSearch;
  });

  const handlePrint = (order) => {
    const printWindow = window.open("", "_blank");

    if (!printWindow) return;

    const itemsHtml = (order.items || [])
      .map(
        (item, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${item.name || item.product?.name || "-"}</td>
          <td class="text-center">${item.price || 0}</td>
          <td class="text-center">${item.qty || 0}</td>
          <td class="text-right">₹${formatINR(item.total || 0)}</td>
        </tr>
      `,
      )
      .join("");

    const balanceClass =
      order.balanceAmount > 0 ? "balance-due" : "balance-clear";

    printWindow.document.write(`
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<title>Invoice</title>

<style>

@page {
  size: A4;
  margin: 20mm;
}

body {
  font-family: "Segoe UI", Arial, sans-serif;
  margin: 0;
  padding: 0;
  color: #222;
  background: #fff;
}

.invoice-wrapper {
  max-width: 850px;
  margin: auto;
}

/* ================= HEADER ================= */

.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  border-bottom: 2px solid #000;
  padding-bottom: 15px;
  margin-bottom: 25px;
}

.shop-name {
  font-size: 26px;
  font-weight: 700;
  margin-bottom: 5px;
}

.shop-details {
  font-size: 13px;
  color: #555;
  line-height: 1.6;
}

.invoice-meta {
  text-align: right;
  font-size: 13px;
}

.invoice-title {
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 1px;
  margin-bottom: 6px;
}

.status-badge {
  display: inline-block;
  padding: 5px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  margin-top: 6px;
}

.paid { background: #e8f5e9; color: #2e7d32; }
.partial { background: #fff8e1; color: #f57c00; }
.pending { background: #ffebee; color: #c62828; }

/* ================= BILL TO ================= */

.bill-box {
  margin-bottom: 25px;
  font-size: 14px;
  line-height: 1.8;
}

/* ================= TABLE ================= */

table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 10px;
  font-size: 14px;
}

thead {
  background: #f5f5f5;
}

th {
  padding: 10px;
  text-align: left;
  border-bottom: 2px solid #ddd;
  font-weight: 600;
}

td {
  padding: 9px;
  border-bottom: 1px solid #eee;
}

.text-right { text-align: right; }
.text-center { text-align: center; }

/* ================= TOTALS ================= */

.totals-section {
  width: 360px;
  margin-left: auto;
  margin-top: 30px;
  font-size: 14px;
}

.totals-row {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
}

.totals-row.total {
  font-size: 17px;
  font-weight: 700;
  border-top: 2px solid #000;
  padding-top: 10px;
}

.balance-due {
  color: #d32f2f;
  font-weight: 700;
}

.balance-clear {
  color: #2e7d32;
  font-weight: 700;
}

/* ================= SIGNATURE ================= */

.signature {
  margin-top: 70px;
  text-align: right;
  font-size: 13px;
}

/* ================= FOOTER ================= */

.footer {
  margin-top: 50px;
  text-align: center;
  font-size: 12px;
  color: #777;
}

@media print {
  body {
    -webkit-print-color-adjust: exact;
  }
}

</style>
</head>

<body>

<div class="invoice-wrapper">

  <!-- HEADER -->
  <div class="header">

    <div>
      <div class="shop-name">Print Corner</div>
      <div class="shop-details">
        Shop no 04, Guru Ramdas Complex, Jalna Rd<br/>
        Phone: +917020441742
      </div>
    </div>

    <div class="invoice-meta">
      <div class="invoice-title">INVOICE</div>
      <div><strong>Date:</strong> ${formatDate(order.createdAt)}</div>
      <div class="status-badge ${order.status}">
        ${order.status.toUpperCase()}
      </div>
    </div>

  </div>

  <!-- BILL TO -->
  <div class="bill-box">
    <strong>Bill To:</strong><br/>
    ${order.customer?.custName || order.customerName || "-"}
  </div>

  <!-- ITEMS -->
  <table>
    <thead>
      <tr>
        <th style="width:60px;">No</th>
        <th>Description</th>
        <th style="width:90px;" class="text-center">Price</th>
        <th style="width:90px;" class="text-center">Qty</th>
        <th style="width:120px;" class="text-right">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${
        itemsHtml ||
        "<tr><td colspan='4' style='text-align:center;'>No items</td></tr>"
      }
    </tbody>
  </table>

  <!-- TOTALS -->
  <div class="totals-section">

    <div class="totals-row">
      <span>Sub Total</span>
      <span>₹${formatINR(order.subTotal || 0)}</span>
    </div>

    ${
      order.gstAmount > 0
        ? `<div class="totals-row">
             <span>GST (${order.gstPercent || 0}%)</span>
             <span>₹${formatINR(order.gstAmount)}</span>
           </div>`
        : ""
    }

    ${
      order.extraCharges > 0
        ? `<div class="totals-row">
             <span>Extra Charges</span>
             <span>₹${formatINR(order.extraCharges)}</span>
           </div>`
        : ""
    }

    ${
      order.discount > 0
        ? `<div class="totals-row">
             <span>Discount</span>
             <span>- ₹${formatINR(order.discount)}</span>
           </div>`
        : ""
    }

    <div class="totals-row total">
      <span>Total</span>
      <span>₹${formatINR(order.totalAmount)}</span>
    </div>

    <div class="totals-row">
      <span>Paid</span>
      <span>₹${formatINR(order.paidAmount)}</span>
    </div>

    <div class="totals-row ${balanceClass}">
      <span>Balance</span>
      <span>₹${formatINR(order.balanceAmount)}</span>
    </div>

  </div>

 

  

</div>

<script>
window.onload = function() {
  window.print();
  window.onafterprint = function() {
    window.close();
  }
}
</script>

</body>
</html>
  `);

    printWindow.document.close();
  };

  return (
    <div className={styles["orders-container"]}>
      {/* ================= HEADER ================= */}
      <div className={styles["orders-header"]}>
        <h2 className={styles.title}>Orders</h2>

        <button
          className={styles.btnDashboard}
          onClick={() => navigate("/admin/dashboard")}
        >
          Dashboard
        </button>
      </div>

      <div className={styles.toggleWrapper}>
        <button
          className={filterStatus === "pending" ? styles.activeToggle : ""}
          onClick={() => setFilterStatus("pending")}
        >
          Pending
        </button>

        <button
          className={filterStatus === "paid" ? styles.activeToggle : ""}
          onClick={() => setFilterStatus("paid")}
        >
          Paid
        </button>

        <button
          className={filterStatus === "all" ? styles.activeToggle : ""}
          onClick={() => setFilterStatus("all")}
        >
          All
        </button>
      </div>

      {/* ================= SEARCH ================= */}
      <div className={styles["search-wrapper"]}>
        <input
          type="text"
          className={styles["orders-search"]}
          placeholder="Search by customer name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {search && (
          <button
            type="button"
            className={styles["search-clear-btn"]}
            onClick={() => setSearch("")}
          >
            ×
          </button>
        )}
      </div>

      {!loading && filteredOrders.length === 0 && (
        <p className={styles["orders-empty"]}>No orders found</p>
      )}

      {/* ================= LIST ================= */}
      {/* ================= LIST ================= */}
      {loading ? (
        <div className={styles["orders-loading"]}>Loading orders...</div>
      ) : filteredOrders.length === 0 ? (
        <p className={styles["orders-empty"]}>No orders found</p>
      ) : (
        filteredOrders.map((o) => (
          <div key={o._id} className={styles["order-card"]}>
            {/* Header */}
            <div className={styles["order-header"]}>
              <div className={styles["order-customer"]}>
                {o.customer?.custName || o.customerName || "—"}
              </div>

              <span
                className={`${styles["order-status"]} ${
                  styles[o.status || "pending"]
                }`}
              >
                {o.status || "pending"}
              </span>
            </div>

            {/* Meta */}
            <div className={styles["order-meta"]}>
              <span>Date: {formatDate(o.createdAt)}</span>
            </div>

            {/* Amounts */}
            <div className={styles["order-amounts"]}>
              <div className={`${styles["amount-box"]} ${styles.total}`}>
                <span>Total</span>
                <strong>₹{formatINR(o.totalAmount)}</strong>
              </div>

              <div className={`${styles["amount-box"]} ${styles.paid}`}>
                <span>Paid</span>
                <strong>₹{formatINR(o.paidAmount)}</strong>
              </div>

              <div className={`${styles["amount-box"]} ${styles.balance}`}>
                <span>Balance</span>
                <strong>₹{formatINR(o.balanceAmount)}</strong>
              </div>
            </div>

            {/* Actions */}
            <div className={styles["order-actions"]}>
              {o.balanceAmount > 0 && (
                <button
                  className={styles["btn-pay"]}
                  disabled={payingOrderId === o._id}
                  onClick={() => {
                    setPayingOrderId(o._id);
                    setSelectedOrder(o);
                  }}
                >
                  {payingOrderId === o._id ? "Processing..." : "Pay"}
                </button>
              )}

              <button
                className={styles["btn-edit"]}
                onClick={() => navigate(`/orders/${o._id}/edit`)}
              >
                Edit
              </button>

              <button
                className={styles["btn-print"]}
                onClick={() => handlePrint(o)}
              >
                Print
              </button>
            </div>
          </div>
        ))
      )}

      {/* ================= MODAL ================= */}
      {selectedOrder && (
        <OrderPaymentModal
          order={selectedOrder}
          onClose={() => {
            setSelectedOrder(null);
            setPayingOrderId(null);
          }}
          onSuccess={() => {
            setPayingOrderId(null);
            window.scrollTo({ top: 0, behavior: "smooth" });
            setSelectedOrder(null);
            loadOrders(); // 🔥 refresh immediately
          }}
        />
      )}
    </div>
  );
}
