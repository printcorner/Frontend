import React, { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { authFetch } from "../../utils/authFetch";
import Modal from "react-modal";
import styles from "./AddProducts.module.css";

import { BACKEND_URL } from "../../config";

Modal.setAppElement("#root");

const AddProducts = () => {
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [excelFile, setExcelFile] = useState(null);
  const [modalMessage, setModalMessage] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  const fileInputRef = useRef(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    reset,
  } = useForm();

  const trackStock = watch("trackStock", false);

  const showModal = (msg) => {
    setModalMessage(msg);
    setModalOpen(true);
  };

  const handleExcelChange = (e) => setExcelFile(e.target.files[0]);

  const handleExcelUpload = async () => {
    if (!excelFile) return showModal("Please select a file first");

    const formData = new FormData();
    formData.append("file", excelFile);
    setUploading(true);

    try {
      const token = localStorage.getItem("token");
      const res = await authFetch(`${BACKEND_URL}/product/upload-excel`, {
        method: "POST",
        body: formData,
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Upload failed");

      const result = await res.json();
      showModal(`${result.length} products added successfully`);
      setExcelFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      console.error(err);
      showModal("Failed to upload Excel file");
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (data) => {
    setSubmitting(true);
    try {
      const res = await authFetch(`${BACKEND_URL}/product`, {
        method: "POST",
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error("Failed to new create product");
      const result = await res.json();
      showModal(`Product "${result.name}" created successfully`);
      reset();
    } catch (err) {
      console.error(err);
      showModal("Error creating product");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles["add-product-container"]}>
      <h2 className={styles.title}>Add Product</h2>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className={styles["form-group"]}>
          <label className={styles.label}>Name:</label>
          <input
            type="text"
            {...register("name", { required: "Name is required" })}
            placeholder="Product Name"
            className={`${styles.input} ${
              errors.name ? styles["error-input"] : ""
            }`}
          />
          {errors.name && (
            <p className={styles["error-text"]}>{errors.name.message}</p>
          )}
        </div>

        <div className={styles["form-group"]}>
          <label className={styles.label}>Price:</label>
          <input
            type="number"
            {...register("price", { required: "Price is required", min: 0 })}
            placeholder="Product Price"
            className={`${styles.input} ${
              errors.price ? styles["error-input"] : ""
            }`}
          />
          {errors.price && (
            <p className={styles["error-text"]}>{errors.price.message}</p>
          )}
        </div>

        <div className={`${styles["form-group"]} ${styles["checkbox-group"]}`}>
          <label className={styles.label}>
            <input type="checkbox" {...register("trackStock")} /> Track Stock
          </label>
        </div>

        {trackStock && (
          <div className={styles["form-group"]}>
            <label className={styles.label}>Stock:</label>
            <input
              type="number"
              {...register("stock", { required: "Stock is required", min: 0 })}
              placeholder="Stock"
              className={`${styles.input} ${
                errors.stock ? styles["error-input"] : ""
              }`}
            />
            {errors.stock && (
              <p className={styles["error-text"]}>{errors.stock.message}</p>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className={`${styles.btn} ${styles["btn-primary"]}`}
        >
          {submitting ? "Creating..." : "Create Product"}
        </button>
      </form>

      <div className={styles["excel-upload"]}>
        <h3 className={styles["excel-title"]}>Upload Products from Excel</h3>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx, .xls"
          onChange={handleExcelChange}
          className={styles["file-input"]}
        />
        <button
          type="button"
          onClick={handleExcelUpload}
          disabled={uploading}
          className={`${styles.btn} ${styles["btn-success"]}`}
        >
          {uploading ? "Uploading..." : "Upload Excel"}
        </button>
      </div>

      <Modal
        isOpen={modalOpen}
        onRequestClose={() => setModalOpen(false)}
        className={styles["modal-content"]}
        overlayClassName={styles["modal-overlay"]}
      >
        <p className={styles["modal-text"]}>{modalMessage}</p>
        <button
          onClick={() => setModalOpen(false)}
          className={`${styles.btn} ${styles["btn-close"]}`}
        >
          Close
        </button>
      </Modal>
    </div>
  );
};

export default AddProducts;
