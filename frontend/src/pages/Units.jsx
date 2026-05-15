import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api';
import Feedback from '../components/Feedback';
import { generateBatchZpl, printWithBrowserPrint } from '../printing';

export default function Units() {
  const { t } = useTranslation();
  const [units, setUnits] = useState([]);
  const [total, setTotal] = useState(0);
  const [products, setProducts] = useState([]);
  const [foremen, setForemen] = useState([]);
  const [projects, setProjects] = useState([]);
  const [printJobs, setPrintJobs] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [selected, setSelected] = useState([]);
  const [filters, setFilters] = useState({
    unit_id: '',
    product_id: '',
    foreman_id: '',
    project_id: '',
    status: '',
    from_date: '',
    to_date: '',
    page: 1,
    limit: 50,
  });
  const [forceForm, setForceForm] = useState({
    unit_id: '',
    status: 'IN',
    reason_code: 'MANUAL_FIX',
    note: '',
    foreman_id: '',
    project_id: '',
  });
  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState(false);

  const selectedCount = selected.length;

  const loadUnits = () => {
    setLoading(true);
    api
      .getUnits(filters)
      .then((r) => {
        setUnits(r.units);
        setTotal(r.total);
      })
      .catch((err) => setFeedback({ type: 'error', message: err.message }))
      .finally(() => setLoading(false));
  };

  const loadPrintJobs = () => {
    api.getPrintJobs(true).then(setPrintJobs).catch(() => {});
  };

  useEffect(() => {
    Promise.all([api.getProducts(), api.getForemen(), api.getProjects()])
      .then(([p, f, pr]) => {
        setProducts(p);
        setForemen(f);
        setProjects(pr);
      })
      .catch(() => {});
    loadPrintJobs();
  }, []);

  useEffect(() => {
    loadUnits();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const setFilter = (key, value) => setFilters((f) => ({ ...f, [key]: value, page: 1 }));

  const selectedUnits = useMemo(() => {
    const map = new Map(units.map((u) => [u.id, u]));
    return selected.map((id) => map.get(id)).filter(Boolean);
  }, [selected, units]);

  const toggleSelected = (id) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const exportCsv = async () => {
    try {
      const csv = await api.exportUnitsCsv(filters);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `units-${Date.now()}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  const printSelected = async () => {
    if (!selectedUnits.length) return;
    setPrinting(true);
    setFeedback(null);
    try {
      const labelPayload = await Promise.all(selectedUnits.map((u) => api.getUnitLabel(u.id)));
      const zpl = generateBatchZpl(
        labelPayload.map((x) => ({
          unitId: x.unit_id,
          productName: x.product_name,
          batchDate: x.batch_date ? new Date(x.batch_date).toLocaleDateString() : '',
        }))
      );
      await printWithBrowserPrint(zpl);

      await Promise.all(
        selectedUnits.map((u) => api.logPrintJob({ unit_id: u.id, status: 'SUCCESS', requested_by: 'manager' }))
      );

      setFeedback({ type: 'success', message: `Printed ${selectedUnits.length} label(s).` });
      setSelected([]);
      loadPrintJobs();
    } catch (err) {
      await Promise.all(
        selectedUnits.map((u) =>
          api.logPrintJob({
            unit_id: u.id,
            status: 'FAILED',
            error: err.message,
            requested_by: 'manager',
          }).catch(() => {})
        )
      );
      setFeedback({ type: 'error', message: err.message });
      loadPrintJobs();
    } finally {
      setPrinting(false);
    }
  };

  const retryFailedPrint = async (job) => {
    try {
      const label = await api.getUnitLabel(job.unit_id);
      const zpl = generateBatchZpl([
        {
          unitId: label.unit_id,
          productName: label.product_name,
          batchDate: label.batch_date ? new Date(label.batch_date).toLocaleDateString() : '',
        },
      ]);
      await printWithBrowserPrint(zpl);
      await api.logPrintJob({ unit_id: job.unit_id, status: 'SUCCESS', requested_by: 'manager-retry' });
      setFeedback({ type: 'success', message: `Reprinted ${job.unit_id}` });
      loadPrintJobs();
    } catch (err) {
      await api.logPrintJob({ unit_id: job.unit_id, status: 'FAILED', error: err.message, requested_by: 'manager-retry' }).catch(() => {});
      setFeedback({ type: 'error', message: err.message });
      loadPrintJobs();
    }
  };

  const submitForce = async (e) => {
    e.preventDefault();
    setFeedback(null);
    if (!forceForm.unit_id) return;

    try {
      await api.forceUnitStatus(forceForm.unit_id, {
        status: forceForm.status,
        reason_code: forceForm.reason_code,
        note: forceForm.note || undefined,
        foreman_id: forceForm.foreman_id || undefined,
        project_id: forceForm.project_id || undefined,
      });
      setFeedback({ type: 'success', message: `Updated ${forceForm.unit_id} to ${forceForm.status}.` });
      setForceForm((f) => ({ ...f, note: '' }));
      loadUnits();
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  return (
    <div>
      <h1>{t('units.title')}</h1>

      {feedback && <Feedback message={feedback.message} type={feedback.type} />}

      <div className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ marginBottom: 10 }}>Manual Correction</h2>
        <form onSubmit={submitForce}>
          <div className="row">
            <div className="form-group" style={{ width: 180, marginBottom: 0 }}>
              <label>Unit ID</label>
              <input value={forceForm.unit_id} onChange={(e) => setForceForm((f) => ({ ...f, unit_id: e.target.value }))} placeholder="HP-2026-000001" required />
            </div>
            <div className="form-group" style={{ width: 130, marginBottom: 0 }}>
              <label>Status</label>
              <select value={forceForm.status} onChange={(e) => setForceForm((f) => ({ ...f, status: e.target.value }))}>
                <option value="IN">IN</option>
                <option value="OUT">OUT</option>
                <option value="USED">USED</option>
              </select>
            </div>
            <div className="form-group" style={{ width: 160, marginBottom: 0 }}>
              <label>Reason Code</label>
              <input value={forceForm.reason_code} onChange={(e) => setForceForm((f) => ({ ...f, reason_code: e.target.value }))} required />
            </div>
            <div className="form-group" style={{ flex: 1, minWidth: 220, marginBottom: 0 }}>
              <label>Note</label>
              <input value={forceForm.note} onChange={(e) => setForceForm((f) => ({ ...f, note: e.target.value }))} placeholder="Explain why this correction is needed" />
            </div>
            <div className="form-group" style={{ width: 180, marginBottom: 0 }}>
              <label>Foreman (optional)</label>
              <select value={forceForm.foreman_id} onChange={(e) => setForceForm((f) => ({ ...f, foreman_id: e.target.value }))}>
                <option value="">—</option>
                {foremen.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ width: 180, marginBottom: 0 }}>
              <label>Project (optional)</label>
              <select value={forceForm.project_id} onChange={(e) => setForceForm((f) => ({ ...f, project_id: e.target.value }))}>
                <option value="">—</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'end' }}>
              <button className="btn btn-primary" type="submit">Force Update</button>
            </div>
          </div>
        </form>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="row">
          <div className="form-group" style={{ width: 220, marginBottom: 0 }}>
            <label>Unit ID</label>
            <input value={filters.unit_id} onChange={(e) => setFilter('unit_id', e.target.value)} placeholder="contains..." />
          </div>
          <div className="form-group" style={{ width: 220, marginBottom: 0 }}>
            <label>{t('units.product')}</label>
            <select value={filters.product_id} onChange={(e) => setFilter('product_id', e.target.value)}>
              <option value="">{t('units.allProducts')}</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ width: 140, marginBottom: 0 }}>
            <label>{t('units.status')}</label>
            <select value={filters.status} onChange={(e) => setFilter('status', e.target.value)}>
              <option value="">{t('units.all')}</option>
              <option value="IN">IN</option>
              <option value="OUT">OUT</option>
              <option value="USED">USED</option>
            </select>
          </div>
          <div className="form-group" style={{ width: 180, marginBottom: 0 }}>
            <label>Foreman</label>
            <select value={filters.foreman_id} onChange={(e) => setFilter('foreman_id', e.target.value)}>
              <option value="">All</option>
              {foremen.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ width: 180, marginBottom: 0 }}>
            <label>Project</label>
            <select value={filters.project_id} onChange={(e) => setFilter('project_id', e.target.value)}>
              <option value="">All</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ width: 150, marginBottom: 0 }}>
            <label>From</label>
            <input type="date" value={filters.from_date} onChange={(e) => setFilter('from_date', e.target.value)} />
          </div>
          <div className="form-group" style={{ width: 150, marginBottom: 0 }}>
            <label>To</label>
            <input type="date" value={filters.to_date} onChange={(e) => setFilter('to_date', e.target.value)} />
          </div>
          <div style={{ display: 'flex', alignItems: 'end', gap: 8 }}>
            <button className="btn btn-ghost" type="button" onClick={exportCsv}>Export CSV</button>
            <button className="btn btn-primary" type="button" disabled={!selectedCount || printing} onClick={printSelected}>
              {printing ? 'Printing...' : `Reprint Selected (${selectedCount})`}
            </button>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ marginBottom: 10 }}>Failed Print Queue</h2>
        {printJobs.length === 0 ? (
          <p className="text-muted">No failed print jobs.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>When</th>
                <th>Unit</th>
                <th>Product</th>
                <th>Error</th>
                <th>Retry</th>
              </tr>
            </thead>
            <tbody>
              {printJobs.map((j) => (
                <tr key={j.id}>
                  <td className="text-muted">{new Date(j.created_at).toLocaleString()}</td>
                  <td className="monospace">{j.unit_id}</td>
                  <td>{j.unit?.product?.name || '—'}</td>
                  <td className="text-muted">{j.error || 'Unknown'}</td>
                  <td><button className="btn btn-ghost" onClick={() => retryFailedPrint(j)}>Retry</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <div className="section-header">
          <span className="text-muted" style={{ fontSize: 13 }}>
            {total} {t('units.unitsFound')}
          </span>
          <div className="row" style={{ gap: 8, marginBottom: 0 }}>
            <button
              className="btn btn-ghost"
              style={{ padding: '5px 12px', fontSize: 13 }}
              disabled={filters.page <= 1}
              onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
            >
              {t('units.prev')}
            </button>
            <span style={{ fontSize: 13, lineHeight: '32px' }}>{t('units.page')} {filters.page}</span>
            <button
              className="btn btn-ghost"
              style={{ padding: '5px 12px', fontSize: 13 }}
              disabled={units.length < filters.limit}
              onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
            >
              {t('units.next')}
            </button>
          </div>
        </div>

        {loading ? (
          <p className="text-muted">{t('common.loading')}</p>
        ) : units.length === 0 ? (
          <p className="text-muted">{t('units.noUnitsFound')}</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th></th>
                <th>{t('units.product')} ID</th>
                <th>{t('units.product')}</th>
                <th>{t('units.batch')}</th>
                <th>{t('units.status')}</th>
                <th>Open Ticket</th>
                <th>{t('units.created')}</th>
                <th>{t('units.updated')}</th>
              </tr>
            </thead>
            <tbody>
              {units.map((u) => (
                <tr key={u.id}>
                  <td>
                    <input type="checkbox" checked={selected.includes(u.id)} onChange={() => toggleSelected(u.id)} />
                  </td>
                  <td className="monospace">{u.id}</td>
                  <td>{u.product?.name ?? '—'}</td>
                  <td className="text-muted">
                    #{u.batch?.id} — {u.batch ? new Date(u.batch.delivery_date).toLocaleDateString() : ''}
                  </td>
                  <td>
                    <span className={`badge badge-${u.status.toLowerCase()}`}>{u.status}</span>
                  </td>
                  <td className="text-muted">
                    {u.open_ticket ? `#${u.open_ticket.id} ${u.open_ticket.foreman?.name || ''} / ${u.open_ticket.project?.name || ''}` : '—'}
                  </td>
                  <td className="text-muted">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="text-muted">{new Date(u.updated_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
