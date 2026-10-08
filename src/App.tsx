import { Suspense, lazy, useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AdminGate } from "./components/AdminGate";
import { PublicBlogLayout } from "./components/PublicBlogLayout";
import { AuthProvider } from "./lib/auth";
import { isAdminHost, isPublicHost, publicShelfHref } from "./lib/surface";
import { LoginPage } from "./pages/Login";
import { PublicPostPage } from "./pages/PublicPost";
import { PublicPostsPage } from "./pages/PublicPosts";
import { PublicSavedPage } from "./pages/PublicSaved";
import { PublicSeriesPage } from "./pages/PublicSeries";

// The admin side carries the whole school desk plus the TipTap editor. Readers
// never reach it, so it is fetched only once someone lands behind AdminGate.
const page = <T extends string>(load: () => Promise<Record<T, React.ComponentType>>, name: T) =>
  lazy(() => load().then((mod) => ({ default: mod[name] })));

const Shell = page(() => import("./components/Shell"), "Shell");
const BlogLayout = page(() => import("./components/BlogLayout"), "BlogLayout");
const DashboardPage = page(() => import("./pages/Dashboard"), "DashboardPage");
const StudentsPage = page(() => import("./pages/Students"), "StudentsPage");
const ClassesPage = page(() => import("./pages/Classes"), "ClassesPage");
const StudentDetailPage = page(() => import("./pages/StudentDetail"), "StudentDetailPage");
const KharajahPage = page(() => import("./pages/Kharajah"), "KharajahPage");
const KharajahDetailPage = page(() => import("./pages/KharajahDetail"), "KharajahDetailPage");
const TeachersPage = page(() => import("./pages/Teachers"), "TeachersPage");
const TeacherDetailPage = page(() => import("./pages/TeacherDetail"), "TeacherDetailPage");
const BooksPage = page(() => import("./pages/Books"), "BooksPage");
const TripsPage = page(() => import("./pages/Trips"), "TripsPage");
const TripDetailPage = page(() => import("./pages/TripDetail"), "TripDetailPage");
const ExpensesPage = page(() => import("./pages/Expenses"), "ExpensesPage");
const ReportsPage = page(() => import("./pages/Reports"), "ReportsPage");
const SettingsPage = page(() => import("./pages/Settings"), "SettingsPage");
const BlogHomePage = page(() => import("./pages/BlogHome"), "BlogHomePage");
const BlogPostsPage = page(() => import("./pages/BlogPosts"), "BlogPostsPage");
const BlogWritePage = page(() => import("./pages/BlogWrite"), "BlogWritePage");
const BlogAnalyticsPage = page(() => import("./pages/BlogAnalytics"), "BlogAnalyticsPage");
const BlogSeriesPage = page(() => import("./pages/BlogSeries"), "BlogSeriesPage");
const BlogPostPage = page(() => import("./pages/BlogPost"), "BlogPostPage");

function ExternalPapersRedirect() {
  useEffect(() => {
    window.location.replace(publicShelfHref());
  }, []);
  return <p className="loading-line">Opening the papers…</p>;
}

const deskTree = (
  <>
    <Route path="/login" element={<LoginPage />} />
    <Route element={<AdminGate />}>
      <Route element={<Shell />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/students" element={<StudentsPage />} />
        <Route path="/classes" element={<ClassesPage />} />
        <Route path="/classes/:id" element={<ClassesPage />} />
        <Route path="/students/:id" element={<StudentDetailPage />} />
        <Route path="/kharajah" element={<KharajahPage />} />
        <Route path="/kharajah/:id" element={<KharajahDetailPage />} />
        <Route path="/teachers" element={<TeachersPage />} />
        <Route path="/teachers/:id" element={<TeacherDetailPage />} />
        <Route path="/books" element={<BooksPage />} />
        <Route path="/trips" element={<TripsPage />} />
        <Route path="/trips/:id" element={<TripDetailPage />} />
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
        <Route path="/blog/series" element={<BlogSeriesPage />} />
        <Route path="/blog/:slug" element={<BlogPostPage />} />
      </Route>
    </Route>
  </>
);

export function App() {
  const publicOnly = isPublicHost();
  const adminOnly = isAdminHost();

  return (
    <AuthProvider>
      <Suspense fallback={null}>
        {publicOnly ? (
          <Routes>
            <Route element={<PublicBlogLayout />}>
              <Route path="/" element={<PublicPostsPage />} />
              <Route path="/saved" element={<PublicSavedPage />} />
              <Route path="/series/:slug" element={<PublicSeriesPage />} />
              <Route path="/:slug" element={<PublicPostPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        ) : null}

        {adminOnly ? (
          <Routes>
            {deskTree}
            <Route path="/read" element={<ExternalPapersRedirect />} />
            <Route path="/read/*" element={<ExternalPapersRedirect />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        ) : null}

        {!publicOnly && !adminOnly ? (
          <Routes>
            <Route element={<PublicBlogLayout />}>
              <Route path="/read" element={<PublicPostsPage />} />
              <Route path="/read/saved" element={<PublicSavedPage />} />
              <Route path="/read/series/:slug" element={<PublicSeriesPage />} />
              <Route path="/read/:slug" element={<PublicPostPage />} />
            </Route>
            {deskTree}
            <Route path="*" element={<Navigate to="/read" replace />} />
          </Routes>
        ) : null}
      </Suspense>
    </AuthProvider>
  );
}
