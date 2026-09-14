import React, { useEffect, useState } from "react";
import {
  Bell,
  BellOff,
  Smartphone,
} from "lucide-react";

function PushNotification() {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const savedPreference = localStorage.getItem(
        "pillsync_push_enabled"
      );

      setEnabled(savedPreference === "true");
    } catch (err) {
      console.error("Failed to load notification setting:", err);
      setError("Unable to load notification settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleNotifications = async () => {
    try {
      setSaving(true);
      setError("");

      const newStatus = !enabled;

      setEnabled(newStatus);

      localStorage.setItem(
        "pillsync_push_enabled",
        String(newStatus)
      );
    } catch (err) {
      console.error(
        "Failed to update notification setting:",
        err
      );

      setError("Unable to update notification settings.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <section className="pillsync-notification-section">
        <div className="pillsync-section-header">
          <div>
            <h2>Notification Settings</h2>
            <p>
              Configure medication alert preferences
            </p>
          </div>

          <button
            type="button"
            className="pillsync-toggle off"
            disabled
          >
            ...
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="pillsync-notification-section">
      <div className="pillsync-section-header">
        <div>
          <h2>Notification Settings</h2>
          <p>
            Enable or disable medication reminders and alerts.
          </p>
        </div>

        <button
          type="button"
          className={`pillsync-toggle ${
            enabled ? "on" : "off"
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

      <div className="pillsync-section-body">
        <div className="pillsync-push-status">
          <div className="pillsync-push-status-icon">
            {enabled ? (
              <Bell size={19} />
            ) : (
              <BellOff size={19} />
            )}
          </div>

          <div>
            <strong>
              {enabled
                ? "Notifications are enabled"
                : "Notifications are disabled"}
            </strong>

            <p>
              {enabled
                ? "PillSync notification alerts are currently enabled for this account."
                : "Enable notifications to stay updated about medication reminders, missed doses, and refill alerts."}
            </p>
          </div>
        </div>

        <div
          style={{
            marginTop: 12,
            display: "flex",
            alignItems: "center",
            gap: 7,
            color: "#64748b",
            fontSize: 11,
          }}
        >
          <Smartphone size={14} />
          <span>
            This setting controls your PillSync notification preference.
          </span>
        </div>

        {error && (
          <div
            className="pillsync-error"
            style={{
              marginTop: 14,
              marginBottom: 0,
            }}
          >
            {error}
          </div>
        )}
      </div>
    </section>
  );
}

export default PushNotification;