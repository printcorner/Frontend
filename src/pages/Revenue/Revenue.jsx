import React, { useEffect, useState } from "react";
import { authFetch } from "../../utils/authFetch";
import "./Revenue.css";
import { BACKEND_URL } from "../../config";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const Revenue = () => {
  const [revenue, setRevenue] = useState([]);
  const [total, setTotal] = useState(0);
  const [count, setCount] = useState(0);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [viewMode, setViewMode] = useState("all"); // all | filter

  const formatINR = (amount = 0) =>
    new Intl.NumberFormat("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(amount));

  // 🔹 Fetch ALL revenue (summary only)
  const fetchAllRevenue = async () => {
    try {
      setLoading(true);
      setError("");
      setViewMode("all");

      const res = await authFetch(`${BACKEND_URL}/revenue/all`);

      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Failed to fetch revenue");

      setRevenue(data.data);
      setTotal(data.totalAmount);
      setCount(data.count);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Fetch revenue between dates (grouped summary)
  const fetchRevenueBetweenDates = async () => {
    if (!startDate || !endDate) {
      setError("Please select start and end dates");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setViewMode("filter");

      const res = await authFetch(
        `${BACKEND_URL}/revenue?startDate=${startDate}&endDate=${endDate}`,
      );

      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Failed to fetch revenue");

      setRevenue(data.data);
      setTotal(data.totalRevenue);
      setCount(data.count);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = async () => {
    if (!startDate || !endDate) {
      setError("Please select start and end dates");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const res = await authFetch(
        `${BACKEND_URL}/revenue?startDate=${startDate}&endDate=${endDate}`,
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to fetch revenue");

      const records = data.data;

      if (!records.length) {
        setError("No records found for selected range");
        return;
      }

      // 🔹 Format data for Excel
      const formattedData = records.map((item) => ({
        Date: new Date(item.createdAt).toLocaleDateString(),
        Source: item.source,
        Amount: item.amount,
      }));

      const worksheet = XLSX.utils.json_to_sheet(formattedData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Revenue");

      const excelBuffer = XLSX.write(workbook, {
        bookType: "xlsx",
        type: "array",
      });

      const blob = new Blob([excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8",
      });

      saveAs(blob, `Revenue_${startDate}_to_${endDate}.xlsx`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 🔹 ALL VIEW: group by source
  const groupedBySource = revenue.reduce((acc, item) => {
    acc[item.source] = (acc[item.source] || 0) + item.amount;
    return acc;
  }, {});

  // 🔹 FILTER VIEW: group by day + source
  const groupedByDayAndSource = revenue.reduce((acc, item) => {
    const day = new Date(item.createdAt).toISOString().split("T")[0];

    if (!acc[day]) {
      acc[day] = { order: 0, quickSale: 0 };
    }

    acc[day][item.source] += item.amount;
    return acc;
  }, {});

  useEffect(() => {
    fetchAllRevenue();
  }, []);

  return (
    <div className="revenue-container">
      <h2>Revenue</h2>

      {/* 📅 Date Filter */}
      <div className="date-filter">
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />

        <button onClick={fetchRevenueBetweenDates} disabled={loading}>
          {loading && viewMode === "filter" ? "Filtering..." : "Filter"}
        </button>

        <button onClick={fetchAllRevenue} disabled={loading}>
          {loading && viewMode === "all" ? "Loading..." : "All"}
        </button>

        <button onClick={exportToExcel} disabled={loading}>
          {loading ? "Exporting..." : "Export Excel"}
        </button>
      </div>

      {loading && <p>Loading...</p>}
      {error && <p className="error-text">{error}</p>}

      {!loading && !error && (
        <>
          {/* ✅ ALL VIEW — GROUP BY SOURCE */}
          {viewMode === "all" && (
            <div className="revenue-summary">
              <h3>Total Revenue: ₹{formatINR(total)}</h3>
              <p>Order: ₹{formatINR(groupedBySource.order)}</p>
              <p>Quick Sale: ₹{formatINR(groupedBySource.quickSale)}</p>
            </div>
          )}

          {/* ✅ FILTER VIEW — GROUP BY DAY + SOURCE */}
          {viewMode === "filter" && (
            <div className="revenue-summary">
              <h3>Total Revenue: ₹{formatINR(total)}</h3>
              {/* <p>Total Records: {count}</p> */}

              {Object.keys(groupedByDayAndSource).length === 0 ? (
                <p>No revenue records found</p>
              ) : (
                Object.entries(groupedByDayAndSource).map(([day, sources]) => (
                  <div key={day} className="daily-revenue">
                    <h4>{day}</h4>
                    <p>Order: ₹{formatINR(sources.order)}</p>
                    <p>Quick Sale: ₹{formatINR(sources.quickSale)}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Revenue;
