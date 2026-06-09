import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { useRole } from '../context/RoleContext';
import logo from '../../zusim_logo_white.svg';

export default function RoleSelector() {
  const { t } = useTranslation();
  const { selectOperator, unlockManager } = useRole();
  const navigate = useNavigate();
  const [managerPassword, setManagerPassword] = useState('');
  const [error, setError] = useState('');

  const selectRole = (selectedRole) => {
    if (selectedRole === 'operator') {
      selectOperator();
      navigate('/operator');
      return;
    }

    const result = unlockManager(managerPassword);

    if (result.ok) {
      setError('');
      setManagerPassword('');
      navigate('/');
      return;
    }

    if (result.reason === 'missing-config') {
      setError(t('roles.managerPasswordMissingConfig'));
      return;
    }

    setError(t('roles.managerPasswordInvalid'));
  };

  return (
    <div className="role-selector-page">
      <div className="role-selector-shell card">
        <div className="role-selector-brand">
          <img src={logo} alt="Zusim" className="role-selector-logo" />
        </div>

        <div className="role-selector-content">
          <h1>{t('roles.selectRole')}</h1>
          <p className="text-muted role-selector-subtitle">{t('roles.selectRoleDesc')}</p>

          <div className="role-manager-access">
            <label htmlFor="manager-password" className="text-muted role-manager-label">
            {t('roles.managerPasswordLabel')}
            </label>
            <input
              id="manager-password"
              type="password"
              value={managerPassword}
              onChange={(e) => setManagerPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  selectRole('manager');
                }
              }}
              placeholder={t('roles.managerPasswordPlaceholder')}
            />
            {error && (
              <div className="role-manager-error">
                {error}
              </div>
            )}
          </div>

          <div className="role-choice-grid">
            <button
              className="btn btn-primary role-choice-btn role-choice-manager"
              onClick={() => selectRole('manager')}
            >
              <div className="role-choice-icon">👔</div>
              <div className="role-choice-title">{t('roles.manager')}</div>
            </button>
            <button
              className="btn btn-ghost role-choice-btn"
              onClick={() => selectRole('operator')}
            >
              <div className="role-choice-icon">📦</div>
              <div className="role-choice-title">{t('roles.operator')}</div>
            </button>
          </div>

          <p className="text-muted role-selector-footnote">
            Zusim Workspace
          </p>
        </div>
      </div>
    </div>
  );
}
