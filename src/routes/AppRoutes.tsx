import { Suspense, lazy } from "react";
import { Routes, Route } from "react-router-dom";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { ListSkeleton } from "@/components/ui/Primitives";

const Dashboard = lazy(() => import("@/pages/Dashboard/Dashboard"));
const MedicineList = lazy(() => import("@/pages/MedicineManagement/MedicineList"));
const AddMedicine = lazy(() => import("@/pages/AddMedicine/AddMedicine"));
const EditMedicine = lazy(() => import("@/pages/EditMedicine/EditMedicine"));
const MedicineDetails = lazy(() => import("@/pages/MedicineDetails/MedicineDetails"));
const MedicineHistory = lazy(() => import("@/pages/MedicineHistory/MedicineHistory"));
const Analytics = lazy(() => import("@/pages/Analytics/Analytics"));
const Trash = lazy(() => import("@/pages/Trash/Trash"));
const NotFound = lazy(() => import("@/pages/NotFound/NotFound"));

function Loading() {
  return (
    <div className="p-6">
      <ListSkeleton rows={5} />
    </div>
  );
}

export function AppRoutes() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route element={<DashboardLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/medicines" element={<MedicineList />} />
          <Route path="/medicines/add" element={<AddMedicine />} />
          <Route path="/medicines/:id" element={<MedicineDetails />} />
          <Route path="/medicines/:id/edit" element={<EditMedicine />} />
          <Route path="/history" element={<MedicineHistory />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/trash" element={<Trash />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
