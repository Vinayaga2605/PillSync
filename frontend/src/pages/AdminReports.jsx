import { useEffect, useState } from "react";

import DashboardLayout from "../components/DashboardLayout";
import { fetchAdminReports, fetchReport, exportReport } from "../services/api";
import { ADMIN_MENU } from "../utils/menus";

const REPORT_LABELS = {
  patient: "Patient Report",
  medicine: "Medicine Report",
  adherence: "Adherence Report",
  missed_dose: "Missed Dose Report",
  caregiver: "Caregiver Report",
  refill: "Refill Prediction Report",
  system_usage: "System Usage Report",
  notification: "Notification Report",
  weekly: "Weekly Report",
  monthly: "Monthly Report",
};

const AdminReports = () => {
  const [types, setTypes] = useState([]);
  const [reportType, setReportType] = useState("adherence");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState("");

  useEffect(() => {
    fetchAdminReports()
      .then((d) => setTypes(d.report_types || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!reportType) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError("");
    fetchReport(reportType, { startDate: startDate || undefined, endDate: endDate || undefined })
      .then(setReport)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [reportType, startDate, endDate]);

  const doExport = (fmt) => {
    setExporting(fmt);
    exportReport(reportType, fmt, {
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    })
      .catch((e) => setError(e.message))
      .finally(() => setExporting(""));
  };

  return (
    <DashboardLayout
      role="Administrator"
      title="Reports"
      subtitle="Generate reports directly from PostgreSQL."
      menu={ADMIN_MENU}
    >
      {error && <p className="error-message">{error}</p>}

      <section className="panel">
        <div className="filter-bar">
          <select
            className="input"
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
          >
            {types.map((t) => (
              <option key={t} value={t}>
                {REPORT_LABELS[t] || t}
              </option>
            ))}
          </select>

          <input
            type="date"
            className="input"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            aria-label="Start date"
          />
          <input
            type="date"
            className="input"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            aria-label="End date"
          />
        </div>

        <div className="filter-bar">
          <span className="list-item__name">Export:</span>
          <button
            className="action-btn"
            disabled={!!exporting}
            onClick={() => doExport("csv")}
          >
            {exporting === "csv" ? "Preparing…" : "⤓ CSV"}
          </button>
          <button
            className="action-btn"
            disabled={!!exporting}
            onClick={() => doExport("xlsx")}
          >
            {exporting === "xlsx" ? "Preparing…" : "⤓ Excel"}
          </button>
          <button
            className="action-btn"
            disabled={!!exporting}
            onClick={() => doExport("pdf")}
          >
            {exporting === "pdf" ? "Preparing…" : "⤓ PDF"}
          </button>
        </div>
      </section>

      {loading ? (
        <p className="empty">Generating report…</p>
      ) : !report || !report.rows || report.rows.length === 0 ? (
        <p className="empty">No data available for this report.</p>
      ) : (
        <section className="panel">
          <div className="panel__head">
            <h2 className="panel__title">
              {REPORT_LABELS[report.report_type] || report.report_type}
            </h2>
            <p className="list-item__desc">
              {report.rows.length} row(s)
              {report.start_date ? ` · ${report.start_date}` : ""}
              {report.end_date ? ` → ${report.end_date}` : ""}
            </p>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  {report.headers.map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {report.rows.map((row, i) => (
                  <tr key={i}>
                    {row.map((cell, j) => (
                      <td key={j}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </DashboardLayout>
  );
};

export default AdminReports;