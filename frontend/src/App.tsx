import { Navigate, Route, Routes } from "react-router";
import { Layout } from "./components/Layout";
import { ApplicationDetailPage } from "./pages/ApplicationDetailPage";
import { ApplicationsPage } from "./pages/ApplicationsPage";
import { CompaniesPage } from "./pages/CompaniesPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ImportPage } from "./pages/ImportPage";
import { NewApplicationPage } from "./pages/NewApplicationPage";
import { NotFoundPage } from "./pages/NotFoundPage";

export default function App() {
  return (
    <Routes>
      {/* A layout route: every page renders inside Layout's <Outlet />. */}
      <Route element={<Layout />}>
        {/* The applications list is the home page. */}
        <Route index element={<Navigate to="/applications" replace />} />
        <Route path="applications" element={<ApplicationsPage />} />
        <Route path="applications/new" element={<NewApplicationPage />} />
        <Route path="applications/:id" element={<ApplicationDetailPage />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="import" element={<ImportPage />} />
        <Route path="companies" element={<CompaniesPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
