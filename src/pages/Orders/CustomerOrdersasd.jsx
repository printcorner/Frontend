import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authFetch } from "../../utils/authFetch";
import { BACKEND_URL } from "../../config";

export default function CustomerOrders({ customer, onClose }) {
  const [orders, setOrders] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    const res = await authFetch(
      `${BACKEND_URL}/order/with-balance/${customer.customerId}`,
    );
    const data = await res.json();
    setOrders(data.orders || []);
  };

  return (
    <div className="modal">
      <h3>{customer.customerName} Orders</h3>

      {orders.map((o) => (
        <div
          key={o.orderId}
          className="order-card clickable"
          onClick={() => navigate(`/orders/${o.orderId}/edit`)}
        >
          <p>
            <strong>Date:</strong> {new Date(o.order_date).toLocaleDateString()}
          </p>
          <p>
            <strong>Payable:</strong> ₹{o.payable}
          </p>
          <p className="order-balance">
            <strong>Balance:</strong> ₹{o.balance}
          </p>
        </div>
      ))}

      <div className="orders-actions">
        <button className="btn-close" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}

