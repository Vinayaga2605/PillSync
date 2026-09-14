import React, { useEffect, useState } from "react";
import {
  Bell,
  Pill,
  RefreshCw,
  AlertTriangle,
  CalendarDays,
  Info,
} from "lucide-react";

import api from "../../services/api";

function NotificationHistory() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const response = await api.get(
          "/notifications/?history=true"
        );

        const data = response.data;

        setHistory(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("History loading error:", error);
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, []);

  const getType = (item) =>
    item?.type ||
    item?.notification_type ||
    "system";

  const getIcon = (type) => {
    switch (type) {
      case "medicine":
      case "reminder":
        return <Pill size={18} />;

      case "refill":
        return <RefreshCw size={18} />;

      case "missed":
        return <AlertTriangle size={18} />;

      case "appointment":
        return <CalendarDays size={18} />;

      default:
        return <Info size={18} />;
    }
  };

  if (loading) {
    return (
      <section className="pillsync-notification-section">
        <div className="pillsync-section-header">
          <div>
            <h2>Notification History</h2>
            <p>
              View your previous medication notifications
            </p>
          </div>
        </div>

        <div className="pillsync-section-body">
          <div className="pillsync-empty-state">
            <div className="pillsync-empty-icon">
              <Bell size={24} />
            </div>

            <h3>Loading history</h3>

            <p>
              Retrieving your notification history...
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="pillsync-notification-section">
      <div className="pillsync-section-header">
        <div>
          <h2>Notification History</h2>
          <p>
            Previous medication alerts remain available here
          </p>
        </div>

        <span className="pillsync-count-badge">
          {history.length} total
        </span>
      </div>

      <div className="pillsync-section-body">
        {history.length === 0 ? (
          <div className="pillsync-empty-state">
            <div className="pillsync-empty-icon">
              <Bell size={24} />
            </div>

            <h3>No notification history</h3>

            <p>
              Previous medication alerts will appear here.
            </p>
          </div>
        ) : (
          <div className="pillsync-history-list">
            {history.map((item) => {
              const type = getType(item);

              return (
                <div
                  key={item.id}
                  className="pillsync-history-item"
                >
                  <div className="pillsync-history-icon">
                    {getIcon(type)}
                  </div>

                  <div className="pillsync-history-content">
                    <h4>
                      {item.title || "Notification"}
                    </h4>

                    <p>
                      {item.message ||
                        "No message available."}
                    </p>

                    <small>
                      {item.created_at
                        ? new Date(
                            item.created_at
                          ).toLocaleString()
                        : ""}
                    </small>
                  </div>

                  <span
                    className={`pillsync-history-status ${
                      item.is_read ? "viewed" : "new"
                    }`}
                  >
                    {item.is_read ? "Viewed" : "New"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

export default NotificationHistory;
