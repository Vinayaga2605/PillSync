import React from "react";
import NotificationPanel from "../components/NotificationPanel";
import PushNotification from "../components/PushNotification";
import NotificationHistory from "../components/NotificationHistory";
import "../styles/notifications.css";

function Notifications() {
    return (
        <div className="notifications-page">

            <h1>🔔 Notifications</h1>

            <NotificationPanel />

            <PushNotification />

            <NotificationHistory />

        </div>
    );
}

export default Notifications;