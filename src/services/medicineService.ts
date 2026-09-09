import axios from "axios";
import type { Medicine } from "@/types/medicine";
import { INITIAL_MEDICINES } from "@/utils/dummyData";

// Point this at your real API once the backend is ready, e.g.
// VITE_API_BASE_URL=https://api.pillsync.health/v1
const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
});

// Attach an auth token automatically once you have a real auth flow.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("pillsync_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const USE_MOCK = !BASE_URL;

/**
 * These functions are written against the same shape a real REST API would
 * return, so swapping USE_MOCK off (by setting VITE_API_BASE_URL) is the
 * only change needed to go live.
 */
export const medicineService = {
  async list(): Promise<Medicine[]> {
    if (USE_MOCK) return Promise.resolve(INITIAL_MEDICINES);
    const { data } = await api.get<Medicine[]>("/medicines");
    return data;
  },

  async get(id: string): Promise<Medicine | undefined> {
    if (USE_MOCK) return Promise.resolve(INITIAL_MEDICINES.find((m) => m.id === id));
    const { data } = await api.get<Medicine>(`/medicines/${id}`);
    return data;
  },

  async create(payload: Partial<Medicine>): Promise<Medicine> {
    if (USE_MOCK) return Promise.resolve({ ...(payload as Medicine) });
    const { data } = await api.post<Medicine>("/medicines", payload);
    return data;
  },

  async update(id: string, payload: Partial<Medicine>): Promise<Medicine> {
    if (USE_MOCK) return Promise.resolve({ ...(payload as Medicine), id });
    const { data } = await api.put<Medicine>(`/medicines/${id}`, payload);
    return data;
  },

  async softDelete(id: string): Promise<void> {
    if (USE_MOCK) return Promise.resolve();
    await api.delete(`/medicines/${id}`);
  },

  async restore(id: string): Promise<void> {
    if (USE_MOCK) return Promise.resolve();
    await api.post(`/medicines/${id}/restore`);
  },
};
