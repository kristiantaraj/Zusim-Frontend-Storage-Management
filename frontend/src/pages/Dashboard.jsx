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

      <div className="row" style={{ marginBottom: 16 }}>
        <div className="card" style={{ flex: 1, minWidth: 260 }}>
          <h2 style={{ marginBottom: 10 }}>Weekly Trends</h2>
          <TrendLine label="Issued" item={data.trends?.issued} />
          <TrendLine label="Returned" item={data.trends?.returned} />
          <TrendLine label="Used" item={data.trends?.used} />
        </div>

        <div className="card" style={{ flex: 1, minWidth: 300 }}>
          <h2 style={{ marginBottom: 10 }}>Alerts</h2>
          <p className="text-muted" style={{ marginBottom: 8 }}>Stale OUT units: {data.alerts?.staleOutUnits?.length || 0}</p>
          <p className="text-muted" style={{ marginBottom: 8 }}>Long open tickets: {data.alerts?.longOpenTickets?.length || 0}</p>
          <p className="text-muted">Low stock products: {data.alerts?.lowStockProducts?.length || 0}</p>
        </div>
      </div>

      <div className="row" style={{ marginBottom: 16 }}>
        <div className="card" style={{ flex: 1, minWidth: 260 }}>
          <h2 style={{ marginBottom: 10 }}>Top Products (7d)</h2>
          {(data.insights?.topProducts || []).length === 0 ? (
            <p className="text-muted">No data</p>
          ) : (
            (data.insights?.topProducts || []).map((x, i) => (
              <div key={`${x.product}-${i}`} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span>{x.product}</span>
                <strong>{x.count}</strong>
              </div>
            ))
          )}
        </div>

        <div className="card" style={{ flex: 1, minWidth: 260 }}>
          <h2 style={{ marginBottom: 10 }}>Foreman Activity (7d)</h2>
          {(data.insights?.foremen || []).length === 0 ? (
            <p className="text-muted">No data</p>
          ) : (
            (data.insights?.foremen || []).map((x) => (
              <div key={x.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span>{x.icon || '👷'} {x.name}</span>
                <strong>{x.tickets}</strong>
              </div>
            ))
          )}
        </div>

        <div className="card" style={{ flex: 1, minWidth: 260 }}>
          <h2 style={{ marginBottom: 10 }}>Project Activity (7d)</h2>
          {(data.insights?.projects || []).length === 0 ? (
            <p className="text-muted">No data</p>
          ) : (
            (data.insights?.projects || []).map((x) => (
              <div key={x.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span>📁 {x.name}</span>
                <strong>{x.tickets}</strong>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h2>Exceptions</h2>
        {(data.alerts?.staleOutUnits || []).slice(0, 8).map((u) => (
          <div key={u.id} className="text-muted" style={{ marginBottom: 4 }}>
            OUT too long: {u.id} {u.product ? `(${u.product})` : ''} since {new Date(u.since).toLocaleString()}
          </div>
        ))}
        {(data.alerts?.longOpenTickets || []).slice(0, 8).map((tk) => (
          <div key={tk.id} className="text-muted" style={{ marginBottom: 4 }}>
            Open too long: Ticket #{tk.id} {tk.foreman?.name || ''} / {tk.project?.name || ''} pending {tk.pending_units}
          </div>
        ))}
        {(data.alerts?.lowStockProducts || []).slice(0, 8).map((p) => (
          <div key={p.id} className="text-muted" style={{ marginBottom: 4 }}>
            Low stock: {p.name} in stock {p.in_stock}
          </div>
        ))}
      </div>

      <div className="card">
        <h2>{t('dashboard.recentScans')}</h2>
        {(data.recentScans ?? []).length === 0 ? (
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

function TrendLine({ label, item }) {
  if (!item) return null;
  const color = item.delta >= 0 ? 'var(--success)' : 'var(--danger)';
  const sign = item.delta >= 0 ? '+' : '';
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
      <span>{label}</span>
      <span>
        {item.thisWeek} <span className="text-muted">(prev {item.prevWeek})</span>{' '}
        <strong style={{ color }}>{sign}{item.delta}</strong>
      </span>
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
