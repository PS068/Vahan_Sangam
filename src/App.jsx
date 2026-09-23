import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Login from './pages/Login';
import Discover from './pages/Discover';
import GarageDetail from './pages/GarageDetail';
import GarageRegister from './pages/GarageRegister';
import GarageDashboard from './pages/GarageDashboard';
import MyAccount from './pages/MyAccount';
import BookService from './pages/BookService';
import BookingSuccess from './pages/BookingSuccess';
import BookingDetails from './pages/BookingDetails';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './components/ToastNotification';
import { useAuth } from './context/AuthContext';

function ScrollToTop() {
  const { pathname } = useLocation();
  if (typeof window !== 'undefined') window.scrollTo(0, 0);
  return null;
}

// Route guard for authenticated actions
function ProtectedRoute({ children, requireRole }) {
  const { isAuthenticated, loading, role, needsOnboarding } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // If garage owner hasn't completed registration, force them to register
  if (needsOnboarding && role === 'garage_owner' && location.pathname !== '/garage-register') {
    return <Navigate to="/garage-register" replace />;
  }

  // Role check
  if (requireRole && role !== requireRole) {
    return <Navigate to="/" replace />;
  }

  return children;
}

const AppLayout = () => {
  const location = useLocation();
  const isDashboard = location.pathname.startsWith('/garage-dashboard') || location.pathname.startsWith('/admin');

  return (
    <div className="flex flex-col min-h-screen bg-[#050505] text-white">
      <ScrollToTop />
      {!isDashboard && <Navbar />}
      <main className="flex-grow">
        <Routes>
          {/* ─── PUBLIC ROUTES (no auth required) ─── */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/discover" element={<Discover />} />
          <Route path="/garage/:id" element={<GarageDetail />} />

          {/* ─── PROTECTED USER ROUTES ─── */}
          <Route
            path="/my-account"
            element={
              <ProtectedRoute>
                <MyAccount />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-garage"
            element={
              <ProtectedRoute>
                <MyAccount />
              </ProtectedRoute>
            }
          />
          <Route
            path="/book-service"
            element={
              <ProtectedRoute>
                <BookService />
              </ProtectedRoute>
            }
          />
          <Route
            path="/booking-success"
            element={
              <ProtectedRoute>
                <BookingSuccess />
              </ProtectedRoute>
            }
          />
          <Route
            path="/booking/:id"
            element={
              <ProtectedRoute>
                <BookingDetails />
              </ProtectedRoute>
            }
          />

          {/* ─── PROTECTED GARAGE OWNER ROUTES ─── */}
          <Route
            path="/garage-register"
            element={
              <ProtectedRoute requireRole="garage_owner">
                <GarageRegister />
              </ProtectedRoute>
            }
          />
          <Route
            path="/garage-dashboard"
            element={
              <ProtectedRoute requireRole="garage_owner">
                <GarageDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute requireRole="garage_owner">
                <GarageDashboard />
              </ProtectedRoute>
            }
          />

          {/* ─── FALLBACK ─── */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      {!isDashboard && <Footer />}
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Router>
          <AppLayout />
        </Router>
      </ToastProvider>
    </AuthProvider>
  );
}
