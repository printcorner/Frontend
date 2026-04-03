import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { authFetch } from "../../utils/authFetch";
import "./OutstandingCustomers.css";
import { BACKEND_URL } from "../../config";

const formatINR = (amount = 0) =>
  Number(amount).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/* ===============================
   Customer Orders Modal (INLINE)
================================ */
function CustomerOrdersModal({ customer, onClose }) {
  const [orders, setOrders] = useState([]);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);

      const res = await authFetch(
        `${BACKEND_URL}/order/with-balance/${customer.customerId}`,
      );

      const data = await res.json();
      setOrders(data.orders || []);
    } catch (err) {
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h3>{customer.customerName} Orders</h3>

        {loading ? (
          <p>Loading orders...</p>
        ) : orders.length === 0 ? (
          <p>No orders found</p>
        ) : (
          orders.map((o) => (
            <div
              key={o.orderId}
              className="order-card clickable"
              onClick={() => navigate(`/orders/${o.orderId}/edit`)}
            >
              <div className="order-row">
                <span>Date</span>
                <span>{new Date(o.order_date).toLocaleDateString()}</span>
              </div>

              <div className="order-row">
                <span>Payable</span>
                <span>₹{formatINR(o.payable)}</span>
              </div>

              <div className="order-row balance">
                <span>Balance</span>
                <span>₹{formatINR(o.balance)}</span>
              </div>
            </div>
          ))
        )}

        <div className="orders-actions">
          <button className="btn-close" onClick={onClose}>
            X
          </button>
        </div>
      </div>
    </div>
  );
}

