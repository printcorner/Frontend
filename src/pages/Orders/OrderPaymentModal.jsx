import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { authFetch } from "../../utils/authFetch";
import toast from "react-hot-toast";
import "./OrderPaymentModal.css";
import { BACKEND_URL } from "../../config";

export default function OrderPaymentModal({ order, onClose, onSuccess }) {
  const [amount, setAmount] = useState("");
  const balance = Number(order.balanceAmount);
  const [isPaying, setIsPaying] = useState(false);

  /* ===============================
     LOCK SCROLL + ESC SUPPORT
  ============================== */
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleEsc);

    return () => {
      document.body.style.overflow = "auto";
      window.removeEventListener("keydown", handleEsc);
    };
  }, [onClose]);

  const submitPayment = async () => {
    if (isPaying) return; // prevent double click

    const payAmount = Number(amount);

    if (!payAmount || payAmount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }

    if (payAmount > balance) {
      toast.error("Amount cannot exceed balance");
      return;
    }

    try {
      setIsPaying(true);

      const res = await authFetch(`${BACKEND_URL}/order/${order._id}/pay`, {
        method: "POST",
        body: JSON.stringify({ amount: payAmount }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.msg);

      toast.success("Payment recorded");
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsPaying(false);
    }
  };

  const modalUI = (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Pay Order</h3>

        <p className="modal-balance">Balance: ₹{balance}</p>

        <input
          type="number"
          value={amount}
          min="1"
          max={balance}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Enter amount"
        />

        <button className="btn-full-pay" onClick={() => setAmount(balance)}>
          Pay Full Balance
        </button>

        <div className="modal-actions">
          <button
            className="btn-cancel-modal"
            onClick={onClose}
            disabled={isPaying}
          >
            Cancel
          </button>
          <button
            className="btn-pay-modal"
            onClick={submitPayment}
            disabled={isPaying}
          >
            {isPaying ? "Paying..." : "Pay"}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalUI, document.body);
}
