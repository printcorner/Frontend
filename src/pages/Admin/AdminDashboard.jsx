import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiUserPlus,
  FiPlusSquare,
  FiActivity,
  FiBox,
  FiShoppingCart,
  FiUsers,
  FiDollarSign,
  FiTrendingUp,
  FiCreditCard,
} from "react-icons/fi";
import { BACKEND_URL } from "../../config";
import styles from "./AdminDashboard.module.css";

import { useRef } from "react";
import notificationSound from "../../assets/notification.mp3";

import { socket } from "../../socket";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [serverAlive, setServerAlive] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    navigate("/login", { replace: true });
  };

  const [liveOrderCount, setLiveOrderCount] = useState(0);

  const audioRef = useRef(null);

  const cards = [
    { title: "Walk-In Customer", path: "/walk", icon: <FiUserPlus /> },
    { title: "Create Order", path: "/createorder", icon: <FiPlusSquare /> },
    { title: "Live Order", path: "/liveorder", icon: <FiActivity /> },
    { title: "Products", path: "/viewproduct", icon: <FiBox /> },
    { title: "Orders", path: "/orderlist", icon: <FiShoppingCart /> },
    { title: "Bulk Pay", path: "/outstanding", icon: <FiCreditCard /> },
    { title: "Customers", path: "/viewcustomer", icon: <FiUsers /> },
    { title: "Expenses", path: "/expense", icon: <FiDollarSign /> },
    { title: "Revenue", path: "/revenue", icon: <FiTrendingUp /> },
    { title: "Create User", path: "/register", icon: <FiUserPlus /> },
  ];

  useEffect(() => {
    const unlock = () => {
      if (!audioRef.current) return;

      audioRef.current
        .play()
        .then(() => {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        })
        .catch(() => {});

      window.removeEventListener("click", unlock);
    };

    window.addEventListener("click", unlock);

    return () => window.removeEventListener("click", unlock);
  }, []);

  const fetchCount = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/liveorders`);
      const data = await res.json();
      setLiveOrderCount(Array.isArray(data) ? data.length : 0);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    // Initial load
    fetchCount();

    const handleNewOrder = (order) => {
      // 🔴 Save order id for NEW badge
      const existing = JSON.parse(localStorage.getItem("newOrders") || "[]");

      if (!existing.includes(order._id)) {
        localStorage.setItem(
          "newOrders",
          JSON.stringify([order._id, ...existing]),
        );
      }

      fetchCount();

      if (audioRef.current) {
        const sound = audioRef.current;
        sound.pause();
        sound.currentTime = 0;

        const playPromise = sound.play();

        if (playPromise !== undefined) {
          playPromise.catch(() => {
            console.log("Sound blocked");
          });
        }
      }
    };

    const handleOrderDeleted = () => {
      setLiveOrderCount((prev) => Math.max(prev - 1, 0));
    };

    socket.on("new-order", handleNewOrder);
    socket.on("order-deleted", handleOrderDeleted);

    return () => {
      socket.off("new-order", handleNewOrder);
      socket.off("order-deleted", handleOrderDeleted);
    };
  }, []);

  // 🔹 Keep server alive & check status
  const checkServer = async () => {
    if (!navigator.onLine) {
      setServerAlive(false);
      return;
    }

    try {
      const res = await fetch(`${BACKEND_URL}/health`);
      setServerAlive(res.ok);
    } catch {
      setServerAlive(false);
    }
  };

  useEffect(() => {
    checkServer(); // ping immediately

    const intervalId = setInterval(checkServer, 14 * 60 * 1000); // every 14 min

    return () => {
      clearInterval(intervalId);
    };
  }, []);

  return (
    <div className={styles["admin-container"]}>
      <div className={styles["admin-header"]}>
        <div className={styles["left-header"]}>
          <span
            className={`${styles["status-indicator"]} ${
              serverAlive ? styles.alive : styles.down
            }`}
            role="status"
          />
          <h2>Print Corner</h2>
        </div>

        <button className={styles["btn-logout"]} onClick={handleLogout}>
          Logout
        </button>
      </div>

      <div className={styles["admin-grid"]}>
        {cards.map((card) => (
          <div
            key={card.title}
            className={styles["admin-card"]}
            onClick={() => navigate(card.path)}
          >
            <div className={styles["card-icon-wrapper"]}>
              <div className={styles["card-icon"]}>{card.icon}</div>

              {card.title === "Live Order" && liveOrderCount > 0 && (
                <span className={styles["order-badge"]}>{liveOrderCount}</span>
              )}
            </div>

            <h3>{card.title}</h3>
          </div>
        ))}
      </div>
      <audio
        ref={audioRef}
        src={notificationSound}
        preload="auto"
        playsInline
      />
    </div>
  );
};

export default AdminDashboard;
