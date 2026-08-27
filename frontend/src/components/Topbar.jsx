import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { useRole } from '../context/RoleContext';
import { useUiSettings } from '../context/UiSettingsContext';

export default function Topbar() {
  const { t, i18n } = useTranslation();
  const { logout } = useRole();
  const { sidebarCollapsed, toggleSidebarCollapsed } = useUiSettings();
  const navigate = useNavigate();
  const location = useLocation();

  const pageTitleMap = {
    '/': t('nav.dashboard'),
    '/products': t('nav.products'),
    '/inbound': t('nav.inbound'),
    '/scan': t('nav.scanOut'),
    '/units': t('nav.units'),
    '/foremen': t('nav.foremen'),
    '/projects': t('nav.projects'),
    '/tickets': t('nav.tickets'),
    '/settings': t('nav.settings'),
  };

  const currentTitle = pageTitleMap[location.pathname] || t('nav.dashboard');

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'pl' : 'en';
    i18n.changeLanguage(newLang);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="manager-topbar">
      <div className="manager-topbar-left">
        <button
          type="button"
          className="btn btn-ghost icon-btn"
          onClick={toggleSidebarCollapsed}
          aria-label={sidebarCollapsed ? t('layout.expandSidebar') : t('layout.collapseSidebar')}
          title={sidebarCollapsed ? t('layout.expandSidebar') : t('layout.collapseSidebar')}
        >
          {sidebarCollapsed ? '»' : '«'}
        </button>
        <div>
          <h1 className="manager-page-title">{currentTitle}</h1>
          <p className="text-muted manager-page-subtitle">{t('layout.workspaceHint')}</p>
        </div>
      </div>

      <div className="manager-topbar-actions">
        <button className="btn btn-ghost" onClick={toggleLanguage}>
          {i18n.language === 'en' ? 'PL' : 'EN'}
        </button>
        <button className="btn btn-ghost topbar-logout" onClick={handleLogout}>
          {t('nav.logout')}
        </button>
      </div>
    </header>
  );
}
