import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import LiveMap from './pages/LiveMap';
import Students from './pages/Students';
import Parents from './pages/Parents';
import Drivers from './pages/Drivers';
import RoutesPage from './pages/Routes';
import Reports from './pages/Reports';
import Payments from './pages/Payments';
import Analytics from './pages/Analytics';
import Incidents from './pages/Incidents';
import FinancialReports from './pages/FinancialReports';
import Geofences from './pages/Geofences';
import DriverBehavior from './pages/DriverBehavior';

function ProtectedLayout() {
  const { user, loading } = useAuth();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-gray-500">Loading...</div>
    </div>
  );

  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/map" element={<LiveMap />} />
          <Route path="/students" element={<Students />} />
          <Route path="/drivers" element={<Drivers />} />
          <Route path="/routes" element={<RoutesPage />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/parents" element={<Parents />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/incidents" element={<Incidents />} />
          <Route path="/financial-reports" element={<FinancialReports />} />
          <Route path="/geofences" element={<Geofences />} />
          <Route path="/driver-behavior" element={<DriverBehavior />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/*" element={<ProtectedLayout />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