/* ===============================
   BulkPaymentModal (INLINE)
================================ */
function BulkPaymentModal({ customerId, totalBalance, onClose, onSuccess }) {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const submitBulkPay = async () => {
    const payAmount = Number(amount);

    if (!payAmount || payAmount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }

    if (payAmount > totalBalance) {
      toast.error("Amount cannot exceed outstanding balance");
      return;
    }

    try {
      setLoading(true);

      const res = await authFetch(`${BACKEND_URL}/order/pay`, {
        method: "POST",
        body: JSON.stringify({
          customerId,
          amount: payAmount,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success("Bulk payment successful");
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h3>Bulk Payment</h3>

        <p className="bulk-balance">Outstanding: ₹{formatINR(totalBalance)}</p>

        <input
          type="number"
          placeholder="Enter amount"
          value={amount}
          min="1"
          max={totalBalance}
          disabled={loading}
          onChange={(e) => setAmount(e.target.value)}
        />

        <button
          className="btn-full-bulk"
          disabled={loading}
          onClick={() => setAmount(String(totalBalance))}
        >
          Pay Full Outstanding
        </button>

        <div className="modal-actions">
          <button
            className="btn-cancel-bulk"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            className="btn-pay-bulk"
            onClick={submitBulkPay}
            disabled={loading}
          >
            {loading ? "Paying..." : "Pay"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ===============================
   OutstandingCustomers
================================ */
export default function OutstandingCustomers() {
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [search, setSearch] = useState("");
  const [showBulkPay, setShowBulkPay] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      setLoading(true);

      const res = await authFetch(
        `${BACKEND_URL}/order/customers-with-balance`,
      );
      const data = await res.json();

      setCustomers(data.customers || []);
    } catch (err) {
      toast.error("Failed to load customers");
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter((c) => {
    const text = `${c.customerName} ${c.customerMobile}`.toLowerCase();
    return text.includes(search.toLowerCase());
  });

  const handlePrintCustomer = async (customer) => {
    try {
      const res = await authFetch(
        `${BACKEND_URL}/order/with-balance/${customer.customerId}`,
      );

      const data = await res.json();
      const orders = data.orders || [];

      const printWindow = window.open("", "_blank");
      if (!printWindow) return;

      const ordersHtml = orders
        .map(
          (o, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${new Date(o.order_date).toLocaleDateString()}</td>
          <td class="text-right">₹${formatINR(o.payable)}</td>
          <td class="text-right balance">₹${formatINR(o.balance)}</td>
        </tr>
      `,
        )
        .join("");

      printWindow.document.write(`
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<title>Outstanding Statement</title>

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
}

.wrapper {
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

.statement-meta {
  text-align: right;
  font-size: 13px;
}

.statement-title {
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 1px;
  margin-bottom: 6px;
}

/* ================= CUSTOMER ================= */

.customer-box {
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

.balance {
  font-weight: 600;
  color: #d32f2f;
}

/* ================= TOTAL ================= */

.total-section {
  width: 350px;
  margin-left: auto;
  margin-top: 30px;
  font-size: 16px;
  font-weight: 700;
  border-top: 2px solid #000;
  padding-top: 12px;
  text-align: right;
}

/* ================= FOOTER ================= */

.footer {
  margin-top: 60px;
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

<div class="wrapper">

  <!-- HEADER -->
  <div class="header">

    <div>
      <div class="shop-name">Print Corner</div>
      <div class="shop-details">
        Shop no 04, Guru Ramdas Complex, Jalna Rd<br/>
        Phone: +917020441742
      </div>
    </div>

    <div class="statement-meta">
      <div class="statement-title">ACCOUNT STATEMENT</div>
    
      <div><strong>Date:</strong> ${new Date().toLocaleDateString()}</div>
    </div>

  </div>

  <!-- CUSTOMER -->
  <div class="customer-box">
    <strong>Customer:</strong> ${customer.customerName}<br/>
    <strong>Mobile:</strong> ${customer.customerMobile || "-"}
  </div>

  <!-- TABLE -->
  <table>
    <thead>
      <tr>
        <th style="width:60px;">No</th>
        <th>Date</th>
        <th class="text-right" style="width:150px;">Payable</th>
        <th class="text-right" style="width:150px;">Balance</th>
      </tr>
    </thead>
    <tbody>
      ${
        ordersHtml ||
        "<tr><td colspan='4' style='text-align:center;'>No outstanding orders</td></tr>"
      }
    </tbody>
  </table>

  <!-- TOTAL -->
  <div class="total-section">
    Total Outstanding: ₹${formatINR(customer.balance)}
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
    } catch (err) {
      toast.error("Failed to load orders for printing");
    }
  };

  const handlePrintFullStatement = async (customer) => {
    try {
      const res = await authFetch(
        `${BACKEND_URL}/order/with-balance/${customer.customerId}`,
      );

      const data = await res.json();
      const orders = data.orders || [];

      const printWindow = window.open("", "_blank");
      if (!printWindow) return;

      let fullHtml = "";

      orders.forEach((order, index) => {
        const itemsHtml = (order.items || [])
          .map(
            (item, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${item.product_name || "-"}</td>
          <td class="text-center">${item.rate ?? 0}</td>
          <td class="text-center">${item.quantity ?? 0}</td>
          <td class="text-right">₹${formatINR(
            (item.rate || 0) * (item.quantity || 0),
          )}</td>
        </tr>
      `,
          )
          .join("");

        fullHtml += `
    <div class="order-section">

      <div class="order-header">
        <div>
          
          <strong>Invoice #INV-${String(index + 1).padStart(4, "0")}</strong>
        </div>
        <div>
          ${new Date(order.order_date).toLocaleDateString()}
        </div>
      </div>

      <table class="items-table">
       <thead>
  <tr>
    <th style="width: 60px; padding: 8px 12px; text-align: center;">No</th>
    <th style="padding: 8px 12px; text-align: left;">Description</th>
    <th style="width: 90px; padding: 8px 12px; text-align: center;">Price</th>
    <th style="width: 90px; padding: 8px 12px; text-align: center;">Qty</th>
    <th style="width: 150px; padding: 8px 12px; text-align: right;">Amount</th>
  </tr>
</thead>

        <tbody>
          ${
            itemsHtml ||
            "<tr><td colspan='4' style='text-align:center;'>No items</td></tr>"
          }
        </tbody>
      </table>

      <div class="order-summary">

        <div class="summary-row">
          <span>Sub Total</span>
          <span>₹${formatINR(order.subTotal || 0)}</span>
        </div>

        ${
          order.gstAmount > 0
            ? `
          <div class="summary-row">
            <span>GST (${order.gstPercent || 0}%)</span>
            <span>₹${formatINR(order.gstAmount)}</span>
          </div>`
            : ""
        }

        ${
          order.extraCharges > 0
            ? `
          <div class="summary-row">
            <span>Extra Charges</span>
            <span>₹${formatINR(order.extraCharges)}</span>
          </div>`
            : ""
        }

        ${
          order.discount > 0
            ? `
          <div class="summary-row">
            <span>Discount</span>
            <span>- ₹${formatINR(order.discount)}</span>
          </div>`
            : ""
        }

        <div class="summary-row total-line">
          <span>Total</span>
          <span>₹${formatINR(order.payable)}</span>
        </div>

        <div class="summary-row">
          <span>Paid</span>
          <span>₹${formatINR(order.paidAmount)}</span>
        </div>

        <div class="summary-row balance">
          <span>Balance</span>
          <span>₹${formatINR(order.balance)}</span>
        </div>

      </div>

    </div>
  `;
      });

      printWindow.document.write(`
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<title>Full Account Statement</title>

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
}

.wrapper {
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

.statement-meta {
  text-align: right;
  font-size: 13px;
}

.statement-title {
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 1px;
  margin-bottom: 6px;
}

/* ================= CUSTOMER ================= */

.customer-box {
  margin-bottom: 25px;
  font-size: 14px;
  line-height: 1.8;
}

/* ================= ORDER SECTION ================= */

.order-section {
  margin-bottom: 35px;
  page-break-inside: avoid;
}

.order-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
  font-size: 14px;
  font-weight: 600;
}

/* ================= TABLE ================= */

.items-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.items-table thead {
  background: #f5f5f5;
}

.items-table th {
  padding: 10px;
  text-align: left;
  border-bottom: 2px solid #ddd;
}

.items-table td {
  padding: 8px;
  border-bottom: 1px solid #eee;
}

.text-right { text-align: right; }
.text-center { text-align: center; }

/* ================= SUMMARY ================= */

.order-summary {
  width: 350px;
  margin-left: auto;
  margin-top: 12px;
  font-size: 14px;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
}

.summary-row.balance {
  font-weight: 700;
  color: #d32f2f;
}

/* ================= GRAND TOTAL ================= */

.grand-total {
  margin-top: 40px;
  font-size: 18px;
  font-weight: 700;
  text-align: right;
  border-top: 2px solid #000;
  padding-top: 12px;
}

/* ================= FOOTER ================= */

.footer {
  margin-top: 60px;
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

<div class="wrapper">

  <!-- HEADER -->
  <div class="header">

    <div>
      <div class="shop-name">Print Corner</div>
      <div class="shop-details">
      Shop no 04, Guru Ramdas Complex, Jalna Rd<br/>
        Phone: +917020441742
      </div>
    </div>

    <div class="statement-meta">
      <div class="statement-title">FULL ACCOUNT STATEMENT</div>
     
      <div><strong>Date:</strong> ${new Date().toLocaleDateString()}</div>
    </div>

  </div>

  <!-- CUSTOMER -->
  <div class="customer-box">
    <strong>Customer:</strong> ${customer.customerName}<br/>
    <strong>Mobile:</strong> ${customer.customerMobile || "-"}
  </div>

  ${fullHtml}

  <div class="grand-total">
    Total Outstanding: ₹${formatINR(customer.balance)}
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
    } catch (err) {
      toast.error("Failed to load full statement");
    }
  };

  return (
    <div className="outstanding-container">
      <h2 className="heading">Outstanding Customers</h2>

      <div className="search-wrapper">
        <input
          className="customer-search"
          placeholder="Search by name or mobile..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {search && (
          <button
            className="search-clear-btn"
            onClick={() => setSearch("")}
            type="button"
          >
            ×
          </button>
        )}
      </div>

      {loading ? (
        <p className="empty-text">Loading customers...</p>
      ) : filteredCustomers.length === 0 ? (
        <p className="empty-text">No customers found</p>
      ) : (
        filteredCustomers.map((c) => (
          <div key={c.customerId} className="customer-card">
            <div>
              <p className="customer-name">{c.customerName}</p>
              <p className="customer-meta">{c.customerMobile}</p>
            </div>

            <div className="customer-right">
              <p className="customer-balance">₹{formatINR(c.balance)}</p>

              <div className="customer-actions">
                <button
                  className="btn-view"
                  onClick={() => setSelectedCustomer(c)}
                >
                  View Orders
                </button>

                <button
                  className="btn-bulk-pay"
                  onClick={() => {
                    setSelectedCustomer(c);
                    setShowBulkPay(true);
                  }}
                >
                  Bulk Pay
                </button>

                <button
                  className="btn-print"
                  onClick={() => handlePrintCustomer(c)}
                >
                  Print
                </button>

                <button
                  className="btn-print"
                  onClick={() => handlePrintFullStatement(c)}
                >
                  Print Full Bill
                </button>
              </div>
            </div>
          </div>
        ))
      )}

      {selectedCustomer && !showBulkPay && (
        <CustomerOrdersModal
          customer={selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
        />
      )}

      {showBulkPay && selectedCustomer && (
        <BulkPaymentModal
          customerId={selectedCustomer.customerId}
          totalBalance={selectedCustomer.balance}
          onClose={() => {
            setShowBulkPay(false);
            setSelectedCustomer(null); // 🔥 ADD THIS
          }}
          onSuccess={() => {
            loadCustomers();
            setSelectedCustomer(null); // 🔥 ADD THIS
          }}
        />
      )}
    </div>
  );
}
