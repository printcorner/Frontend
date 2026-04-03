import { useState } from "react";
import { authFetch } from "../../utils/authFetch";
import toast from "react-hot-toast";
import "./BulkPaymentModal.css";
import { BACKEND_URL } from "../../config";
import { useState, useRef } from "react";

export default function BulkPaymentModal({
  customerId,
  totalBalance,
  onClose,
  onSuccess,
}) {
  const [amount, setAmount] = useState("");
  const [isPaying, setIsPaying] = useState(false); // 👈 NEW
  const payingRef = useRef(false);

  const submitBulkPay = async () => {
    if (payingRef.current) return; // 🔒 instant lock
    payingRef.current = true;

    const payAmount = Number(amount);

    if (!payAmount || payAmount <= 0) {
      toast.error("Enter a valid amount");
      payingRef.current = false;
      return;
    }

    if (payAmount > totalBalance) {
      toast.error("Amount cannot exceed outstanding balance");
      payingRef.current = false;
      return;
    }

    try {
      setIsPaying(true);

      const res = await authFetch(`${BACKEND_URL}/order/pay`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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
      payingRef.current = false; // 🔓 unlock
      setIsPaying(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h3>Bulk Payment</h3>

        <p className="bulk-balance">Outstanding: ₹{totalBalance}</p>

        <input
          type="number"
          placeholder="Enter amount"
          value={amount}
          min="1"
          max={totalBalance}
          disabled={isPaying} // 👈 disable input while paying
          onChange={(e) => setAmount(e.target.value)}
        />

        <button
          className="btn-full-bulk"
          onClick={() => setAmount(totalBalance)}
          disabled={isPaying} // 👈 disable
        >
          Pay Full Outstanding
        </button>

        <div className="modal-actions">
          <button
            className="btn-pay-bulk"
            onClick={submitBulkPay}
            disabled={isPaying} // 👈 disable button
          >
            {isPaying ? "Paying..." : "Pay"} {/* 👈 change text */}
          </button>

          <button
            className="btn-cancel-bulk"
            onClick={onClose}
            disabled={isPaying} // optional: prevent closing while paying
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
