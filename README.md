# PillSync — Medicine Management Module

A production-ready React + TypeScript module for the PillSync healthcare platform: dashboard, medicine list (grid/table), a 5-step add-medicine wizard, medicine details, edit, soft-delete/restore (Trash), history (table/timeline/calendar), and analytics.

## Stack

React 18 · Vite · TypeScript · Tailwind CSS · React Router DOM · React Hook Form · Zod · Axios · TanStack React Query · Framer Motion · Recharts · Lucide React · React Hot Toast

## Getting started in VS Code

1. Open this folder in VS Code (`code .`).
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the dev server:
   ```bash
   npm run dev
   ```
4. Open the URL Vite prints (usually `http://localhost:5173`).

## Project structure

```
src/
├── assets/               static assets (add images/illustrations here)
├── components/
│   ├── ui/               Button, Card, Badge, ProgressBar, ProgressCircle, Sparkline, Skeleton...
│   └── layout/            Sidebar, Topbar, SmartSearch
├── layouts/               DashboardLayout (sidebar + topbar + routed <Outlet />)
├── pages/
│   ├── Dashboard/
│   ├── MedicineManagement/   MedicineList, MedicineCard, MedicineTable, FilterPanel, DeleteConfirm
│   ├── AddMedicine/          5-step RHF + Zod wizard
│   ├── EditMedicine/         autosave draft, undo, success animation
│   ├── MedicineDetails/
│   ├── MedicineHistory/      table / timeline / calendar views
│   ├── Analytics/
│   ├── Trash/                soft-delete + restore
│   └── NotFound/
├── hooks/                 useMedicines, useMedicineFilters
├── services/               medicineService.ts (Axios, API-ready — see below)
├── context/                MedicineContext (shared state + toast helpers)
├── routes/                 AppRoutes.tsx (React Router, lazy-loaded pages)
├── constants/               categories, types, doctors, colors
├── types/                   Medicine, HistoryEntry interfaces
└── utils/                   dummy data + small helpers
```

## Connecting a real backend

All data currently comes from `src/utils/dummyData.ts` via `src/services/medicineService.ts`.
To point the app at a real API:

1. Create a `.env` file with:
   ```
   VITE_API_BASE_URL=https://your-api.example.com/v1
   ```
2. That's it — `medicineService` automatically switches from mock data to real
   `axios` calls against `/medicines` once `VITE_API_BASE_URL` is set. Update
   the endpoint paths in `medicineService.ts` to match your API if needed.
3. `MedicineContext` seeds its state from `medicineService.list()` (wrapped in
   a React Query `useQuery`) and calls the service on every create/update/delete,
   so swapping mock → real is isolated to that one file.

## Notes

- Tailwind is configured with `darkMode: "class"`; the theme toggle in the
  sidebar adds/removes the `dark` class on the root wrapper.
- Charts use Recharts; icons use lucide-react.
- Toasts are handled by `react-hot-toast`, wired up in `main.tsx` and used via
  the `notifySuccess` / `notifyError` / `notifyInfo` helpers in
  `context/MedicineContext.tsx`.
- Pages are code-split with `React.lazy` + `Suspense` in `routes/AppRoutes.tsx`.
