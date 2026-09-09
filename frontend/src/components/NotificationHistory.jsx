import React, { useEffect, useState } from "react";
import { getNotifications } from "../services/notificationService";

function NotificationHistory() {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadHistory = async () => {
            try {
                const data = await getNotifications();
                setHistory(data);
            } catch (error) {
                console.error("History loading error:", error);
            } finally {
                setLoading(false);
            }
        };

        loadHistory();
    }, []);

    if (loading) {
        return (
            <div className="notification-history">
                <h2>Notification History</h2>
                <p>Loading history...</p>
            </div>
        );
    }

    return (
        <div className="notification-history">

            <div className="history-header">
                <div>
                    <h2>Notification History</h2>
                    <p>View your previous notifications</p>
                </div>

                <span className="history-count">
                    {history.length}
                </span>
            </div>

            {history.length === 0 ? (
                <div className="empty-history">
                    <p>No notification history available.</p>
                </div>
            ) : (
                <div className="history-list">

                    {history.map((item) => (

                        <div
                            key={item.id}
                            className="history-card"
                        >

                            <div className="history-icon">

                                {item.notification_type === "medicine"
                                    ? "💊"
                                    : item.notification_type === "refill"
                                    ? "🔄"
                                    : item.notification_type === "missed"
                                    ? "⚠️"
                                    : item.notification_type === "appointment"
                                    ? "📅"
                                    : "🔔"}

                            </div>

                            <div className="history-content">

                                <h4>
                                    {item.title}
                                </h4>

                                <p>
                                    {item.message}
                                </p>

                                <small>
                                    {new Date(
                                        item.created_at
                                    ).toLocaleString()}
                                </small>

                            </div>

                            <span
                                className={`history-status ${
                                    item.is_read
                                        ? "viewed"
                                        : "new"
                                }`}
                            >
                                {item.is_read
                                    ? "Viewed"
                                    : "New"}
                            </span>

                        </div>

                    ))}

                </div>
            )}

        </div>
    );
}

export default NotificationHistory;