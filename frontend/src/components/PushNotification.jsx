import React, { useEffect, useState } from "react";
import api from "../services/api";

function PushNotification() {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadPreference = async () => {
      try {
        const response = await api.get(
          "/notifications/preferences/"
        );

        setEnabled(
          Boolean(response.data.push_enabled)
        );
      } catch (err) {
        console.error(
          "Failed to load notification preference:",
          err
        );
        setError(
          "Unable to load notification settings."
        );
      } finally {
        setLoading(false);
      }
    };

    loadPreference();
  }, []);

  const toggleNotifications = async () => {
    const newStatus = !enabled;

    try {
      setSaving(true);
      setError("");

      const response = await api.put(
        "/notifications/preferences/",
        {
          push_enabled: newStatus,
        }
      );

      setEnabled(
        Boolean(response.data.push_enabled)
      );
    } catch (err) {
      console.error(
        "Failed to update notification preference:",
        err
      );

      setError(
        "Unable to update notification settings."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="pavani-push-notification">
        <div className="pavani-push-header">
          <div>
            <h2>Push Notifications</h2>
            <p>
              Receive medication reminders and alerts
            </p>
          </div>

          <button
            className="pavani-notification-toggle disabled"
            disabled
          >
            ...
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pavani-push-notification">
      <div className="pavani-push-header">
        <div>
          <h2>Push Notifications</h2>
          <p>
            Receive medication reminders and alerts
          </p>
        </div>

        <button
          type="button"
          className={`pavani-notification-toggle ${
            enabled ? "enabled" : "disabled"
          }`}
          onClick={toggleNotifications}
          disabled={saving}
        >
          {saving
            ? "..."
            : enabled
            ? "ON"
            : "OFF"}
        </button>
      </div>

      <div className="pavani-push-status">
        <span className="pavani-push-icon">
          {enabled ? "🔔" : "🔕"}
        </span>

        <div>
          <strong>
            {enabled
              ? "Push notifications are enabled"
              : "Push notifications are disabled"}
          </strong>

          <p>
            {enabled
              ? "You will receive medication reminders and alerts."
              : "Enable notifications to receive medication reminders and alerts."}
          </p>
        </div>
      </div>

      {error && (
        <p
          style={{
            color: "#dc3545",
            marginTop: "15px",
            marginBottom: 0,
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
}

export default PushNotification;



