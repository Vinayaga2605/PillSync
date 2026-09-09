import React, { useEffect, useState } from "react";
import axios from "axios";

function PushNotification() {
    const [enabled, setEnabled] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const API_URL =
        "http://127.0.0.1:8000/api/notifications/preferences/";

    // Load saved preference from Django
    useEffect(() => {
        const loadPreference = async () => {
            try {
                const token = localStorage.getItem("accessToken");

                const response = await axios.get(API_URL, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                console.log("Loaded preference:", response.data);

                setEnabled(Boolean(response.data.push_enabled));
            } catch (error) {
                console.error(
                    "Failed to load notification preference:",
                    error
                );

                setError("Unable to load notification settings.");
            } finally {
                setLoading(false);
            }
        };

        loadPreference();
    }, []);

    // Toggle ON / OFF
    const toggleNotifications = async () => {
        const newStatus = !enabled;

        console.log("Changing notification status to:", newStatus);

        try {
            setSaving(true);
            setError("");

            const token = localStorage.getItem("accessToken");

            const response = await axios.put(
                API_URL,
                {
                    push_enabled: newStatus,
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                }
            );

            console.log("Updated preference:", response.data);

            setEnabled(Boolean(response.data.push_enabled));

        } catch (error) {
            console.error(
                "Failed to update notification preference:",
                error
            );

            if (error.response) {
                console.error(
                    "Backend response:",
                    error.response.data
                );
            }

            setError("Unable to update notification settings.");
        } finally {
            setSaving(false);
        }
    };

    // Loading
    if (loading) {
        return (
            <div className="push-notification">

                <div className="push-header">

                    <div>
                        <h2>Push Notifications</h2>

                        <p>
                            Receive medication reminders and alerts
                        </p>
                    </div>

                    <button
                        className="notification-toggle disabled"
                        disabled
                    >
                        ...
                    </button>

                </div>

            </div>
        );
    }

    return (
        <div className="push-notification">

            <div className="push-header">

                <div>
                    <h2>Push Notifications</h2>

                    <p>
                        Receive medication reminders and alerts
                    </p>
                </div>

                <button
                    type="button"
                    className={`notification-toggle ${
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

            <div className="push-status">

                <span className="push-icon">
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
                <p style={{ color: "red", marginTop: "10px" }}>
                    {error}
                </p>
            )}

        </div>
    );
}

export default PushNotification;