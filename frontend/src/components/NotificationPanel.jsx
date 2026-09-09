import React, { useEffect, useState } from "react";

import {
    getNotifications,
    markNotificationAsRead,
    deleteNotification,
    clearAllNotifications,
} from "../services/notificationService";


function NotificationPanel() {

    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");


    // Load notifications from Django backend
    const loadNotifications = async () => {

        try {

            setLoading(true);
            setError("");

            const data = await getNotifications();

            setNotifications(data);

        } catch (err) {

            console.error("Notification loading error:", err);

            setError(
                "Unable to load notifications. Please login again."
            );

        } finally {

            setLoading(false);

        }
    };


    // Load notifications when component opens
    useEffect(() => {

        loadNotifications();

    }, []);


    // Mark notification as read
    const markAsRead = async (id) => {

        try {

            await markNotificationAsRead(id);

            setNotifications((currentNotifications) =>
                currentNotifications.map((notification) =>
                    notification.id === id
                        ? {
                            ...notification,
                            is_read: true
                        }
                        : notification
                )
            );

        } catch (err) {

            console.error(
                "Mark as read error:",
                err
            );

        }
    };


    // Delete notification
    const deleteOne = async (id) => {

        try {

            await deleteNotification(id);

            setNotifications((currentNotifications) =>
                currentNotifications.filter(
                    (notification) =>
                        notification.id !== id
                )
            );

        } catch (err) {

            console.error(
                "Delete notification error:",
                err
            );

        }
    };


    // Clear all notifications
    const clearAll = async () => {

        try {

            await clearAllNotifications();

            setNotifications([]);

        } catch (err) {

            console.error(
                "Clear all notifications error:",
                err
            );

        }
    };


    // Notification icon
    const getIcon = (type) => {

        if (type === "medicine") {
            return "💊";
        }

        if (type === "refill") {
            return "🔄";
        }

        if (type === "missed") {
            return "⚠️";
        }

        if (type === "appointment") {
            return "📅";
        }

        return "🔔";
    };


    // Count unread notifications
    const unreadCount = notifications.filter(
        (notification) =>
            !notification.is_read
    ).length;


    // Loading screen
    if (loading) {

        return (
            <div className="notification-panel">

                <div className="empty-notifications">

                    <div className="empty-icon">
                        🔄
                    </div>

                    <h3>
                        Loading Notifications...
                    </h3>

                </div>

            </div>
        );
    }


    return (

        <div className="notification-panel">

            {/* Header */}

            <div className="panel-header">

                <div>

                    <h2>
                        Notification Panel
                    </h2>

                    <p className="panel-subtitle">
                        Stay updated with your medication
                    </p>

                </div>


                <div className="notification-count">

                    {unreadCount} unread

                </div>

            </div>


            {/* Error */}

            {error && (

                <div className="notification-error">

                    {error}

                </div>

            )}


            {/* Clear All */}

            {notifications.length > 0 && (

                <div className="clear-all-container">

                    <button
                        className="clear-all-btn"
                        onClick={clearAll}
                    >
                        Clear All
                    </button>

                </div>

            )}


            {/* Empty */}

            {notifications.length === 0 ? (

                <div className="empty-notifications">

                    <div className="empty-icon">
                        🔔
                    </div>

                    <h3>
                        No Notifications
                    </h3>

                    <p>
                        You are all caught up!
                    </p>

                </div>

            ) : (

                <div className="notification-list">

                    {notifications.map(
                        (notification) => (

                            <div
                                key={notification.id}
                                className={`notification-card ${
                                    notification.is_read
                                        ? "read"
                                        : "unread"
                                }`}
                            >

                                {/* Icon */}

                                <div className="notification-icon">

                                    {getIcon(
                                        notification.notification_type
                                    )}

                                </div>


                                {/* Content */}

                                <div className="notification-content">

                                    <div className="notification-title-row">

                                        <h3>
                                            {notification.title}
                                        </h3>


                                        {!notification.is_read && (

                                            <span className="new-badge">
                                                NEW
                                            </span>

                                        )}

                                    </div>


                                    <p>
                                        {notification.message}
                                    </p>


                                    <small>

                                        {new Date(
                                            notification.created_at
                                        ).toLocaleString()}

                                    </small>


                                    {/* Buttons */}

                                    <div className="notification-buttons">

                                        {!notification.is_read && (

                                            <button
                                                className="read-btn"
                                                onClick={() =>
                                                    markAsRead(
                                                        notification.id
                                                    )
                                                }
                                            >
                                                ✓ Mark as Read
                                            </button>

                                        )}


                                        <button
                                            className="delete-btn"
                                            onClick={() =>
                                                deleteOne(
                                                    notification.id
                                                )
                                            }
                                        >
                                            Delete
                                        </button>

                                    </div>

                                </div>

                            </div>

                        )
                    )}

                </div>

            )}

        </div>

    );
}


export default NotificationPanel;