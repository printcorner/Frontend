import { useEffect, useState, useRef } from "react";
import { authFetch } from "../../utils/authFetch";
import { BACKEND_URL } from "../../config";
import { useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import notificationSound from "../../assets/notification.mp3";
import { socket } from "../../socket";

import {
  FiPrinter,
  FiTrash2,
  FiChevronDown,
  FiChevronUp,
} from "react-icons/fi";

import styles from "./Admin.module.css";

export default function Admin() {
  const [orders, setOrders] = useState([]);
  const [editedTotals, setEditedTotals] = useState({});
  const [expanded, setExpanded] = useState({});
  const [countBump, setCountBump] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [editedFilePrices, setEditedFilePrices] = useState({});

  const [modal, setModal] = useState({
    open: false,
    message: "",
    onConfirm: null,
  });

  const navigate = useNavigate();
  const audioRef = useRef(null);

  const [loading, setLoading] = useState(true);

  /* ===============================
     TOGGLE ORDER
  ============================== */
  const toggleOrder = (id) => {
    setExpanded((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));

    // remove new badge
    const stored = JSON.parse(localStorage.getItem("newOrders") || "[]");
    const updated = stored.filter((orderId) => orderId !== id);
    localStorage.setItem("newOrders", JSON.stringify(updated));

    setOrders((prev) =>
      prev.map((o) => (o._id === id ? { ...o, isNew: false } : o)),
    );
  };

  /* ===============================
     AUDIO UNLOCK
  ============================== */
  useEffect(() => {
    const unlockAudio = () => {
      if (audioRef.current) {
        audioRef.current
          .play()
          .then(() => {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
          })
          .catch(() => {});
      }
      window.removeEventListener("click", unlockAudio);
    };

    window.addEventListener("click", unlockAudio);
    return () => window.removeEventListener("click", unlockAudio);
  }, []);

  const playSound = () => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = 0;
    audioRef.current.play().catch(() => {});
  };

  /* ===============================
     CALCULATE TOTAL
  ============================== */
  // const calculateTotal = (files = []) => {
  //   return files
  //     .filter(
  //       (f) =>
  //         ["pdf", "image"].includes(f.type) &&
  //         typeof f.pageCount === "number" &&
  //         typeof f.price === "number",
  //     )
  //     .reduce((sum, f) => sum + f.price, 0);
  // };

  const calculateTotal = (order) => {
    if (!order?.files) return 0;

    return order.files.reduce((sum, f, index) => {
      const editedPrice = editedFilePrices[order._id]?.[index];

      const basePrice = typeof f.price === "number" ? f.price : 0;

      const finalPrice = editedPrice !== undefined ? editedPrice : basePrice;

      return sum + finalPrice;
    }, 0);
  };

  /* ===============================
     FETCH LIVE ORDERS
  ============================== */
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);

        const res = await authFetch(`${BACKEND_URL}/api/admin/liveorders`);

        const data = await res.json();

        const storedNew = JSON.parse(localStorage.getItem("newOrders") || "[]");

        const normalized = Array.isArray(data)
          ? data.map((o) => ({
              ...o,
              files: Array.isArray(o.files) ? o.files : [],
              isNew: storedNew.includes(o._id),
            }))
          : [];

        setOrders(normalized);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  /* ===============================
     SOCKET NEW ORDER
  ============================== */
  useEffect(() => {
    socket.on("new-order", (order) => {
      playSound();

      const existing = JSON.parse(localStorage.getItem("newOrders") || "[]");
      localStorage.setItem(
        "newOrders",
        JSON.stringify([order._id, ...existing]),
      );

      setOrders((prev) => [{ ...order, isNew: true }, ...prev]);

      setCountBump(true);
      setTimeout(() => setCountBump(false), 300);

      toast.success(`New Order received - ${order.customerName}`, {
        position: "bottom-right",
        autoClose: 4000,
      });
    });

    return () => socket.off("new-order");
  }, []);

  /* ===============================
     SOCKET ORDER DELETED
  ============================== */
  useEffect(() => {
    socket.on("order-deleted", (orderId) => {
      setOrders((prev) => prev.filter((o) => o._id !== orderId));
    });

    return () => socket.off("order-deleted");
  }, []);

  /* ===============================
   KEYBOARD SUPPORT FOR MODAL
================================ */
  useEffect(() => {
    if (!modal.open) return;

    const handleKeyDown = (e) => {
      if (e.key === "Enter" && modal.open) {
        e.preventDefault();
        if (!isDeleting && modal.onConfirm) {
          modal.onConfirm();
        }
      }

      if (e.key === "Escape") {
        e.preventDefault();
        closeModal();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [modal.open, modal.onConfirm, isDeleting]);

  /* ===============================
     MODAL HELPERS
  ============================== */
  const openConfirm = (message, onConfirm) => {
    setModal({ open: true, message, onConfirm });
  };

  const closeModal = () => {
    setModal({ open: false, message: "", onConfirm: null });
  };

  /* ===============================
     DELETE FILE
  ============================== */
  // const deleteFile = (orderId, fileIndex) => {
  //   openConfirm("Delete this file?", async () => {
  //     try {
  //       setIsDeleting(true);

  //       const res = await authFetch(
  //         `${BACKEND_URL}/api/admin/orders/${orderId}/file/${fileIndex}`,
  //         { method: "DELETE" },
  //       );

  //       const data = await res.json();

  //       setOrders((prev) =>
  //         prev.map((o) => (o._id === orderId ? data.order : o)),
  //       );
  //     } catch (err) {
  //       toast.error("Failed to delete file");
  //     } finally {
  //       setIsDeleting(false);
  //       closeModal();
  //     }
  //   });
  // };

  const deleteFile = (orderId, fileId) => {
    openConfirm("Delete this file?", async () => {
      try {
        setIsDeleting(true);

        const res = await authFetch(
          `${BACKEND_URL}/api/admin/orders/${orderId}/file/${fileId}`,
          { method: "DELETE" },
        );

        const data = await res.json();

        setOrders((prev) =>
          prev.map((o) => (o._id === orderId ? data.order : o)),
        );
      } catch (err) {
        toast.error("Failed to delete file");
      } finally {
        setIsDeleting(false);
        closeModal();
      }
    });
  };

  /* ===============================
     DELETE ORDER
  ============================== */
  const deleteOrder = (orderId) => {
    openConfirm("Delete this entire order and all files?", async () => {
      try {
        setIsDeleting(true);

        await authFetch(`${BACKEND_URL}/api/admin/orders/${orderId}`, {
          method: "DELETE",
        });

        setOrders((prev) => prev.filter((o) => o._id !== orderId));
      } catch (err) {
        toast.error("Failed to delete order");
      } finally {
        setIsDeleting(false);
        closeModal();
      }
    });
  };

  /* ===============================
     PRINT FILE
  ============================== */
  const printFile = (fileUrl, type) => {
    if (type === "pdf" || type === "image") {
      const win = window.open(fileUrl, "_blank");
      if (!win) return;
      win.onload = () => {
        win.focus();
        win.print();
      };
    } else {
      const viewerUrl =
        "https://docs.google.com/viewerng/viewer?url=" +
        encodeURIComponent(fileUrl) +
        "&print=true";

      window.open(viewerUrl, "_blank");
    }
  };

  /* ===============================
     SAVE AS QUICK SALE
  ============================== */
  const saveQuickSale = async (order) => {
    try {
      const finalTotal =
        editedTotals[order._id] !== undefined
          ? editedTotals[order._id]
          : calculateTotal(order);

      if (finalTotal < 0) {
        toast.error("Invalid total");
        return;
      }

      const res = await authFetch(`${BACKEND_URL}/order/quickSale`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [],
          finalTotal,
          gstApplied: false,
        }),
      });

      if (!res.ok) {
        throw new Error("Quick sale failed");
      }

      toast.success("Quick sale saved successfully");

      // ✅ ASK FOR DELETE AFTER PAYMENT
      openConfirm("Payment saved. Delete this order?", async () => {
        try {
          setIsDeleting(true);

          await authFetch(`${BACKEND_URL}/api/admin/orders/${order._id}`, {
            method: "DELETE",
          });

          setOrders((prev) => prev.filter((o) => o._id !== order._id));

          toast.success("Order deleted");
        } catch (err) {
          toast.error("Failed to delete order");
        } finally {
          setIsDeleting(false);
          closeModal();
        }
      });
    } catch (err) {
      toast.error("Failed to save quick sale");
    }
  };

  /* ===============================
     RENDER
  ============================== */
  return (
    <div className={styles["admin-page"]}>
      <div className={styles["admin-header"]}>
        <h2 className={styles["admin-title"]}>
          Admin Orders
          <span
            className={`${styles["order-count"]} ${
              countBump ? styles.bump : ""
            }`}
          >
            {orders.length}
          </span>
        </h2>

        <button
          className={styles.btnDashboard}
          onClick={() => navigate("/admin/dashboard")}
        >
          Dashboard
        </button>
      </div>

      {loading ? (
        <p className={styles.empty}>Loading orders...</p>
      ) : orders.length === 0 ? (
        <p className={styles.empty}>No orders found</p>
      ) : null}

      {orders.map((o) => {
        // const partialTotal = calculateTotal(o.files);
        const partialTotal = calculateTotal(o);

        const isEdited =
          editedTotals[o._id] !== undefined &&
          editedTotals[o._id] !== partialTotal;

        return (
          <div key={o._id} className={styles.orderCardApp}>
            {/* ================= HEADER ================= */}
            <div
              className={styles.orderHeaderApp}
              onClick={() => toggleOrder(o._id)}
            >
              <div className={styles.orderUserSection}>
                <div className={styles.avatarCircle}>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M12 12c2.76 0 5-2.24 5-5S14.76 2 12 2 7 4.24 7 7s2.24 5 5 5Zm0 2c-3.33 0-10 1.67-10 5v3h20v-3c0-3.33-6.67-5-10-5Z"
                      fill="currentColor"
                    />
                  </svg>
                </div>

                <div className={styles.nameRow}>
                  <div className={styles.customerNameApp}>{o.customerName}</div>

                  {o.isNew && <span className={styles.newBadgeApp}>New</span>}
                </div>
              </div>

              {/* RIGHT SIDE (TOTAL + EXPAND ONLY) */}
              <div
                style={{ display: "flex", alignItems: "center", gap: "14px" }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Expand Icon */}
                <div
                  className={styles.expandIcon}
                  onClick={() => toggleOrder(o._id)}
                >
                  {expanded[o._id] ? <FiChevronUp /> : <FiChevronDown />}
                </div>
              </div>
            </div>

            {/* ================= FILES ================= */}
            {expanded[o._id] && (
              <div className={styles.filesContainerApp}>
                {o.files.map((f, i) => {
                  const isCalculatable =
                    ["pdf", "image"].includes(f.type) &&
                    typeof f.pageCount === "number" &&
                    typeof f.price === "number";

                  return (
                    <div key={i} className={styles.fileCardApp}>
                      {/* FILE TITLE + BADGES */}
                      <div className={styles.fileTopApp}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                          }}
                        >
                          <span className={styles.fileIcon}>📄</span>
                          <strong className={styles.fileNameApp}>
                            {f.originalName || `File ${i + 1}`}
                          </strong>
                        </div>

                        <div className={styles.fileBadges}>
                          {!isCalculatable && (
                            <span className={styles.manualBadge}>Manual</span>
                          )}
                          {f.pageRange && f.pageRange !== "all" && (
                            <span className={styles.partialBadge}>Partial</span>
                          )}
                          {f.printSide === "double" && (
                            <span className={styles.doubleBadge}>Double</span>
                          )}
                        </div>
                      </div>

                      {/* FILE DETAILS */}
                      <div className={styles.metaRowApp}>
                        {isCalculatable && <span>Pages: {f.pageCount}</span>}

                        <span>Size: {f.paperSize}</span>
                        <span>Color: {f.color?.toUpperCase()}</span>
                        <span>Copies: {f.copies}</span>

                        {f.printSide && (
                          <span>
                            {f.printSide === "double"
                              ? "Double Side"
                              : "Single Side"}
                          </span>
                        )}

                        {f.pageRange && <span>Range: {f.pageRange}</span>}
                        {/* 
                        {isCalculatable && (
                          <span className={styles.priceTag}>₹{f.price}</span>
                        )} */}

                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          <span style={{ fontSize: "12px", fontWeight: 600 }}>
                            ₹
                          </span>

                          <input
                            type="number"
                            min="0"
                            value={
                              editedFilePrices[o._id]?.[i] !== undefined
                                ? editedFilePrices[o._id][i]
                                : f.price || 0
                            }
                            onChange={(e) => {
                              const value = Number(e.target.value);

                              setEditedFilePrices((prev) => ({
                                ...prev,
                                [o._id]: {
                                  ...prev[o._id],
                                  [i]: value,
                                },
                              }));
                            }}
                            style={{
                              width: "70px",
                              padding: "4px 8px",
                              borderRadius: "8px",
                              border: "1px solid #e2e8f0",
                              fontWeight: 600,
                              fontSize: "12px",
                            }}
                          />
                        </div>
                      </div>

                      {/* Notes */}
                      {f.notes && (
                        <div className={styles.notesApp}>{f.notes}</div>
                      )}

                      {/* FILE ACTIONS */}
                      <div className={styles.fileActionsRow}>
                        <button
                          className={styles.printBtnMini}
                          onClick={() => printFile(f.fileUrl, f.type)}
                        >
                          <FiPrinter size={14} />
                          Print
                        </button>

                        <button
                          className={styles.deleteMiniBtn}
                          onClick={() => deleteFile(o._id, f._id)}
                        >
                          <FiTrash2 size={14} />
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* ORDER BOTTOM ACTIONS */}
                {/* ================= ORDER TOTAL + ACTIONS ================= */}
                <div className={styles.orderBottomSection}>
                  {/* Editable Total */}
                  <div
                    className={`${styles.totalEditor} ${
                      isEdited ? styles.edited : ""
                    }`}
                  >
                    <span>Total ₹</span>
                    <input
                      type="number"
                      min="0"
                      value={
                        editedTotals[o._id] !== undefined
                          ? editedTotals[o._id]
                          : partialTotal
                      }
                      onChange={(e) =>
                        setEditedTotals((prev) => ({
                          ...prev,
                          [o._id]: Number(e.target.value),
                        }))
                      }
                      className={styles.totalInput}
                    />
                  </div>

                  <div className={styles.orderActionsBottom}>
                    <button
                      className={styles.quickSaleBtn}
                      onClick={() => saveQuickSale(o)}
                    >
                      Save as Quick Sale
                    </button>

                    <button
                      className={styles.deleteOrderBtn}
                      onClick={() => deleteOrder(o._id)}
                    >
                      Delete Order
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* CONFIRM MODAL */}
      {modal.open && (
        <div className={styles["modal-backdrop"]}>
          <div className={styles["modal-box"]}>
            <p>
              {modal.message}
              <br />
              <small style={{ opacity: 0.6 }}>
                Press Enter to confirm • Esc to cancel
              </small>
            </p>

            <div className={styles["modal-actions"]}>
              <button
                className={`${styles.btn} ${styles["btn-dark"]}`}
                onClick={closeModal}
              >
                Cancel
              </button>
              <button
                className={`${styles.btn} ${styles["btn-danger"]}`}
                onClick={modal.onConfirm}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <span className={styles.spinner}></span>
                ) : (
                  "Confirm"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <audio ref={audioRef} src={notificationSound} preload="auto" />

      <ToastContainer
        position="bottom-right"
        autoClose={4000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnHover
        draggable
        theme="colored"
        toastClassName={styles.customToast}
        bodyClassName={styles.customToastBody}
      />
    </div>
  );
}
