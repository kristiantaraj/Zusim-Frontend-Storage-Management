import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api';

export default function Dashboard() {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [reportPeriod, setReportPeriod] = useState('weekly');
  const [reportLanguage, setReportLanguage] = useState('pl');
  const [reportLoading, setReportLoading] = useState(false);

  useEffect(() => {
    api
      .getDashboard()
      .then(setData)
      .catch(() => setError(t('messages.failedToLoad')));
  }, [t]);

  const handleExportReport = async () => {
    setError('');
    setReportLoading(true);
    try {
      const blob = await api.exportReportXlsx(reportPeriod, reportLanguage);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const periodLabel = reportLanguage === 'pl'
        ? (reportPeriod === 'monthly' ? 'miesieczny' : 'tygodniowy')
        : reportPeriod;
      const filePrefix = reportLanguage === 'pl' ? 'raport-zusim' : 'zusim-report';
      a.download = `${filePrefix}-${periodLabel}-${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (_err) {
      setError(t('dashboard.reportDownloadFailed'));
    } finally {
      setReportLoading(false);
    }
  };

  if (error) return <p className="feedback feedback-error">{error}</p>;
  if (!data) return <p className="text-muted">{t('common.loading')}</p>;

  return (
    <div>
      <div className="dashboard-hero">
        <div>
          <h1>{t('dashboard.title')}</h1>
          <p className="text-muted">{t('layout.workspaceHint')}</p>
        </div>
        <div className="dashboard-pills">
          <span className="dashboard-pill">{t('dashboard.alerts')}: {(data.alerts?.staleOutUnits?.length || 0) + (data.alerts?.longOpenTickets?.length || 0) + (data.alerts?.lowStockProducts?.length || 0)}</span>
          <span className="dashboard-pill">{t('dashboard.recentScans')}: {data.recentScans?.length || 0}</span>
          <span className="dashboard-pill">{t('dashboard.weeklyTrends')}</span>
        </div>
      </div>

      <div className="card dashboard-report-controls" style={{ marginBottom: 16 }}>
        <div>
          <h2>{t('dashboard.reportsTitle')}</h2>
          <p className="text-muted">{t('dashboard.reportsHint')}</p>
        </div>
        <div className="dashboard-report-actions">
          <select value={reportPeriod} onChange={(e) => setReportPeriod(e.target.value)}>
            <option value="weekly">{t('dashboard.reportWeekly')}</option>
            <option value="monthly">{t('dashboard.reportMonthly')}</option>
          </select>
          <select value={reportLanguage} onChange={(e) => setReportLanguage(e.target.value)}>
            <option value="pl">{t('dashboard.reportLanguagePl')}</option>
            <option value="en">{t('dashboard.reportLanguageEn')}</option>
          </select>
          <button className="btn btn-primary" onClick={handleExportReport} disabled={reportLoading}>
            {reportLoading ? t('dashboard.exportingReport') : t('dashboard.exportReport')}
          </button>
        </div>
      </div>

      <div className="card-grid">
        <StatCard value={data.totalProducts} label={t('dashboard.totalProducts')} />
        <StatCard value={data.totalBatches} label={t('dashboard.totalBatches')} />
        <StatCard value={data.totalUnits} label={t('dashboard.totalUnits')} />
        <StatCard value={data.inCount} label={t('dashboard.inStock')} color="var(--success)" />
        <StatCard value={data.outCount} label={t('dashboard.checkedOut')} color="var(--danger)" />
        <StatCard value={data.usedCount} label={t('dashboard.used')} color="var(--text-muted)" />
      </div>

      <div className="dashboard-grid" style={{ marginBottom: 16 }}>
        <div className="card dashboard-section-card">
          <h2>{t('dashboard.weeklyTrends')}</h2>
          <TrendLine label={t('dashboard.issued')} item={data.trends?.issued} />
          <TrendLine label={t('dashboard.returned')} item={data.trends?.returned} />
          <TrendLine label={t('dashboard.usedLabel')} item={data.trends?.used} />
        </div>

        <div className="card dashboard-section-card">
          <h2>{t('dashboard.alerts')}</h2>
          <p className="text-muted dashboard-line-item">{t('dashboard.staleOutUnits')}: {data.alerts?.staleOutUnits?.length || 0}</p>
          <p className="text-muted dashboard-line-item">{t('dashboard.longOpenTickets')}: {data.alerts?.longOpenTickets?.length || 0}</p>
          <p className="text-muted">{t('dashboard.lowStockProducts')}: {data.alerts?.lowStockProducts?.length || 0}</p>
        </div>
      </div>

      <div className="dashboard-grid dashboard-grid-3" style={{ marginBottom: 16 }}>
        <div className="card dashboard-section-card">
          <h2>{t('dashboard.topProducts7d')}</h2>
          {(data.insights?.topProducts || []).length === 0 ? (
            <p className="text-muted">{t('dashboard.noData')}</p>
          ) : (
            (data.insights?.topProducts || []).map((x, i) => (
              <div key={`${x.product}-${i}`} className="dashboard-row-item">
                <span>{x.product}</span>
                <strong>{x.count}</strong>
              </div>
            ))
          )}
        </div>

        <div className="card dashboard-section-card">
          <h2>{t('dashboard.foremanActivity7d')}</h2>
          {(data.insights?.foremen || []).length === 0 ? (
            <p className="text-muted">{t('dashboard.noData')}</p>
          ) : (
            (data.insights?.foremen || []).map((x) => (
              <div key={x.id} className="dashboard-row-item">
                <span>{x.icon || '👷'} {x.name}</span>
                <strong>{x.tickets}</strong>
              </div>
            ))
          )}
        </div>

        <div className="card dashboard-section-card">
          <h2>{t('dashboard.projectActivity7d')}</h2>
          {(data.insights?.projects || []).length === 0 ? (
            <p className="text-muted">{t('dashboard.noData')}</p>
          ) : (
            (data.insights?.projects || []).map((x) => (
              <div key={x.id} className="dashboard-row-item">
                <span>📁 {x.name}</span>
                <strong>{x.tickets}</strong>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="card dashboard-section-card" style={{ marginBottom: 16 }}>
        <h2>{t('dashboard.exceptions')}</h2>
        {(data.alerts?.staleOutUnits || []).slice(0, 8).map((u) => (
          <div key={u.id} className="text-muted dashboard-line-item">
            {t('dashboard.outTooLong')}: {u.id} {u.product ? `(${u.product})` : ''} {t('dashboard.since')} {new Date(u.since).toLocaleString()}
          </div>
        ))}
        {(data.alerts?.longOpenTickets || []).slice(0, 8).map((tk) => (
          <div key={tk.id} className="text-muted dashboard-line-item">
            {t('dashboard.openTooLong')}: {t('dashboard.ticket')} #{tk.id} {tk.foreman?.name || ''} / {tk.project?.name || ''} {t('dashboard.pending')} {tk.pending_units}
          </div>
        ))}
        {(data.alerts?.lowStockProducts || []).slice(0, 8).map((p) => (
          <div key={p.id} className="text-muted dashboard-line-item">
            {t('dashboard.lowStock')}: {p.name} {t('dashboard.inStockNow')} {p.in_stock}
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
  const { t } = useTranslation();
  if (!item) return null;
  const color = item.delta >= 0 ? 'var(--success)' : 'var(--danger)';
  const sign = item.delta >= 0 ? '+' : '';
  return (
    <div className="dashboard-row-item">
      <span>{label}</span>
      <span>
        {item.thisWeek} <span className="text-muted">({t('dashboard.prev')} {item.prevWeek})</span>{' '}
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
