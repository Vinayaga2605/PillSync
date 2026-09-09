import { useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import Field from "../components/Field";
import ConfirmDialog from "../components/ConfirmDialog";
import Toast from "../components/Toast";
import { getMenu } from "../utils/menus";
import { useNotifications } from "../context/NotificationContext";
import { useAuth } from "../context/AuthContext";

const NotificationsPage = () => {
  const { user } = useAuth();
  const {
    notifications,
    unreadCount,
    markAllRead,
    markRead,
    deleteNotif,
    broadcast,
  } = useNotifications();

  const role = user?.role || "patient";
  const [filter, setFilter] = useState("all");
  const [broadcastMsg, setBroadcastMsg] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [toast, setToast] = useState(null);

  const notify = (msg, type = "success") => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleMarkAll = async () => {
    await markAllRead();
    notify("All notifications marked as read");
  };

  const handleMarkOne = async (n) => {
    if (!n.is_read) {
      await markRead(n.id);
    }
  };

  const requestDelete = (n) => {
    setConfirmDelete({
      title: "Delete Notification",
      message: "Are you sure you want to delete this notification?",
      confirmText: "Delete",
      action: async () => {
        try {
          await deleteNotif(n.id);
          setConfirmDelete(null);
          notify("Notification deleted");
        } catch (e) {
          setConfirmDelete(null);
          notify(e.message, "error");
        }
      },
    });
  };

  const handleSendBroadcast = async () => {
    if (!broadcastMsg.trim()) {
      notify("Enter a broadcast message", "error");
      return;
    }
    try {
      const res = await broadcast(broadcastMsg.trim());
      setBroadcastMsg("");
      notify(res.message || "Broadcast sent successfully");
    } catch (e) {
      notify(e.message, "error");
    }
  };

  const filtered =
    filter === "all"
      ? notifications
      : notifications.filter((n) => (filter === "read" ? n.is_read : !n.is_read));

  return (
    <DashboardLayout
      role={role.charAt(0).toUpperCase() + role.slice(1)}
      title="Notifications Center"
      subtitle={`${unreadCount} unread · ${notifications.length} total synced`}
      menu={getMenu(role)}
    >
      {role === "admin" && (
        <section className="panel glass-card" style={{ marginBottom: 24, padding: 24 }}>
          <div className="panel__head" style={{ marginBottom: 16 }}>
            <h2 className="panel__title gradient-text">Broadcast System Notification</h2>
            <button className="btn-primary" onClick={handleSendBroadcast}>
              📢 Broadcast to All
            </button>
          </div>
          <Field
            label="Notification Message"
            value={broadcastMsg}
            placeholder="Type system-wide announcement for all active users…"
            onChange={(e) => setBroadcastMsg(e.target.value)}
          />
        </section>
      )}

      <div className="panel glass-card" style={{ padding: 24 }}>
        <div className="panel__head" style={{ marginBottom: 16 }}>
          <div className="filter-row" style={{ margin: 0, display: "flex", gap: 8 }}>
            {["all", "unread", "read"].map((f) => (
              <button
                key={f}
                className={`chip ${filter === f ? "is-active" : ""}`}
                onClick={() => setFilter(f)}
                style={{ textTransform: "capitalize" }}
              >
                {f} ({f === "all" ? notifications.length : f === "unread" ? unreadCount : notifications.length - unreadCount})
              </button>
            ))}
          </div>
          <button className="btn-secondary" onClick={handleMarkAll}>
            ✓ Mark All Read
          </button>
        </div>

        {filtered.length === 0 ? (
          <p className="empty" style={{ padding: 32, textAlign: "center", color: "var(--text-muted)" }}>
            No notifications found in this view.
          </p>
        ) : (
          <div className="list" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {filtered.map((n) => (
              <div
                key={n.id}
                className={`list-item ${!n.is_read ? "list-item--unread" : ""}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  padding: "16px 20px",
                  borderRadius: "12px",
                  background: !n.is_read ? "rgba(99, 102, 241, 0.08)" : "rgba(255, 255, 255, 0.02)",
                  border: !n.is_read ? "1px solid rgba(99, 102, 241, 0.2)" : "1px solid var(--border-glass)",
                }}
              >
                <span className="list-item__icon" style={{ fontSize: 24 }}>
                  {n.type === "missed_dose" ? "⚠️" : n.type === "broadcast" ? "📢" : "🔔"}
                </span>
                <div
                  className="list-item__body"
                  style={{ flex: 1, cursor: "pointer" }}
                  onClick={() => handleMarkOne(n)}
                >
                  <p className="list-item__name" style={{ fontWeight: !n.is_read ? 600 : 400, color: "var(--text-main)" }}>
                    {n.message}
                  </p>
                  <p className="list-item__desc" style={{ fontSize: "0.82rem", color: "var(--text-sub)", marginTop: 4 }}>
                    {(n.created_at || "").slice(0, 16).replace("T", " ")} · {n.type}
                  </p>
                </div>
                {!n.is_read && <span className="badge badge-patient pulse-glow">New</span>}
                <button
                  className="btn-secondary"
                  style={{ padding: "6px 12px", fontSize: "0.82rem", color: "var(--danger)", borderColor: "rgba(244, 63, 94, 0.3)" }}
                  onClick={() => requestDelete(n)}
                  title="Delete"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {confirmDelete && (
        <ConfirmDialog
          title={confirmDelete.title}
          message={confirmDelete.message}
          confirmText={confirmDelete.confirmText}
          onConfirm={confirmDelete.action}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
      <Toast message={toast?.message} type={toast?.type} />
    </DashboardLayout>
  );
};

export default NotificationsPage;