import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import { RoleProvider, useRole } from './context/RoleContext';
import Sidebar from './components/Sidebar';
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

function ManagerView() {
  return (
    <div className="app">
      <Sidebar />
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
        </Routes>
      </main>
    </div>
  );
}

function AppRoutes() {
  const { role } = useRole();

  if (!role) {
    return <RoleSelector />;
  }

  if (role === 'operator') {
    return <OperatorView />;
  }

  return <ManagerView />;
}

export default function App() {
  return (
    <BrowserRouter>
      <RoleProvider>
        <AppRoutes />
      </RoleProvider>
    </BrowserRouter>
  );
}
