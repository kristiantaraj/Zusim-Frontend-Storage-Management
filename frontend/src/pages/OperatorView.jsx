import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRole } from '../context/RoleContext';
import { useNavigate } from 'react-router-dom';
import { ScanOut, ScanUsed } from './ScanPage';
import { api } from '../api';
import logo from '../../zusim_logo_white.svg';

export default function OperatorView() {
  const { t, i18n } = useTranslation();
  const { logout } = useRole();
  const navigate = useNavigate();
  const [foremen, setForemen] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // Step state: null → 'mode' → ('foreman' → 'project' if OUT) → 'scan'
  const [mode, setMode] = useState(null);           // 'out' | 'in'
  const [selectedForeman, setSelectedForeman] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);

  useEffect(() => {
    Promise.all([api.getForemen(), api.getProjects()])
      .then(([f, p]) => { setForemen(f); setProjects(p); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = () => { logout(); navigate('/'); };
  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'en' ? 'pl' : 'en');
  };

  const resetAll = () => { setMode(null); setSelectedForeman(null); setSelectedProject(null); };
  const resetForeman = () => { setSelectedForeman(null); setSelectedProject(null); };
  const resetProject = () => setSelectedProject(null);

  // Derived step
  const step = !mode ? 'mode'
    : mode === 'in' ? 'scan'
    : !selectedForeman ? 'foreman'
    : mode === 'out' && !selectedProject ? 'project'
    : 'scan';

  return (
    <div className="operator-view">
      {/* Top bar */}
      <div className="operator-topbar">
        <div className="operator-brand-block">
          <div className="operator-brand-logo-wrap">
            <img src={logo} alt="Zusim" className="operator-brand-logo" />
          </div>
          <div className="operator-brand">
            {t('roles.operator')}
          </div>
        </div>
        <div className="operator-topbar-actions">
          <button className="btn btn-ghost" onClick={toggleLanguage}>
            {i18n.language === 'en' ? '🇵🇱 PL' : '🇬🇧 EN'}
          </button>
          <button className="btn btn-ghost" onClick={handleLogout}>
            {t('nav.logout')}
          </button>
        </div>
      </div>

      <div className="operator-content">

        {/* Step 0 — Choose mode */}
        {step === 'mode' && (
          <div className="card operator-step-card operator-centered">
            <h1>{t('operator.chooseMode')}</h1>
            <p className="text-muted operator-mode-desc">{t('operator.chooseModeDesc')}</p>
            <div className="operator-mode-grid">
              <button
                type="button"
                className="foreman-tile operator-mode-tile"
                onClick={() => setMode('out')}
              >
                <span className="foreman-tile-icon">📤</span>
                <span className="foreman-tile-name">{t('operator.modeOut')}</span>
              </button>
              <button
                type="button"
                className="foreman-tile operator-mode-tile"
                onClick={() => setMode('in')}
              >
                <span className="foreman-tile-icon">🗑</span>
                <span className="foreman-tile-name">{t('operator.modeIn')}</span>
              </button>
            </div>
          </div>
        )}

        {/* Step 1 — Select Foreman */}
        {step === 'foreman' && (
          <div className="card operator-step-card operator-wide">
            <div className="operator-step-header">
              <h1>{t('foremen.pickBeforeScan')}</h1>
              <button className="btn btn-ghost" type="button" onClick={resetAll}>
                ← {t('operator.changeScanType')}
              </button>
            </div>
            <p className="text-muted operator-step-desc">
              {t('foremen.pickBeforeScanDesc')}
            </p>
            {loading ? (
              <p className="text-muted">{t('common.loading')}</p>
            ) : foremen.length === 0 ? (
              <p className="text-muted">{t('foremen.noneAvailable')}</p>
            ) : (
              <div className="foreman-grid">
                {foremen.map((foreman) => (
                  <button
                    key={foreman.id}
                    type="button"
                    className="foreman-tile"
                    onClick={() => setSelectedForeman(foreman)}
                  >
                    <span className="foreman-tile-icon">{foreman.icon || '👷'}</span>
                    <span className="foreman-tile-name">{foreman.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 2 — Select Project (OUT only) */}
        {step === 'project' && (
          <div className="card operator-step-card operator-wide">
            <div className="operator-step-header">
              <h1>{t('projects.pickBeforeScan')}</h1>
              <button className="btn btn-ghost" type="button" onClick={resetForeman}>
                {t('operator.changeForeman')}
              </button>
            </div>
            <p className="text-muted operator-step-note">
              {t('foremen.activeForeman')}: {selectedForeman.icon || '👷'} {selectedForeman.name}
            </p>
            <p className="text-muted operator-step-desc">
              {t('projects.pickBeforeScanDesc')}
            </p>
            {loading ? (
              <p className="text-muted">{t('common.loading')}</p>
            ) : projects.length === 0 ? (
              <p className="text-muted">{t('projects.noneAvailable')}</p>
            ) : (
              <div className="foreman-grid">
                {projects.map((project) => (
                  <button
                    key={project.id}
                    type="button"
                    className="foreman-tile"
                    onClick={() => setSelectedProject(project)}
                  >
                    <span className="foreman-tile-icon">📁</span>
                    <span className="foreman-tile-name">{project.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 3 — Scan */}
        {step === 'scan' && (
          <>
            <div className="card operator-step-card operator-scan-card">
              <div className="operator-scan-meta">
                <div>
                  {mode === 'out' && (
                    <div><strong>{t('foremen.activeForeman')}:</strong> {selectedForeman.icon || '👷'} {selectedForeman.name}</div>
                  )}
                  {mode === 'out' && (
                    <div className="operator-step-note"><strong>{t('projects.activeProject')}:</strong> 📁 {selectedProject.name}</div>
                  )}
                </div>
                <div className="operator-scan-actions">
                  {mode === 'out' && (
                    <button className="btn btn-ghost" type="button" onClick={resetProject}>
                      {t('operator.changeProject')}
                    </button>
                  )}
                  {mode === 'out' && (
                    <button className="btn btn-ghost" type="button" onClick={resetForeman}>
                      {t('operator.changeForeman')}
                    </button>
                  )}
                  <button className="btn btn-ghost" type="button" onClick={resetAll}>
                    {t('operator.changeScanType')}
                  </button>
                </div>
              </div>
            </div>

            {mode === 'out'
              ? <ScanOut foreman={selectedForeman} project={selectedProject} autoSubmit={true} />
              : <ScanUsed autoSubmit={true} />
            }
          </>
        )}

      </div>
    </div>
  );
}
