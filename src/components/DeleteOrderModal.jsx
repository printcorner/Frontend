import styles from "./DeleteOrderModal.module.css";
import { createPortal } from "react-dom";
import { useEffect } from "react";
export default function DeleteOrderModal({ order, onClose, onConfirm }) {
  if (!order) return null;
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, []);

  return createPortal(
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <h3>Delete Order</h3>

        <p className={styles.subtitle}>What should happen to paid amount?</p>

        <div className={styles.infoBox}>
          <span>Paid</span>
          <strong>₹{order.paidAmount}</strong>
        </div>

        <div className={styles.actions}>
          <button className={styles.wallet} onClick={() => onConfirm("1")}>
            Add to Wallet
          </button>

          <button className={styles.refund} onClick={() => onConfirm("2")}>
            Refund
          </button>

          <button className={styles.ignore} onClick={() => onConfirm("3")}>
            Ignore
          </button>
        </div>

        <button className={styles.cancel} onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>,
    document.body,
  );
}
