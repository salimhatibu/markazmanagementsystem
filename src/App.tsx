import { Navigate, Route, Routes } from "react-router-dom";
import { hasAdminRole } from "../shared/auth";
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

function RequireAdmin() {
  const { user, ready, signOut } = useAuth();
  if (!ready) return <p className="loading micro">&gt; Loading</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (!hasAdminRole(user)) {
    return (
      <main className="blocked">
        <p className="micro">&gt; Access</p>
        <h1>Admin only</h1>
        <p>This account is signed in, but it does not have the admin role. Ask the site owner to add that role in Netlify Identity.</p>
        <button type="button" className="ghost" onClick={() => void signOut()}>Sign out</button>
      </main>
    );
  }
  return <Shell />;
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAdmin />}>
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
