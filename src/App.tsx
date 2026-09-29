import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AdminGate } from "./components/AdminGate";
import { BlogLayout } from "./components/BlogLayout";
import { CheckInLayer } from "./components/CheckInLayer";
import { PublicBlogLayout } from "./components/PublicBlogLayout";
import { Shell } from "./components/Shell";
import { AuthProvider } from "./lib/auth";
import { BlogAnalyticsPage } from "./pages/BlogAnalytics";
import { BlogHomePage } from "./pages/BlogHome";
import { BlogPostPage } from "./pages/BlogPost";
import { BlogPostsPage } from "./pages/BlogPosts";
import { BlogWritePage } from "./pages/BlogWrite";
import { DashboardPage } from "./pages/Dashboard";
import { ExpensesPage } from "./pages/Expenses";
import { LoginPage } from "./pages/Login";
import { PublicPostPage } from "./pages/PublicPost";
import { PublicPostsPage } from "./pages/PublicPosts";
import { ReportsPage } from "./pages/Reports";
import { SettingsPage } from "./pages/Settings";
import { StudentDetailPage } from "./pages/StudentDetail";
import { StudentsPage } from "./pages/Students";
import { TeacherDetailPage } from "./pages/TeacherDetail";
import { TeachersPage } from "./pages/Teachers";

export function App() {
  const { pathname } = useLocation();
  const publicSurface = pathname.startsWith("/read") || pathname === "/login";

  return (
    <AuthProvider>
      <CheckInLayer paused={publicSurface} />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<PublicBlogLayout />}>
          <Route path="/read" element={<PublicPostsPage />} />
          <Route path="/read/:slug" element={<PublicPostPage />} />
        </Route>
        <Route element={<AdminGate />}>
          <Route element={<Shell />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/students" element={<StudentsPage />} />
            <Route path="/students/:id" element={<StudentDetailPage />} />
            <Route path="/teachers" element={<TeachersPage />} />
            <Route path="/teachers/:id" element={<TeacherDetailPage />} />
            <Route path="/expenses" element={<ExpensesPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
          <Route element={<BlogLayout />}>
            <Route path="/blog" element={<BlogHomePage />} />
            <Route path="/blog/posts" element={<BlogPostsPage />} />
            <Route path="/blog/write" element={<BlogWritePage />} />
            <Route path="/blog/write/:id" element={<BlogWritePage />} />
            <Route path="/blog/analytics" element={<BlogAnalyticsPage />} />
            <Route path="/blog/:slug" element={<BlogPostPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/read" replace />} />
      </Routes>
    </AuthProvider>
  );
}
