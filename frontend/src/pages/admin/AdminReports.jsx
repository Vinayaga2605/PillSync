import React, { useEffect, useState } from "react";
import {
  FileText,
  Download,
  FileSpreadsheet,
  FileDown,
  RefreshCw,
  AlertTriangle,
  CalendarDays,
  BarChart3,
} from "lucide-react";

import {
  fetchAdminReports,
  fetchReport,
  exportReport,
} from "../../services/api";

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
  const [reportType, setReportType] =
    useState("adherence");

  const [startDate, setStartDate] =
    useState("");
  const [endDate, setEndDate] =
    useState("");

  const [report, setReport] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [exporting, setExporting] =
    useState("");

  const loadReportTypes = async () => {
    try {
      setLoading(true);
      setError("");

      const data =
        await fetchAdminReports();

      const availableTypes =
        Array.isArray(data?.report_types)
          ? data.report_types
          : [];

      setTypes(availableTypes);

      if (
        availableTypes.length > 0 &&
        !availableTypes.includes(reportType)
      ) {
        setReportType(
          availableTypes[0]
        );
      }
    } catch (err) {
      console.error(
        "Report types error:",
        err
      );

      setError(
        err?.response?.data?.detail ||
          err?.message ||
          "Unable to load report types."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReportTypes();
  }, []);

  useEffect(() => {
    if (!reportType) {
      return;
    }

    const loadReportData = async () => {
      try {
        setLoading(true);
        setError("");
        setReport(null);

        const data = await fetchReport(
          reportType,
          {
            startDate:
              startDate || undefined,
            endDate:
              endDate || undefined,
          }
        );

        setReport(data || null);
      } catch (err) {
        console.error(
          "Report generation error:",
          err
        );

        setError(
          err?.response?.data?.detail ||
            err?.message ||
            "Unable to generate report."
        );
      } finally {
        setLoading(false);
      }
    };

    loadReportData();
  }, [
    reportType,
    startDate,
    endDate,
  ]);

  const doExport = async (format) => {
    try {
      setExporting(format);
      setError("");

      await exportReport(
        reportType,
        format,
        {
          startDate:
            startDate || undefined,
          endDate:
            endDate || undefined,
        }
      );
    } catch (err) {
      console.error(
        "Report export error:",
        err
      );

      setError(
        err?.response?.data?.detail ||
          err?.message ||
          `Unable to export ${format.toUpperCase()} report.`
      );
    } finally {
      setExporting("");
    }
  };

  const headers = Array.isArray(
    report?.headers
  )
    ? report.headers
    : [];

  const rows = Array.isArray(
    report?.rows
  )
    ? report.rows
    : [];

  return (
    <div className="admin-reports-page">
      <style>{styles}</style>

      {/* HEADER */}

      <header className="reports-header">
        <div>
          <p className="reports-eyebrow">
            Administration
          </p>

          <h1>Reports</h1>

          <p>
            Generate and export PillSync
            reports using the selected date
            range.
          </p>
        </div>

        <button
          className="reports-refresh-btn"
          type="button"
          onClick={loadReportTypes}
          disabled={loading}
        >
          <RefreshCw size={17} />
          Refresh
        </button>
      </header>

      {/* ERROR */}

      {error && (
        <div className="reports-error">
          <AlertTriangle size={18} />

          <span>{error}</span>

          <button
            type="button"
            onClick={() => setError("")}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* FILTER PANEL */}

      <section className="reports-panel">
        <div className="reports-panel-header">
          <div className="reports-title-wrap">
            <div className="reports-title-icon">
              <FileText size={20} />
            </div>

            <div>
              <h2>
                Report Configuration
              </h2>

              <p>
                Choose the report and date
                range you want to inspect.
              </p>
            </div>
          </div>
        </div>

        <div className="reports-filter-grid">
          <div className="reports-field">
            <label htmlFor="reportType">
              Report Type
            </label>

            <div className="reports-input-wrap">
              <BarChart3 size={16} />

              <select
                id="reportType"
                value={reportType}
                onChange={(e) =>
                  setReportType(
                    e.target.value
                  )
                }
              >
                {types.length === 0 ? (
                  <option value="">
                    No report types available
                  </option>
                ) : (
                  types.map((type) => (
                    <option
                      key={type}
                      value={type}
                    >
                      {REPORT_LABELS[type] ||
                        type}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          <div className="reports-field">
            <label htmlFor="startDate">
              Start Date
            </label>

            <div className="reports-input-wrap">
              <CalendarDays size={16} />

              <input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) =>
                  setStartDate(
                    e.target.value
                  )
                }
              />
            </div>
          </div>

          <div className="reports-field">
            <label htmlFor="endDate">
              End Date
            </label>

            <div className="reports-input-wrap">
              <CalendarDays size={16} />

              <input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) =>
                  setEndDate(
                    e.target.value
                  )
                }
              />
            </div>
          </div>
        </div>

        <div className="reports-export-area">
          <div>
            <p className="export-title">
              Export Report
            </p>

            <p className="export-description">
              Download the current report in
              your preferred format.
            </p>
          </div>

          <div className="export-buttons">
            <button
              className="export-btn"
              type="button"
              disabled={!!exporting}
              onClick={() =>
                doExport("csv")
              }
            >
              <Download size={16} />

              {exporting === "csv"
                ? "Preparing..."
                : "CSV"}
            </button>

            <button
              className="export-btn"
              type="button"
              disabled={!!exporting}
              onClick={() =>
                doExport("xlsx")
              }
            >
              <FileSpreadsheet
                size={16}
              />

              {exporting === "xlsx"
                ? "Preparing..."
                : "Excel"}
            </button>

            <button
              className="export-btn"
              type="button"
              disabled={!!exporting}
              onClick={() =>
                doExport("pdf")
              }
            >
              <FileDown size={16} />

              {exporting === "pdf"
                ? "Preparing..."
                : "PDF"}
            </button>
          </div>
        </div>
      </section>

      {/* REPORT RESULT */}

      <section className="reports-panel">
        <div className="reports-panel-header">
          <div>
            <p className="reports-kicker">
              Generated report
            </p>

            <h2>
              {REPORT_LABELS[
                report?.report_type
              ] ||
                REPORT_LABELS[
                  reportType
                ] ||
                "Report"}
            </h2>

            <p>
              {rows.length} row
              {rows.length === 1
                ? ""
                : "s"} available.
            </p>
          </div>

          {report && (
            <span className="report-count">
              {rows.length} records
            </span>
          )}
        </div>

        {loading ? (
          <div className="reports-state">
            <div className="reports-spinner" />

            <p>
              Generating report...
            </p>
          </div>
        ) : !report ||
          rows.length === 0 ? (
          <div className="reports-state">
            <FileText size={30} />

            <h3>
              No data available
            </h3>

            <p>
              There is no data available for
              the selected report and date
              range.
            </p>
          </div>
        ) : (
          <>
            <div className="report-meta">
              <span>
                {rows.length} record
                {rows.length === 1
                  ? ""
                  : "s"}
              </span>

              {report.start_date && (
                <span>
                  From{" "}
                  {report.start_date}
                </span>
              )}

              {report.end_date && (
                <span>
                  To {report.end_date}
                </span>
              )}
            </div>

            <div className="reports-table-wrap">
              <table className="reports-table">
                <thead>
                  <tr>
                    {headers.map(
                      (header) => (
                        <th key={header}>
                          {header}
                        </th>
                      )
                    )}
                  </tr>
                </thead>

                <tbody>
                  {rows.map(
                    (row, rowIndex) => (
                      <tr
                        key={rowIndex}
                      >
                        {Array.isArray(
                          row
                        ) ? (
                          row.map(
                            (
                              cell,
                              cellIndex
                            ) => (
                              <td
                                key={
                                  cellIndex
                                }
                              >
                                {cell}
                              </td>
                            )
                          )
                        ) : (
                          <td
                            colSpan={
                              headers.length ||
                              1
                            }
                          >
                            {String(row)}
                          </td>
                        )}
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
};

const styles = `
  .admin-reports-page {
    min-height: calc(100vh - 80px);
    padding: 28px;
    background: #f7f9fc;
    color: #172033;
  }

  .reports-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 24px;
  }

  .reports-eyebrow,
  .reports-kicker {
    margin: 0 0 6px;
    color: #0f9488;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .08em;
  }

  .reports-header h1 {
    margin: 0;
    color: #172033;
    font-size: 30px;
    font-weight: 750;
  }

  .reports-header > div > p:last-child {
    margin: 7px 0 0;
    color: #697386;
    font-size: 14px;
  }

  .reports-refresh-btn {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    border: 1px solid #dce3eb;
    border-radius: 10px;
    padding: 10px 14px;
    background: #fff;
    color: #344054;
    font-size: 13px;
    font-weight: 650;
    cursor: pointer;
  }

  .reports-refresh-btn:hover {
    background: #f9fafb;
  }

  .reports-refresh-btn:disabled {
    opacity: .55;
    cursor: not-allowed;
  }

  .reports-error {
    display: flex;
    align-items: center;
    gap: 9px;
    margin-bottom: 18px;
    padding: 12px 14px;
    border: 1px solid #fecaca;
    border-radius: 10px;
    background: #fff5f5;
    color: #b42318;
    font-size: 13px;
  }

  .reports-error button {
    margin-left: auto;
    border: 0;
    background: transparent;
    color: inherit;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
  }

  .reports-panel {
    margin-bottom: 18px;
    padding: 20px;
    border: 1px solid #e7ebf0;
    border-radius: 14px;
    background: #fff;
    box-shadow: 0 2px 8px rgba(15, 23, 42, .03);
  }

  .reports-panel-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 15px;
    margin-bottom: 20px;
  }

  .reports-title-wrap {
    display: flex;
    align-items: center;
    gap: 11px;
  }

  .reports-title-icon {
    width: 42px;
    height: 42px;
    min-width: 42px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 11px;
    background: #e8f8f6;
    color: #0f9488;
  }

  .reports-panel h2 {
    margin: 0;
    color: #172033;
    font-size: 19px;
  }

  .reports-panel-header p:last-child {
    margin: 4px 0 0;
    color: #7b8495;
    font-size: 12px;
  }

  .reports-filter-grid {
    display: grid;
    grid-template-columns: 1.4fr 1fr 1fr;
    gap: 14px;
  }

  .reports-field label {
    display: block;
    margin-bottom: 7px;
    color: #475467;
    font-size: 12px;
    font-weight: 650;
  }

  .reports-input-wrap {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 11px;
    border: 1px solid #dce2e9;
    border-radius: 9px;
    color: #98a2b3;
  }

  .reports-input-wrap:focus-within {
    border-color: #14b8a6;
    box-shadow: 0 0 0 3px rgba(20, 184, 166, .1);
  }

  .reports-input-wrap input,
  .reports-input-wrap select {
    width: 100%;
    min-width: 0;
    border: 0;
    outline: 0;
    padding: 11px 0;
    background: transparent;
    color: #172033;
    font-size: 13px;
  }

  .reports-export-area {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 15px;
    margin-top: 18px;
    padding-top: 18px;
    border-top: 1px solid #edf0f3;
  }

  .export-title {
    margin: 0;
    color: #344054;
    font-size: 13px;
    font-weight: 650;
  }

  .export-description {
    margin: 4px 0 0;
    color: #98a2b3;
    font-size: 11px;
  }

  .export-buttons {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .export-btn {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    border: 1px solid #dce3eb;
    border-radius: 8px;
    padding: 9px 12px;
    background: #fff;
    color: #344054;
    font-size: 12px;
    font-weight: 650;
    cursor: pointer;
  }

  .export-btn:hover {
    border-color: #9ddbd3;
    background: #f7fffd;
    color: #0f766e;
  }

  .export-btn:disabled {
    opacity: .55;
    cursor: not-allowed;
  }

  .report-count {
    padding: 6px 10px;
    border-radius: 999px;
    background: #eef8f7;
    color: #0f766e;
    font-size: 11px;
    font-weight: 700;
  }

  .report-meta {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 15px;
  }

  .report-meta span {
    padding: 6px 9px;
    border-radius: 7px;
    background: #f2f4f7;
    color: #667085;
    font-size: 11px;
  }

  .reports-table-wrap {
    width: 100%;
    overflow-x: auto;
  }

  .reports-table {
    width: 100%;
    min-width: 700px;
    border-collapse: collapse;
  }

  .reports-table th {
    padding: 11px 12px;
    border-bottom: 1px solid #e7ebf0;
    background: #f8fafc;
    color: #667085;
    text-align: left;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
  }

  .reports-table td {
    padding: 12px;
    border-bottom: 1px solid #edf0f3;
    color: #475467;
    font-size: 13px;
    vertical-align: top;
  }

  .reports-table tbody tr:hover {
    background: #fbfdfd;
  }

  .reports-state {
    min-height: 260px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    text-align: center;
    color: #98a2b3;
  }

  .reports-state h3 {
    margin: 10px 0 5px;
    color: #344054;
    font-size: 15px;
  }

  .reports-state p {
    margin: 5px 0 0;
    color: #98a2b3;
    font-size: 12px;
  }

  .reports-spinner {
    width: 28px;
    height: 28px;
    border: 3px solid #d8eeeb;
    border-top-color: #14b8a6;
    border-radius: 50%;
    animation: reports-spin .7s linear infinite;
  }

  @keyframes reports-spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (max-width: 850px) {
    .reports-filter-grid {
      grid-template-columns: 1fr;
    }

    .reports-export-area {
      align-items: flex-start;
      flex-direction: column;
    }

    .export-buttons {
      width: 100%;
    }
  }

  @media (max-width: 600px) {
    .admin-reports-page {
      padding: 18px;
    }

    .reports-header {
      flex-direction: column;
    }

    .reports-header h1 {
      font-size: 25px;
    }

    .reports-refresh-btn {
      width: 100%;
    }
  }
`;

export default AdminReports;