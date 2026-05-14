import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRole } from '../context/RoleContext';
import { useNavigate } from 'react-router-dom';
import { ScanOut, ScanUsed } from './ScanPage';
import { api } from '../api';

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
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Top bar */}
      <div style={{
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        padding: '12px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--primary)' }}>
          Zusim — {t('roles.operator')}
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-ghost" onClick={toggleLanguage}>
            {i18n.language === 'en' ? '🇵🇱 PL' : '🇬🇧 EN'}
          </button>
          <button className="btn btn-ghost" onClick={handleLogout}>
            {t('nav.logout')}
          </button>
        </div>
      </div>

      <div style={{ padding: '32px 24px' }}>

        {/* Step 0 — Choose mode */}
        {step === 'mode' && (
          <div className="card" style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center' }}>
            <h1 style={{ marginBottom: 8 }}>{t('operator.chooseMode')}</h1>
            <p className="text-muted" style={{ marginBottom: 28 }}>{t('operator.chooseModeDesc')}</p>
            <div style={{ display: 'flex', gap: 20, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="foreman-tile"
                style={{ minWidth: 160, padding: '24px 32px' }}
                onClick={() => setMode('out')}
              >
                <span className="foreman-tile-icon">📤</span>
                <span className="foreman-tile-name">{t('operator.modeOut')}</span>
              </button>
              <button
                type="button"
                className="foreman-tile"
                style={{ minWidth: 160, padding: '24px 32px' }}
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
          <div className="card" style={{ maxWidth: 860, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <h1 style={{ margin: 0 }}>{t('foremen.pickBeforeScan')}</h1>
              <button className="btn btn-ghost" type="button" onClick={resetAll}>
                ← {t('operator.changeScanType')}
              </button>
            </div>
            <p className="text-muted" style={{ marginBottom: 18 }}>
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
          <div className="card" style={{ maxWidth: 860, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <h1 style={{ margin: 0 }}>{t('projects.pickBeforeScan')}</h1>
              <button className="btn btn-ghost" type="button" onClick={resetForeman}>
                {t('operator.changeForeman')}
              </button>
            </div>
            <p className="text-muted" style={{ marginBottom: 6 }}>
              {t('foremen.activeForeman')}: {selectedForeman.icon || '👷'} {selectedForeman.name}
            </p>
            <p className="text-muted" style={{ marginBottom: 18 }}>
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
            <div className="card" style={{ maxWidth: 640, margin: '0 auto 14px auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <div>
                  {mode === 'out' && (
                    <div><strong>{t('foremen.activeForeman')}:</strong> {selectedForeman.icon || '👷'} {selectedForeman.name}</div>
                  )}
                  {mode === 'out' && (
                    <div style={{ marginTop: 4 }}><strong>{t('projects.activeProject')}:</strong> 📁 {selectedProject.name}</div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
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
              ? <ScanOut foreman={selectedForeman} project={selectedProject} />
              : <ScanUsed />
            }
          </>
        )}

      </div>
    </div>
  );
}
