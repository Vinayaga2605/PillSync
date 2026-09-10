import React, { useEffect, useState } from "react";
import { getNotifications } from "../services/notificationService";

function NotificationHistory() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const data = await getNotifications();
        setHistory(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error(
          "History loading error:",
          error
        );
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, []);

  const getIcon = (type) => {
    switch (type) {
      case "medicine":
        return "💊";
      case "refill":
        return "🔄";
      case "missed":
        return "⚠️";
      case "appointment":
        return "📅";
      default:
        return "🔔";
    }
  };

  if (loading) {
    return (
      <div className="pavani-notification-history">
        <div className="pavani-history-header">
          <div>
            <h2>Notification History</h2>
            <p>Loading history...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pavani-notification-history">
      <div className="pavani-history-header">
        <div>
          <h2>Notification History</h2>
          <p>View your previous notifications</p>
        </div>

        <span className="pavani-history-count">
          {history.length}
        </span>
      </div>

      {history.length === 0 ? (
        <div className="pavani-empty-notifications">
          <p>No notification history available.</p>
        </div>
      ) : (
        <div>
          {history.map((item) => (
            <div
              key={item.id}
              className="pavani-history-card"
            >
              <div className="pavani-history-icon">
                {getIcon(item.notification_type)}
              </div>

              <div className="pavani-history-content">
                <h4>{item.title}</h4>

                <p>{item.message}</p>

                <small>
                  {item.created_at
                    ? new Date(
                        item.created_at
                      ).toLocaleString()
                    : ""}
                </small>
              </div>

              <span
                className={`pavani-history-status ${
                  item.is_read ? "viewed" : "new"
                }`}
              >
                {item.is_read ? "Viewed" : "New"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default NotificationHistory;



