import React from "react";
import NotificationPanel from "../../components/NotificationPanel";
import PushNotification from "../../components/PushNotification";
import NotificationHistory from "../../components/NotificationHistory";

function Notifications() {
  return (
    <>
      <style>{`
        .pavani-notifications-page {
          max-width: 1200px;
          margin: 0 auto;
          padding: 30px 20px;
          font-family: Arial, sans-serif;
          background: #f4f8fb;
          min-height: 100vh;
          box-sizing: border-box;
        }

        .pavani-notifications-page *,
        .pavani-notifications-page *::before,
        .pavani-notifications-page *::after {
          box-sizing: border-box;
        }

        .pavani-notifications-title {
          text-align: center;
          margin: 0 0 30px;
          color: #0d6efd;
          font-size: 32px;
          font-weight: 500;
        }

        .pavani-notification-panel,
        .pavani-push-notification,
        .pavani-notification-history {
          width: 100%;
          background: #ffffff;
          padding: 24px;
          border-radius: 16px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
        }

        .pavani-notification-panel {
          margin-bottom: 20px;
        }

        .pavani-panel-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 15px;
          margin-bottom: 15px;
        }

        .pavani-panel-header h2,
        .pavani-push-notification h2,
        .pavani-notification-history h2 {
          margin: 0 0 6px;
          color: #222222;
          font-size: 22px;
          font-weight: 500;
        }

        .pavani-panel-subtitle {
          margin: 0;
          color: #777777;
          font-size: 14px;
        }

        .pavani-notification-count {
          background: #0d6efd;
          color: white;
          padding: 7px 12px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: bold;
          white-space: nowrap;
        }

        .pavani-clear-all-container {
          text-align: right;
          margin-bottom: 15px;
        }

        .pavani-clear-all-btn {
          background: transparent;
          color: #dc3545;
          border: 1px solid #dc3545;
          padding: 7px 12px;
          border-radius: 7px;
          cursor: pointer;
        }

        .pavani-clear-all-btn:hover {
          background: #dc3545;
          color: white;
        }

        .pavani-notification-card {
          display: flex;
          gap: 15px;
          width: 100%;
          padding: 16px;
          margin-bottom: 14px;
          border-radius: 12px;
          background: #f8f9fa;
          border-left: 5px solid #cccccc;
        }

        .pavani-notification-card.unread {
          border-left-color: #dc3545;
          background: #fff8f8;
        }

        .pavani-notification-card.read {
          border-left-color: #198754;
        }

        .pavani-notification-icon {
          width: 45px;
          height: 45px;
          min-width: 45px;
          display: flex;
          justify-content: center;
          align-items: center;
          background: white;
          border-radius: 50%;
          font-size: 22px;
        }

        .pavani-notification-content {
          flex: 1;
          min-width: 0;
        }

        .pavani-notification-title-row {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .pavani-notification-title-row h3 {
          margin: 0;
          color: #222222;
          font-size: 17px;
          font-weight: 600;
        }

        .pavani-notification-content p {
          margin: 7px 0;
          color: #555555;
        }

        .pavani-notification-content small {
          color: #888888;
        }

        .pavani-new-badge {
          background: #dc3545;
          color: white;
          font-size: 10px;
          padding: 3px 7px;
          border-radius: 10px;
          font-weight: bold;
        }

        .pavani-notification-buttons {
          display: flex;
          gap: 8px;
          margin-top: 12px;
        }

        .pavani-notification-buttons button {
          padding: 7px 12px;
          border: none;
          border-radius: 7px;
          cursor: pointer;
        }

        .pavani-read-btn {
          background: #198754;
          color: white;
        }

        .pavani-delete-btn {
          background: #dc3545;
          color: white;
        }

        .pavani-notification-buttons button:hover {
          opacity: 0.85;
        }

        .pavani-empty-notifications {
          text-align: center;
          padding: 40px 20px;
        }

        .pavani-empty-icon {
          font-size: 45px;
          margin-bottom: 10px;
        }

        .pavani-empty-notifications h3 {
          margin: 0 0 5px;
          color: #222222;
        }

        .pavani-empty-notifications p {
          color: #777777;
          margin: 0;
        }

        .pavani-notification-error {
          color: #dc3545;
          margin-bottom: 15px;
        }

        .pavani-push-notification {
          margin-bottom: 20px;
        }

        .pavani-push-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 10px;
        }

        .pavani-push-header p {
          color: #666666;
          line-height: 1.5;
          margin: 0;
        }

        .pavani-notification-toggle {
          padding: 10px 18px;
          border: none;
          border-radius: 8px;
          color: white;
          cursor: pointer;
          font-weight: bold;
          min-width: 70px;
        }

        .pavani-notification-toggle.enabled {
          background: #198754;
        }

        .pavani-notification-toggle.disabled {
          background: #dc3545;
        }

        .pavani-notification-toggle:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .pavani-push-status {
          display: flex;
          align-items: center;
          gap: 15px;
          padding: 15px;
          margin-top: 20px;
          background: #f8f9fa;
          border-radius: 10px;
        }

        .pavani-push-icon {
          font-size: 32px;
          min-width: 45px;
        }

        .pavani-push-status strong {
          color: #222222;
        }

        .pavani-push-status p {
          margin: 5px 0 0;
          color: #666666;
        }

        .pavani-notification-history {
          margin-top: 0;
        }

        .pavani-history-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .pavani-history-header h2 {
          margin-bottom: 5px;
        }

        .pavani-history-header p {
          margin: 0;
          color: #777777;
        }

        .pavani-history-count {
          background: #6c757d;
          color: white;
          padding: 7px 12px;
          border-radius: 20px;
        }

        .pavani-history-card {
          display: flex;
          align-items: center;
          gap: 15px;
          padding: 15px;
          margin-bottom: 12px;
          background: #f8f9fa;
          border-radius: 10px;
        }

        .pavani-history-icon {
          font-size: 24px;
          width: 45px;
          height: 45px;
          min-width: 45px;
          display: flex;
          justify-content: center;
          align-items: center;
          background: white;
          border-radius: 50%;
        }

        .pavani-history-content {
          flex: 1;
          min-width: 0;
        }

        .pavani-history-content h4 {
          margin: 0 0 5px;
          color: #222222;
        }

        .pavani-history-content p {
          margin: 0 0 5px;
          color: #555555;
        }

        .pavani-history-content small {
          color: #888888;
        }

        .pavani-history-status {
          padding: 5px 9px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: bold;
          white-space: nowrap;
        }

        .pavani-history-status.viewed {
          background: #cff4fc;
          color: #055160;
        }

        .pavani-history-status.new {
          background: #f8d7da;
          color: #842029;
        }

        @media (max-width: 768px) {
          .pavani-notifications-page {
            padding: 20px 12px;
          }

          .pavani-panel-header {
            flex-direction: column;
          }

          .pavani-notification-card {
            flex-direction: column;
          }

          .pavani-notification-buttons {
            flex-direction: column;
          }

          .pavani-notification-buttons button {
            width: 100%;
          }

          .pavani-history-card {
            align-items: flex-start;
            flex-wrap: wrap;
          }

          .pavani-history-status {
            margin-left: 60px;
          }
        }
      `}</style>

      <div className="pavani-notifications-page">
        <h1 className="pavani-notifications-title">
          🔔 Notifications
        </h1>

        <NotificationPanel />
        <PushNotification />
        <NotificationHistory />
      </div>
    </>
  );
}

export default Notifications;



