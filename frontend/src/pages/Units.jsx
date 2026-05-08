import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api';

export default function Units() {
  const { t } = useTranslation();
  const [units, setUnits] = useState([]);
  const [total, setTotal] = useState(0);
  const [products, setProducts] = useState([]);
  const [filters, setFilters] = useState({ product_id: '', status: '', page: 1, limit: 50 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getProducts().then(setProducts).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    api
      .getUnits(filters)
      .then((r) => {
        setUnits(r.units);
        setTotal(r.total);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [filters]);

  const setFilter = (key, value) =>
    setFilters((f) => ({ ...f, [key]: value, page: 1 }));

  return (
    <div>
      <h1>{t('units.title')}</h1>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="row">
          <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
            <label>{t('units.product')}</label>
            <select value={filters.product_id} onChange={(e) => setFilter('product_id', e.target.value)}>
              <option value="">{t('units.allProducts')}</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ width: 160, marginBottom: 0 }}>
            <label>{t('units.status')}</label>
            <select value={filters.status} onChange={(e) => setFilter('status', e.target.value)}>
              <option value="">{t('units.all')}</option>
              <option value="IN">IN</option>
              <option value="OUT">OUT</option>
              <option value="USED">USED</option>
            </select>
          </div>
        </div>
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
                <th>{t('units.product')} ID</th>
                <th>{t('units.product')}</th>
                <th>{t('units.batch')}</th>
                <th>{t('units.status')}</th>
                <th>{t('units.created')}</th>
                <th>{t('units.updated')}</th>
              </tr>
            </thead>
            <tbody>
              {units.map((u) => (
                <tr key={u.id}>
                  <td className="monospace">{u.id}</td>
                  <td>{u.product?.name ?? '—'}</td>
                  <td className="text-muted">
                    #{u.batch?.id} — {u.batch ? new Date(u.batch.delivery_date).toLocaleDateString() : ''}
                  </td>
                  <td>
                    <span className={`badge badge-${u.status.toLowerCase()}`}>{u.status}</span>
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
