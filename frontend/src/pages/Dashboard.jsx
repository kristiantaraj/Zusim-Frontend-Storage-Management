import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api';

export default function Dashboard() {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .getDashboard()
      .then(setData)
      .catch(() => setError(t('messages.failedToLoad')));
  }, [t]);

  if (error) return <p className="feedback feedback-error">{error}</p>;
  if (!data) return <p className="text-muted">{t('common.loading')}</p>;

  return (
    <div>
      <h1>{t('dashboard.title')}</h1>

      <div className="card-grid">
        <StatCard value={data.totalProducts} label={t('dashboard.totalProducts')} />
        <StatCard value={data.totalBatches} label={t('dashboard.totalBatches')} />
        <StatCard value={data.totalUnits} label={t('dashboard.totalUnits')} />
        <StatCard value={data.inCount} label={t('dashboard.inStock')} color="var(--success)" />
        <StatCard value={data.outCount} label={t('dashboard.checkedOut')} color="var(--danger)" />
        <StatCard value={data.usedCount} label={t('dashboard.used')} color="var(--text-muted)" />
      </div>

      <div className="card">
        <h2>{t('dashboard.recentScans')}</h2>
        {data.recentScans.length === 0 ? (
          <p className="text-muted">{t('dashboard.noScans')}</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>{t('dashboard.unitId')}</th>
                <th>{t('dashboard.product')}</th>
                <th>{t('dashboard.action')}</th>
                <th>{t('dashboard.time')}</th>
              </tr>
            </thead>
            <tbody>
              {data.recentScans.map((s) => (
                <tr key={s.id}>
                  <td className="monospace">{s.unit_id}</td>
                  <td>{s.unit?.product?.name ?? '—'}</td>
                  <td>
                    <span className={`badge badge-${s.action.toLowerCase()}`}>{s.action}</span>
                  </td>
                  <td className="text-muted">{new Date(s.scanned_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function StatCard({ value, label, color }) {
  return (
    <div className="stat-card">
      <div className="value" style={color ? { color } : {}}>
        {value}
      </div>
      <div className="label">{label}</div>
    </div>
  );
}
