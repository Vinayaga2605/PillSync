import React, { useEffect, useMemo, useState } from "react";
import {
  Search,
  Download,
  Printer,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
} from "lucide-react";

import medicationService from "../../services/medicationService";

const MedicineHistory = () => {
  const [medicines, setMedicines] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] =
    useState(false);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [selectedMedicine, setSelectedMedicine] =
    useState("all");
  const [page, setPage] = useState(1);

  const pageSize = 8;

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setLoading(true);

      const response =
        await medicationService.getActiveMedicines();

      const medicineList = Array.isArray(
        response.data
      )
        ? response.data
        : [];

      setMedicines(medicineList);

      setHistoryLoading(true);

      const allRows = [];

      for (const medicine of medicineList) {
        try {
          const historyResponse =
            await medicationService.getMedicineHistory(
              medicine.id
            );

          const historyData = Array.isArray(
            historyResponse.data
          )
            ? historyResponse.data
            : [];

          historyData.forEach((item) => {
            allRows.push({
              id: `${medicine.id}-${item.id}`,
              medicine: medicine.name,
              dosage: medicine.dosage,
              date: item.date,
              time: item.time,
              status:
                item.status || "pending",
            });
          });
        } catch (err) {
          console.error(
            `Failed history for ${medicine.name}:`,
            err
          );
        }
      }

      setRows(allRows);
    } catch (err) {
      console.error(
        "Failed to load medicine history:",
        err
      );
      setRows([]);
    } finally {
      setHistoryLoading(false);
      setLoading(false);
    }
  };

  const filteredRows = useMemo(() => {
    let result = [...rows];

    if (search.trim()) {
      const query =
        search.toLowerCase();

      result = result.filter((row) =>
        row.medicine
          .toLowerCase()
          .includes(query)
      );
    }

    if (selectedMedicine !== "all") {
      result = result.filter(
        (row) =>
          row.medicine === selectedMedicine
      );
    }

    if (status !== "all") {
      result = result.filter(
        (row) =>
          String(row.status).toLowerCase() ===
          status
      );
    }

    return result;
  }, [
    rows,
    search,
    selectedMedicine,
    status,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(
      filteredRows.length / pageSize
    )
  );

  const pageRows = filteredRows.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  useEffect(() => {
    setPage(1);
  }, [
    search,
    selectedMedicine,
    status,
  ]);

  const statusClass = (value) => {
    const current =
      String(value).toLowerCase();

    if (current === "taken") {
      return "vin-history-taken";
    }

    if (current === "missed") {
      return "vin-history-missed";
    }

    return "vin-history-pending";
  };

  const downloadCsv = () => {
    const lines = [
      "Date,Medicine,Dosage,Time,Status",
      ...filteredRows.map(
        (row) =>
          `${row.date},${row.medicine},${row.dosage},${row.time},${row.status}`
      ),
    ];

    const blob = new Blob(
      [lines.join("\n")],
      {
        type: "text/csv;charset=utf-8;",
      }
    );

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    link.href = url;
    link.download =
      "pillsync-medicine-history.csv";

    link.click();

    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner" />
        <p>
          Loading medicine history...
        </p>
      </div>
    );
  }

  return (
    <div className="vin-medicine-page">
      <div className="vin-history-header-main">
        <div>
          <h1>Medicine History</h1>
          <p>
            Full record across your medicines.
          </p>
        </div>

        <div className="vin-edit-actions">
          <button
            className="vin-secondary-btn"
            onClick={downloadCsv}
          >
            <Download size={16} />
            Export
          </button>

          <button
            className="vin-secondary-btn"
            onClick={() => window.print()}
          >
            <Printer size={16} />
            Print
          </button>
        </div>
      </div>

      <div className="vin-history-controls">
        <div className="vin-search">
          <Search size={16} />

          <input
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            placeholder="Search medicine..."
          />
        </div>

        <select
          value={selectedMedicine}
          onChange={(e) =>
            setSelectedMedicine(
              e.target.value
            )
          }
          className="vin-history-select"
        >
          <option value="all">
            All medicines
          </option>

          {medicines.map((medicine) => (
            <option
              key={medicine.id}
              value={medicine.name}
            >
              {medicine.name}
            </option>
          ))}
        </select>

        <select
          value={status}
          onChange={(e) =>
            setStatus(e.target.value)
          }
          className="vin-history-select"
        >
          <option value="all">
            All statuses
          </option>

          <option value="taken">
            Taken
          </option>

          <option value="missed">
            Missed
          </option>

          <option value="pending">
            Pending
          </option>
        </select>
      </div>

      <div className="vin-history-card">
        <div className="vin-history-card-header">
          <div>
            <h2>Medication activity</h2>

            <p>
              {filteredRows.length} records found
            </p>
          </div>

          <CalendarDays size={19} />
        </div>

        {historyLoading ? (
          <div className="vin-history-loading">
            Loading history...
          </div>
        ) : pageRows.length === 0 ? (
          <div className="vin-history-empty">
            No medicine history found.
          </div>
        ) : (
          <div className="vin-table-scroll">
            <table className="vin-history-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Medicine</th>
                  <th>Dosage</th>
                  <th>Time</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {pageRows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.date}</td>

                    <td>
                      <strong>
                        {row.medicine}
                      </strong>
                    </td>

                    <td>{row.dosage}</td>

                    <td>{row.time}</td>

                    <td>
                      <span
                        className={`vin-history-status ${statusClass(
                          row.status
                        )}`}
                      >
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="vin-pagination">
          <span>
            Page {page} of {totalPages}
          </span>

          <div>
            <button
              disabled={page === 1}
              onClick={() =>
                setPage((p) => p - 1)
              }
            >
              <ChevronLeft size={16} />
            </button>

            <button
              disabled={
                page === totalPages
              }
              onClick={() =>
                setPage((p) => p + 1)
              }
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MedicineHistory;



