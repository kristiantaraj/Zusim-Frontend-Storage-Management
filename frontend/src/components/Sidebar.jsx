import { NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useRole } from '../context/RoleContext';

export default function Sidebar() {
  const { t, i18n } = useTranslation();
  const { logout } = useRole();
  const navigate = useNavigate();

  const links = [
    { to: '/', label: t('nav.dashboard'), icon: '▦' },
    { to: '/products', label: t('nav.products'), icon: '🎨' },
    { to: '/inbound', label: t('nav.inbound'), icon: '📥' },
    { to: '/scan', label: t('nav.scanOut'), icon: '📤' },
    { to: '/units', label: t('nav.units'), icon: '📋' },
    { to: '/foremen', label: t('nav.foremen'), icon: '👷' },
    { to: '/projects', label: t('nav.projects'), icon: '📁' },
    { to: '/tickets', label: t('nav.tickets'), icon: '🎫' },
  ];

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'pl' : 'en';
    i18n.changeLanguage(newLang);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">Zusim</div>
      <nav>
        {links.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            {icon} {label}
          </NavLink>
        ))}
      </nav>

      {/* Language & Logout */}
      <div style={{ marginTop: 'auto', padding: '0 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <button className="btn btn-ghost" onClick={toggleLanguage} style={{ fontSize: 12, justifyContent: 'center' }}>
          {i18n.language === 'en' ? '🇵🇱 PL' : '🇬🇧 EN'}
        </button>
        <button className="btn btn-ghost" onClick={handleLogout} style={{ fontSize: 12, justifyContent: 'center', color: 'var(--danger)' }}>
          {t('nav.logout')}
        </button>
      </div>
    </aside>
  );
}
