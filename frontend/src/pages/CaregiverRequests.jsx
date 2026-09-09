import { useEffect, useState } from "react";

import DashboardLayout from "../components/DashboardLayout";
import {
  fetchCaregiverRequests,
  acceptCaregiverRequest,
  declineCaregiverRequest,
} from "../services/api";
import { CAREGIVER_MENU } from "../utils/menus";

const severityBadge = (severity) =>
  severity === "severe"
    ? "badge--danger"
    : severity === "moderate"
      ? "badge--warning"
      : "badge--success";

const CaregiverRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    fetchCaregiverRequests()
      .then(setRequests)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const handleAccept = async (patientId, name) => {
    setBusyId(patientId);
    setError("");
    setNotice("");
    try {
      await acceptCaregiverRequest(patientId);
      setNotice(`${name} is now under your care.`);
      setRequests((prev) => prev.filter((r) => r.user_id !== patientId));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  };

  const handleDecline = async (patientId, name) => {
    setBusyId(patientId);
    setError("");
    setNotice("");
    try {
      await declineCaregiverRequest(patientId);
      setNotice(`You declined ${name}'s request.`);
      setRequests((prev) => prev.filter((r) => r.user_id !== patientId));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <DashboardLayout
      role="Caregiver"
      title="Patient Requests"
      subtitle={
        requests.length > 0
          ? `${requests.length} patient(s) waiting for your approval.`
          : "No pending patient requests."
      }
      menu={CAREGIVER_MENU}
    >
      {error && <p className="error-message">{error}</p>}
      {notice && <p className="success-message">{notice}</p>}

      {loading ? (
        <p className="empty">Loading patient requests…</p>
      ) : requests.length === 0 ? (
        <section className="panel">
          <div className="panel__head">
            <h2 className="panel__title">Incoming requests</h2>
          </div>
          <p className="empty">
            No patients have requested your care yet. When a patient asks you to
            be their caregiver, the request will appear here for approval.
          </p>
        </section>
      ) : (
        <div className="list">
          {requests.map((r) => (
            <div className="list-item" key={r.user_id}>
              <span className="list-item__icon">🩺</span>
              <div className="list-item__body">
                <p className="list-item__name">{r.full_name}</p>
                <p className="list-item__desc">
                  {r.email} · {r.phone || "no phone"}
                  {r.dob ? ` · ${r.dob}` : ""}
                </p>
                <p className="list-item__desc">
                  {r.gender || "Gender N/A"} ·{" "}
                  {r.blood_group ? `Blood ${r.blood_group}` : "Blood N/A"}
                  {r.emergency_contact
                    ? ` · Emergency ${r.emergency_contact}`
                    : ""}
                </p>
                <p className="list-item__desc">
                  {r.medication_count || 0} scheduled medication(s)
                  {r.requested_at
                    ? ` · requested ${new Date(r.requested_at).toLocaleDateString()}`
                    : ""}
                </p>
                {r.conditions.length > 0 && (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                    {r.conditions.map((c, i) => (
                      <span
                        key={`${c.condition}-${i}`}
                        className={`badge ${severityBadge(c.severity)}`}
                      >
                        {c.condition}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="list-item__value" style={{ display: "flex", gap: 8 }}>
                <button
                  className="action-btn action-btn--sm"
                  disabled={busyId === r.user_id}
                  onClick={() => handleAccept(r.user_id, r.full_name)}
                >
                  {busyId === r.user_id ? "…" : "Accept"}
                </button>
                <button
                  className="action-btn action-btn--sm action-btn--danger"
                  disabled={busyId === r.user_id}
                  onClick={() => handleDecline(r.user_id, r.full_name)}
                >
                  {busyId === r.user_id ? "…" : "Decline"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
};

export default CaregiverRequests;