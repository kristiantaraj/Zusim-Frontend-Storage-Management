import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import { RoleProvider, useRole } from './context/RoleContext';
import { UiSettingsProvider, useUiSettings } from './context/UiSettingsContext';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Inbound from './pages/Inbound';
import { ScanOut } from './pages/ScanPage';
import Units from './pages/Units';
import RoleSelector from './pages/RoleSelector';
import OperatorView from './pages/OperatorView';
import Foremen from './pages/Foremen';
import Projects from './pages/Projects';
import Tickets from './pages/Tickets';
import Settings from './pages/Settings';

function ManagerView() {
  const { sidebarCollapsed } = useUiSettings();

  return (
    <div className={`app manager-shell ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <Sidebar />
      <div className="manager-content-wrap">
        <Topbar />
        <main className="main">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/products" element={<Products />} />
            <Route path="/inbound" element={<Inbound />} />
            <Route path="/scan" element={<ScanOut />} />
            <Route path="/units" element={<Units />} />
            <Route path="/foremen" element={<Foremen />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/tickets" element={<Tickets />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function AppRoutes() {
  const { role, managerAuthenticated, ownerAuthenticated } = useRole();

  if (!role) {
    return <RoleSelector />;
  }

  if (role === 'operator') {
    return <OperatorView />;
  }

  const privilegedRole = role === 'manager' || role === 'owner';
  const privilegedAuthenticated =
    (role === 'manager' && managerAuthenticated) ||
    (role === 'owner' && ownerAuthenticated);

  if (privilegedRole && !privilegedAuthenticated) {
    return <RoleSelector />;
  }

  return <ManagerView />;
}

export default function App() {
  return (
    <BrowserRouter>
      <RoleProvider>
        <UiSettingsProvider>
          <AppRoutes />
        </UiSettingsProvider>
      </RoleProvider>
    </BrowserRouter>
  );
}
