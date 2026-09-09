import axios from "axios";

const API_URL = "http://127.0.0.1:8000/api/notifications/";

const getAuthHeaders = () => {
    const token = localStorage.getItem("accessToken");

    return {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
    };
};

export const getNotifications = async () => {
    const response = await axios.get(
        API_URL,
        {
            headers: getAuthHeaders(),
        }
    );

    return response.data;
};

export const markNotificationAsRead = async (id) => {
    const response = await axios.put(
        `${API_URL}${id}/read/`,
        {},
        {
            headers: getAuthHeaders(),
        }
    );

    return response.data;
};

export const deleteNotification = async (id) => {
    const response = await axios.delete(
        `${API_URL}${id}/delete/`,
        {
            headers: getAuthHeaders(),
        }
    );

    return response.data;
};

export const clearAllNotifications = async () => {
    const response = await axios.delete(
        `${API_URL}clear-all/`,
        {
            headers: getAuthHeaders(),
        }
    );

    return response.data;
};