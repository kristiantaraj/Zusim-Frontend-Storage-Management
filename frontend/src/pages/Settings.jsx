import { useTranslation } from 'react-i18next';
import { useUiSettings } from '../context/UiSettingsContext';

export default function Settings() {
  const { t } = useTranslation();
  const { destructiveConfirm, setDestructiveConfirm, sidebarCollapsed, setSidebarCollapsed } = useUiSettings();

  return (
    <div>
      <div className="section-header">
        <h1>{t('settings.title')}</h1>
      </div>

      <div className="card settings-card">
        <h2>{t('settings.interface')}</h2>

        <label className="setting-row" htmlFor="destructive-confirm-toggle">
          <div>
            <strong>{t('settings.destructiveConfirmTitle')}</strong>
            <p className="text-muted">{t('settings.destructiveConfirmHint')}</p>
          </div>
          <span className="switch">
            <input
              id="destructive-confirm-toggle"
              type="checkbox"
              checked={destructiveConfirm}
              onChange={(e) => setDestructiveConfirm(e.target.checked)}
            />
            <span className="switch-slider" aria-hidden="true" />
          </span>
        </label>

        <label className="setting-row" htmlFor="sidebar-compact-toggle">
          <div>
            <strong>{t('settings.compactSidebarTitle')}</strong>
            <p className="text-muted">{t('settings.compactSidebarHint')}</p>
          </div>
          <span className="switch">
            <input
              id="sidebar-compact-toggle"
              type="checkbox"
              checked={sidebarCollapsed}
              onChange={(e) => setSidebarCollapsed(e.target.checked)}
            />
            <span className="switch-slider" aria-hidden="true" />
          </span>
        </label>
      </div>
    </div>
  );
}
