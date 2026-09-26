import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth/AuthProvider";
import { Shell } from "./components/Shell";
import { DashboardPage } from "./pages/Dashboard";
import { LoginPage } from "./pages/Login";
import { ReportsPage } from "./pages/Reports";
import { SettingsPage } from "./pages/Settings";
import { StudentDetailPage } from "./pages/StudentDetail";
import { StudentsPage } from "./pages/Students";
import { TeacherDetailPage } from "./pages/TeacherDetail";
import { TeachersPage } from "./pages/Teachers";

function RequireUser() {
  const { user, ready } = useAuth();
  if (!ready) return <p className="loading micro">&gt; Loading</p>;
  if (!user) return <Navigate to="/login" replace />;
  return <Shell />;
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireUser />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/students" element={<StudentsPage />} />
        <Route path="/students/:id" element={<StudentDetailPage />} />
        <Route path="/teachers" element={<TeachersPage />} />
        <Route path="/teachers/:id" element={<TeacherDetailPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
