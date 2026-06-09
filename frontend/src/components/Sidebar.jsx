import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useUiSettings } from '../context/UiSettingsContext';
import logo from '../../zusim_logo_white.svg';

export default function Sidebar() {
  const { t } = useTranslation();
  const { sidebarCollapsed } = useUiSettings();

  const links = [
    { to: '/', label: t('nav.dashboard'), icon: '▦' },
    { to: '/products', label: t('nav.products'), icon: '◈' },
    { to: '/inbound', label: t('nav.inbound'), icon: '↓' },
    { to: '/scan', label: t('nav.scanOut'), icon: '↑' },
    { to: '/units', label: t('nav.units'), icon: '☰' },
    { to: '/foremen', label: t('nav.foremen'), icon: '◉' },
    { to: '/projects', label: t('nav.projects'), icon: '◫' },
    { to: '/tickets', label: t('nav.tickets'), icon: '◌' },
    { to: '/settings', label: t('nav.settings'), icon: '⚙' },
  ];

  return (
    <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-logo-wrap">
        <img src={logo} alt="Zusim" className="sidebar-logo-image" />
      </div>
      <nav>
        {links.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            title={label}
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            <span className="sidebar-link-icon" aria-hidden="true">{icon}</span>
            <span className="sidebar-link-label">{label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
