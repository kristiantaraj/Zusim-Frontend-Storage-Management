import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { useRole } from '../context/RoleContext';
import logo from '../../zusim_logo_white.svg';

export default function RoleSelector() {
  const { t } = useTranslation();
  const { selectOperator, unlockManager, unlockOwner } = useRole();
  const navigate = useNavigate();
  const [managerPassword, setManagerPassword] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [managerError, setManagerError] = useState('');
  const [ownerError, setOwnerError] = useState('');

  const selectRole = (selectedRole) => {
    if (selectedRole === 'operator') {
      selectOperator();
      navigate('/operator');
      return;
    }

    if (selectedRole === 'owner') {
      const result = unlockOwner(ownerPassword);

      if (result.ok) {
        setOwnerError('');
        setOwnerPassword('');
        navigate('/');
        return;
      }

      if (result.reason === 'missing-config') {
        setOwnerError(t('roles.ownerPasswordMissingConfig'));
        return;
      }

      setOwnerError(t('roles.ownerPasswordInvalid'));
      return;
    }

    const result = unlockManager(managerPassword);

    if (result.ok) {
      setManagerError('');
      setManagerPassword('');
      navigate('/');
      return;
    }

    if (result.reason === 'missing-config') {
      setManagerError(t('roles.managerPasswordMissingConfig'));
      return;
    }

    setManagerError(t('roles.managerPasswordInvalid'));
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
            {managerError && (
              <div className="role-manager-error">
                {managerError}
              </div>
            )}
          </div>

          <div className="role-manager-access">
            <label htmlFor="owner-password" className="text-muted role-manager-label">
            {t('roles.ownerPasswordLabel')}
            </label>
            <input
              id="owner-password"
              type="password"
              value={ownerPassword}
              onChange={(e) => setOwnerPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  selectRole('owner');
                }
              }}
              placeholder={t('roles.ownerPasswordPlaceholder')}
            />
            {ownerError && (
              <div className="role-manager-error">
                {ownerError}
              </div>
            )}
          </div>

          <div className="role-choice-grid">
            <button
              className="btn btn-primary role-choice-btn role-choice-manager"
              onClick={() => selectRole('owner')}
            >
              <div className="role-choice-icon">🛡️</div>
              <div className="role-choice-title">{t('roles.owner')}</div>
            </button>
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
