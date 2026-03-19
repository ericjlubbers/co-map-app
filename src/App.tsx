import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import IndexPage from "./pages/IndexPage";
import MapEditorPage from "./pages/MapEditorPage";
import EmbedPage from "./pages/EmbedPage";
import LoginPage from "./pages/LoginPage";
import AdminPage from "./pages/AdminPage";

/** Renders children only when authenticated; redirects to /login otherwise. */
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex h-dvh items-center justify-center text-gray-400">
        Loading…
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

/** Redirect authenticated users away from /login. */
function GuestOnly({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/embed/:id" element={<EmbedPage />} />
          <Route
            path="/login"
            element={
              <GuestOnly>
                <LoginPage />
              </GuestOnly>
            }
          />

          {/* Protected */}
          <Route
            path="/"
            element={
              <RequireAuth>
                <IndexPage />
              </RequireAuth>
            }
          />
          <Route
            path="/maps/:id"
            element={
              <RequireAuth>
                <MapEditorPage />
              </RequireAuth>
            }
          />
          <Route
            path="/admin"
            element={
              <RequireAuth>
                <AdminPage />
              </RequireAuth>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
