import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { useRole } from '../context/RoleContext';

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
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg)' }}>
      <div className="card" style={{ textAlign: 'center', maxWidth: 400 }}>
        <div style={{ fontSize: 32, marginBottom: 16 }}>Zusim Inventory</div>
        <h1 style={{ marginBottom: 8 }}>{t('roles.selectRole')}</h1>
        <p className="text-muted" style={{ marginBottom: 32 }}>{t('roles.selectRoleDesc')}</p>

        <div style={{ marginBottom: 20, textAlign: 'left' }}>
          <label htmlFor="manager-password" className="text-muted" style={{ display: 'block', marginBottom: 6 }}>
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
            style={{ width: '100%' }}
          />
          {error && (
            <div style={{ marginTop: 8, color: 'var(--danger)', fontSize: 13 }}>
              {error}
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <button
            className="btn btn-primary"
            onClick={() => selectRole('manager')}
            style={{ padding: '20px', height: 'auto', flexDirection: 'column', alignItems: 'center' }}
          >
            <div style={{ fontSize: 24, marginBottom: 8 }}>👔</div>
            <div style={{ fontWeight: 700 }}>{t('roles.manager')}</div>
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => selectRole('operator')}
            style={{ padding: '20px', height: 'auto', flexDirection: 'column', alignItems: 'center' }}
          >
            <div style={{ fontSize: 24, marginBottom: 8 }}>📦</div>
            <div style={{ fontWeight: 700 }}>{t('roles.operator')}</div>
          </button>
        </div>
      </div>
    </div>
  );
}
