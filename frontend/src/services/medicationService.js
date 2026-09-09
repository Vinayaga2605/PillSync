import axios from "axios";

const API_URL = "http://127.0.0.1:8000/api/medications/";

const getAuthHeaders = () => {
    const token = localStorage.getItem("accessToken");

    return {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
    };
};

export const getMedications = async () => {
    const response = await axios.get(API_URL, {
        headers: getAuthHeaders(),
    });

    return response.data;
};

export const addMedication = async (medicationData) => {
    const response = await axios.post(
        API_URL,
        medicationData,
        {
            headers: getAuthHeaders(),
        }
    );

    return response.data;
};

export const updateMedication = async (id, medicationData) => {
    const response = await axios.put(
        `${API_URL}${id}/`,
        medicationData,
        {
            headers: getAuthHeaders(),
        }
    );

    return response.data;
};

export const deleteMedication = async (id) => {
    const response = await axios.delete(
        `${API_URL}${id}/`,
        {
            headers: getAuthHeaders(),
        }
    );

    return response.data;
};