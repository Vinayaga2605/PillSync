import React from "react";
import { Bell } from "lucide-react";

import NotificationPanel from "../../components/notifications/NotificationPanel";
import PushNotification from "../../components/notifications/PushNotification";
import NotificationHistory from "../../components/notifications/NotificationHistory";

const styles = `
  .pillsync-notifications-page {
    min-height: 100%;
    background: #f7f9fc;
    padding: 28px;
    color: #172033;
    box-sizing: border-box;
  }

  .pillsync-notifications-page *,
  .pillsync-notifications-page *::before,
  .pillsync-notifications-page *::after {
    box-sizing: border-box;
  }

  .pillsync-notifications-container {
    max-width: 1180px;
    margin: 0 auto;
  }

  .pillsync-notifications-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 20px;
    margin-bottom: 24px;
  }

  .pillsync-notifications-header-left {
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .pillsync-notifications-header-icon {
    width: 48px;
    height: 48px;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #e0f2fe;
    color: #0284c7;
  }

  .pillsync-notifications-eyebrow {
    margin: 0 0 5px;
    font-size: 12px;
    font-weight: 700;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .pillsync-notifications-title {
    margin: 0;
    font-size: 28px;
    font-weight: 700;
    color: #172033;
  }

  .pillsync-notifications-subtitle {
    margin: 5px 0 0;
    color: #64748b;
    font-size: 14px;
  }

  .pillsync-notification-section {
    width: 100%;
    background: #ffffff;
    border: 1px solid #e7ebf0;
    border-radius: 16px;
    box-shadow: 0 6px 18px rgba(15, 23, 42, 0.05);
    margin-bottom: 18px;
    overflow: hidden;
  }

  .pillsync-section-header {
    padding: 20px 22px;
    border-bottom: 1px solid #edf1f5;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
  }

  .pillsync-section-header h2 {
    margin: 0;
    color: #172033;
    font-size: 18px;
    font-weight: 700;
  }

  .pillsync-section-header p {
    margin: 5px 0 0;
    color: #64748b;
    font-size: 13px;
  }

  .pillsync-section-body {
    padding: 20px 22px;
  }

  .pillsync-count-badge {
    background: #eff6ff;
    color: #2563eb;
    border: 1px solid #dbeafe;
    padding: 6px 11px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 700;
    white-space: nowrap;
  }

  .pillsync-clear-btn {
    border: 1px solid #fecaca;
    background: #fff;
    color: #dc2626;
    padding: 8px 12px;
    border-radius: 9px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
  }

  .pillsync-clear-btn:hover {
    background: #fef2f2;
  }

  .pillsync-notification-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .pillsync-notification-item {
    display: flex;
    gap: 14px;
    padding: 16px;
    border: 1px solid #e7ebf0;
    border-radius: 14px;
    background: #fff;
    transition: 0.2s ease;
  }

  .pillsync-notification-item:hover {
    border-color: #cbd5e1;
    box-shadow: 0 5px 14px rgba(15, 23, 42, 0.04);
  }

  .pillsync-notification-item.unread {
    background: #f8fbff;
    border-color: #bfdbfe;
  }

  .pillsync-notification-icon {
    width: 44px;
    height: 44px;
    min-width: 44px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f1f5f9;
    color: #2563eb;
  }

  .pillsync-notification-item.unread .pillsync-notification-icon {
    background: #e0f2fe;
    color: #0284c7;
  }

  .pillsync-notification-content {
    flex: 1;
    min-width: 0;
  }

  .pillsync-notification-title-row {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .pillsync-notification-title {
    margin: 0;
    font-size: 15px;
    font-weight: 700;
    color: #172033;
  }

  .pillsync-new-badge {
    background: #dbeafe;
    color: #1d4ed8;
    border-radius: 999px;
    padding: 3px 8px;
    font-size: 10px;
    font-weight: 700;
  }

  .pillsync-notification-message {
    margin: 7px 0;
    color: #475569;
    font-size: 13px;
    line-height: 1.55;
  }

  .pillsync-notification-time {
    color: #94a3b8;
    font-size: 11px;
  }

  .pillsync-notification-actions {
    display: flex;
    gap: 8px;
    margin-top: 11px;
  }

  .pillsync-action-btn {
    border: none;
    border-radius: 8px;
    padding: 7px 11px;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
  }

  .pillsync-read-btn {
    background: #ecfdf5;
    color: #047857;
  }

  .pillsync-read-btn:hover {
    background: #d1fae5;
  }

  .pillsync-delete-btn {
    background: #fef2f2;
    color: #dc2626;
  }

  .pillsync-delete-btn:hover {
    background: #fee2e2;
  }

  .pillsync-empty-state {
    text-align: center;
    padding: 42px 20px;
  }

  .pillsync-empty-icon {
    width: 54px;
    height: 54px;
    margin: 0 auto 12px;
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f1f5f9;
    color: #94a3b8;
  }

  .pillsync-empty-state h3 {
    margin: 0 0 5px;
    color: #334155;
    font-size: 15px;
  }

  .pillsync-empty-state p {
    margin: 0;
    color: #94a3b8;
    font-size: 13px;
  }

  .pillsync-error {
    margin-bottom: 14px;
    padding: 10px 12px;
    border-radius: 9px;
    background: #fef2f2;
    border: 1px solid #fecaca;
    color: #b91c1c;
    font-size: 12px;
  }

  .pillsync-push-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 18px;
  }

  .pillsync-toggle {
    min-width: 64px;
    border: none;
    border-radius: 9px;
    padding: 9px 14px;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
  }

  .pillsync-toggle.on {
    background: #dcfce7;
    color: #15803d;
  }

  .pillsync-toggle.off {
    background: #f1f5f9;
    color: #64748b;
  }

  .pillsync-toggle:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .pillsync-push-status {
    margin-top: 18px;
    padding: 15px;
    border-radius: 12px;
    display: flex;
    gap: 12px;
    align-items: center;
    background: #f8fafc;
    border: 1px solid #e7ebf0;
  }

  .pillsync-push-status-icon {
    width: 40px;
    height: 40px;
    min-width: 40px;
    border-radius: 11px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #e0f2fe;
    color: #0284c7;
  }

  .pillsync-push-status strong {
    display: block;
    color: #334155;
    font-size: 13px;
  }

  .pillsync-push-status p {
    margin: 4px 0 0;
    color: #64748b;
    font-size: 12px;
    line-height: 1.5;
  }

  .pillsync-history-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .pillsync-history-item {
    display: flex;
    align-items: center;
    gap: 13px;
    padding: 14px;
    background: #f8fafc;
    border: 1px solid #e7ebf0;
    border-radius: 12px;
  }

  .pillsync-history-icon {
    width: 40px;
    height: 40px;
    min-width: 40px;
    border-radius: 10px;
    background: #ffffff;
    border: 1px solid #e7ebf0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #6366f1;
  }

  .pillsync-history-content {
    flex: 1;
    min-width: 0;
  }

  .pillsync-history-content h4 {
    margin: 0 0 4px;
    color: #334155;
    font-size: 13px;
    font-weight: 700;
  }

  .pillsync-history-content p {
    margin: 0 0 4px;
    color: #64748b;
    font-size: 12px;
    line-height: 1.45;
  }

  .pillsync-history-content small {
    color: #94a3b8;
    font-size: 10px;
  }

  .pillsync-history-status {
    border-radius: 999px;
    padding: 5px 9px;
    font-size: 10px;
    font-weight: 700;
    white-space: nowrap;
  }

  .pillsync-history-status.viewed {
    background: #ecfdf5;
    color: #047857;
  }

  .pillsync-history-status.new {
    background: #eff6ff;
    color: #1d4ed8;
  }

  @media (max-width: 768px) {
    .pillsync-notifications-page {
      padding: 18px 14px;
    }

    .pillsync-notifications-header {
      align-items: flex-start;
    }

    .pillsync-notifications-title {
      font-size: 24px;
    }

    .pillsync-section-header,
    .pillsync-push-header {
      flex-direction: column;
      align-items: flex-start;
    }

    .pillsync-notification-item {
      align-items: flex-start;
    }

    .pillsync-history-item {
      align-items: flex-start;
    }
  }
`;

function Notifications() {
  return (
    <div className="pillsync-notifications-page">
      <style>{styles}</style>

      <div className="pillsync-notifications-container">
        <header className="pillsync-notifications-header">
          <div className="pillsync-notifications-header-left">
            <div className="pillsync-notifications-header-icon">
              <Bell size={24} />
            </div>

            <div>
              <p className="pillsync-notifications-eyebrow">
                Medication Center
              </p>

              <h1 className="pillsync-notifications-title">
                Notifications
              </h1>

              <p className="pillsync-notifications-subtitle">
                Stay updated with medication reminders, missed doses, and
                refill alerts.
              </p>
            </div>
          </div>
        </header>

        <NotificationPanel />
        <PushNotification />
        <NotificationHistory />
      </div>
    </div>
  );
}

export default Notifications;
