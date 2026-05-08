import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useRole } from '../context/RoleContext';

export default function RoleSelector() {
  const { t } = useTranslation();
  const { setRole } = useRole();
  const navigate = useNavigate();

  const selectRole = (selectedRole) => {
    setRole(selectedRole);
    navigate(selectedRole === 'operator' ? '/operator' : '/');
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg)' }}>
      <div className="card" style={{ textAlign: 'center', maxWidth: 400 }}>
        <div style={{ fontSize: 32, marginBottom: 16 }}>Zusim Inventory</div>
        <h1 style={{ marginBottom: 8 }}>{t('roles.selectRole')}</h1>
        <p className="text-muted" style={{ marginBottom: 32 }}>{t('roles.selectRoleDesc')}</p>

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
