import { authFetch } from "../utils/authFetch";

import { PDFDocument } from "pdf-lib";
import styles from "./OrderForm.module.css";

import { useState, useRef } from "react";
import { BACKEND_URL } from "../config";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { toast } from "react-toastify";
import { Slide } from "react-toastify";

const priceTable = {
  A4: { bw: 2, color: 5 },
  A3: { bw: 4, color: 8 },
};

const getPdfPageCount = async (file) => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await PDFDocument.load(arrayBuffer);
  return pdf.getPageCount();
};

export default function OrderForm() {
  const [customer, setCustomer] = useState({
    customerName: "",
  });

  const [files, setFiles] = useState([]);

  // 🔄 SUBMIT STATE
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef(null);

  const MAX_SIZE_MB = 10;

  const addFiles = async (selectedFiles) => {
    const fileArray = Array.from(selectedFiles);
    const newFiles = [];

    for (const file of fileArray) {
      const extension = file.name.split(".").pop().toLowerCase();
      const sizeInMB = file.size / (1024 * 1024);

      // 🚫 Size limit
      if (sizeInMB > MAX_SIZE_MB) {
        toast.error("File size must be under 10MB");
        continue;
      }

      // ✅ PDF
      if (extension === "pdf") {
        const pages = await getPdfPageCount(file);

        newFiles.push({
          file,
          pageCount: pages,
          paperSize: "A4",
          color: "bw",
          copies: 1,
          printSide: "single",
          pageRange: "all",
          price: pages * priceTable.A4.bw,
          type: "pdf",
          notes: "",
        });
      }

      // ✅ Images
      else if (["jpg", "jpeg", "png"].includes(extension)) {
        newFiles.push({
          file,
          pageCount: 1,
          paperSize: "A4",
          color: "color",
          copies: 1,
          printSide: "single",
          pageRange: "all",
          price: priceTable.A4.color,
          type: "image",
          notes: "",
        });
      } else if (["doc", "docx"].includes(extension)) {
        newFiles.push({
          file,
          pageCount: 1,
          paperSize: "A4",
          color: "bw",
          copies: 1,
          printSide: "single",
          pageRange: "all",
          price: priceTable.A4.bw,
          type: "docx",
          notes: "",
        });
      } else if (["doc", "docx", "ppt", "pptx"].includes(extension)) {
        newFiles.push({
          file,
          pageCount: 1,
          paperSize: "A4",
          color: "bw",
          copies: 1,
          printSide: "single",
          pageRange: "all",
          price: priceTable.A4.bw,
          type: extension, // keep real type
          notes: "",
        });
      }

      // ❌ Everything else
      else {
        toast.error("Only PDF, Image, DOC, PPT files allowed");
      }
    }

    setFiles((prev) => [...prev, ...newFiles]);
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const updateFile = (index, changes) => {
    const updated = [...files];
    updated[index] = { ...updated[index], ...changes };

    const f = updated[index];
    // updated[index].price =
    //   f.pageCount * priceTable[f.paperSize][f.color] * f.copies;

    let pagesToPrint = f.pageCount; // 👈 user-controlled

    // OPTIONAL: only apply pageRange if user entered it
    if (f.pageRange !== "all") {
      const parts = f.pageRange.split("-");
      if (parts.length === 2) {
        const start = Number(parts[0]);
        const end = Number(parts[1]);
        if (start && end && end >= start) {
          pagesToPrint = end - start + 1;
        }
      }
    }

    updated[index].price =
      pagesToPrint * priceTable[f.paperSize][f.color] * f.copies;

    setFiles(updated);
  };

  const totalPrice = files.reduce((sum, f) => sum + f.price, 0);

  const submit = async () => {
    // ✅ Prevent empty name
    if (!customer.customerName.trim()) {
      toast.error("Customer name is required");
      return;
    }

    // ✅ Prevent empty files
    if (!files.length) {
      toast.error("Please add at least one file");
      return;
    }

    if (isSubmitting) return;

    setIsSubmitting(true);

    try {
      const data = new FormData();
      data.append("customerName", customer.customerName.trim());

      files.forEach((f) => data.append("files", f.file));

      data.append(
        "filesMeta",
        JSON.stringify(
          files.map(
            ({
              paperSize,
              color,
              copies,
              price,
              pageCount,
              type,
              notes,
              printSide,
              pageRange,
            }) => ({
              paperSize,
              color,
              copies,
              price,
              pageCount,
              type,
              notes,
              printSide,
              pageRange,
            }),
          ),
        ),
      );

      const res = await authFetch(`${BACKEND_URL}/api/orders`, {
        method: "POST",
        body: data,
      });

      if (!res.ok) throw new Error("Failed to place order");

      toast.success("Order placed successfully");

      setFiles([]);
      setCustomer({ customerName: "" }); // reset name also
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      console.error(err);
      toast.error("Failed to place order");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <ToastContainer
        position="bottom-center"
        autoClose={2500}
        hideProgressBar
        closeButton={false}
        newestOnTop
        pauseOnFocusLoss={false}
        draggable
        pauseOnHover
        transition={Slide}
        theme="colored"
      />

      <div className={styles.orderPage}>
        <h3 className={styles.orderTitle}>Place Order</h3>

        <input
          className={styles.input}
          placeholder="Customer Name"
          value={customer.customerName}
          onChange={(e) =>
            setCustomer({ ...customer, customerName: e.target.value })
          }
        />

        <div
          className={`${styles.uploadBox}`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            e.currentTarget.classList.add(styles.dragActive);
          }}
          onDragLeave={(e) => {
            e.currentTarget.classList.remove(styles.dragActive);
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.currentTarget.classList.remove(styles.dragActive);
            addFiles(e.dataTransfer.files);
          }}
        >
          <div className={styles.uploadContent}>
            <div className={styles.uploadIcon}>
              <svg
                width="28"
                height="28"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path d="M12 16V4M12 4l-4 4M12 4l4 4M4 20h16" />
              </svg>
            </div>

            <h4>Drop your files here</h4>
            <p>or tap to browse files</p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.ppt,.pptx"
            hidden
            onChange={(e) => addFiles(e.target.files)}
          />
        </div>

        {files.map((f, i) => (
          <div key={i} className={styles.fileCard}>
            <p className={styles.fileName}>{f.file.name}</p>
            <div className={styles.inputGroup}>
              <label>Pages</label>
              <input
                type="number"
                min="1"
                value={f.pageCount}
                onChange={(e) =>
                  updateFile(i, { pageCount: Number(e.target.value) })
                }
              />
            </div>

            <div className={styles.fileControls}>
              {/* <select
              className={styles.select}
              value={f.paperSize}
              disabled={isSubmitting}
              onChange={(e) => updateFile(i, { paperSize: e.target.value })}
            >
              <option value="A4">A4</option>
              <option value="A3">A3</option>
            </select>

            <select
              className={styles.select}
              value={f.color}
              disabled={isSubmitting}
              onChange={(e) => updateFile(i, { color: e.target.value })}
            >
              <option value="bw">BW</option>
              <option value="color">Color</option>
            </select> */}

              <div className={styles.printOptions}>
                {/* Page Size */}
                <div className={styles.optionGroup}>
                  <p>Page Size</p>
                  <div className={styles.optionRow}>
                    <button
                      className={`${styles.optionBtn} ${f.paperSize === "A4" ? styles.active : ""}`}
                      onClick={() => updateFile(i, { paperSize: "A4" })}
                    >
                      A4
                    </button>
                    <button
                      className={`${styles.optionBtn} ${f.paperSize === "A3" ? styles.active : ""}`}
                      onClick={() => updateFile(i, { paperSize: "A3" })}
                    >
                      A3
                    </button>
                  </div>
                </div>

                {/* Color */}
                <div className={styles.optionGroup}>
                  <p>Print Color</p>
                  <div className={styles.optionRow}>
                    <button
                      className={`${styles.optionBtn} ${f.color === "bw" ? styles.active : ""}`}
                      onClick={() => updateFile(i, { color: "bw" })}
                    >
                      B&W
                    </button>
                    <button
                      className={`${styles.optionBtn} ${f.color === "color" ? styles.active : ""}`}
                      onClick={() => updateFile(i, { color: "color" })}
                    >
                      Color
                    </button>
                  </div>
                </div>

                {/* Print Side */}
                <div className={styles.optionGroup}>
                  <p>Print Sides</p>
                  <div className={styles.optionRow}>
                    <button
                      className={`${styles.optionBtn} ${f.printSide === "single" ? styles.active : ""}`}
                      onClick={() => updateFile(i, { printSide: "single" })}
                    >
                      Single Side
                    </button>
                    <button
                      className={`${styles.optionBtn} ${f.printSide === "double" ? styles.active : ""}`}
                      onClick={() => updateFile(i, { printSide: "double" })}
                    >
                      Double Side
                    </button>
                  </div>
                </div>

                <div className={styles.inputGroup}>
                  <label>Copies</label>
                  <input
                    type="number"
                    min="1"
                    value={f.copies}
                    onChange={(e) =>
                      updateFile(i, { copies: Number(e.target.value) })
                    }
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label>Page Range</label>
                  <input
                    type="text"
                    placeholder="e.g. 1-5 or all"
                    value={f.pageRange}
                    onChange={(e) =>
                      updateFile(i, { pageRange: e.target.value })
                    }
                  />
                </div>
              </div>

              {/* <input
              className={styles.input}
              type="number"
              min="1"
              value={f.copies}
              disabled={isSubmitting}
              onChange={(e) =>
                updateFile(i, { copies: Number(e.target.value) })
              }
            /> */}

              <textarea
                className={styles.textarea}
                placeholder="Notes (e.g., spiral binding, single side, etc.)"
                value={f.notes}
                disabled={isSubmitting}
                onChange={(e) => updateFile(i, { notes: e.target.value })}
              />
            </div>

            {/* <div className={styles.filePrice}>₹{f.price}</div> */}

            <button
              className={`${styles.button} ${styles.dangerButton}`}
              disabled={isSubmitting}
              onClick={() => removeFile(i)}
            >
              Remove
            </button>
          </div>
        ))}

        {/* <h4 className={styles.orderTotal}>Total: ₹{totalPrice}</h4> */}
        {files.length > 0 && (
          <div className={styles.bottomBar}>
            <div className={styles.bottomSummary}>
              <button
                className={`${styles.bottomButton} ${
                  isSubmitting ? styles.loading : ""
                }`}
                disabled={isSubmitting}
                onClick={submit}
              >
                {isSubmitting ? "Processing..." : "Place Order"}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
