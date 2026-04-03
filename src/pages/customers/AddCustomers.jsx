import React, { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { authFetch } from "../../utils/authFetch";
import Modal from "react-modal";
import "./AddCustomers.css";
import { BACKEND_URL } from "../../config";

Modal.setAppElement("#root");

const AddCustomers = () => {
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [excelFile, setExcelFile] = useState(null);
  const [modalMessage, setModalMessage] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  const fileInputRef = useRef(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm();

  const showModal = (msg) => {
    setModalMessage(msg);
    setModalOpen(true);
  };

  const handleExcelChange = (e) => setExcelFile(e.target.files[0]);

  const handleExcelUpload = async () => {
    if (!excelFile) {
      return showModal("Please select a file first");
    }

    const formData = new FormData();
    formData.append("file", excelFile);
    setUploading(true);

    try {
      const token = localStorage.getItem("token");
      const res = await authFetch(`${BACKEND_URL}/customer/upload-excel`, {
        method: "POST",
        body: formData,
        headers: { Authorization: `Bearer ${token}` },
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.msg || "Upload failed");
      }

      showModal(`${result.length} Customer added successfully`);
      setExcelFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      console.error(err);
      showModal(err.message);
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (data) => {
    setSubmitting(true);
    try {
      const res = await authFetch(`${BACKEND_URL}/customer`, {
        method: "POST",
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.msg || "Something went wrong");
      }

      showModal(`Customer "${result.custName}" created successfully`);
    } catch (err) {
      console.error(err);
      showModal(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="add-customer-container">
      <h2>Add Customer</h2>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="form-group">
          <label>Name: </label>
          <input
            type="text"
            {...register("custName", { required: "Name is required" })}
            placeholder="Customer Name"
            className={errors.custName ? "error-input" : ""}
          />
          {errors.custName && (
            <p className="error-text">{errors.custName.message}</p>
          )}
        </div>

        <div className="form-group">
          <label>Phone No</label>
          <input
            type="number"
            {...register("phone", { required: "Phone No is required" })}
            placeholder="Phone No"
            className={errors.phone ? "error-input" : ""}
          />
          {errors.phone && <p className="error-text">{errors.phone.message}</p>}
        </div>

        <div className="form-group">
          <label>Company Name</label>
          <input type="text" {...register("companyName")} />
        </div>

        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? "Creating..." : "Create Customer"}
        </button>
      </form>

      <div className="excel-upload">
        <h3>Upload Customers from Excel</h3>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx, .xls"
          onChange={handleExcelChange}
        />

        <button
          type="button"
          onClick={handleExcelUpload}
          disabled={uploading}
          className="btn-success"
        >
          {uploading ? "Uploading..." : "Upload Excel"}
        </button>
      </div>

      <Modal
        isOpen={modalOpen}
        onRequestClose={() => setModalOpen(false)}
        className="modal-content"
        overlayClassName="modal-overlay"
      >
        <p>{modalMessage}</p>
        <button onClick={() => setModalOpen(false)} className="btn-close">
          Close
        </button>
      </Modal>
    </div>
  );
};

export default AddCustomers;
