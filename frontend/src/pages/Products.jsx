import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api';
import Feedback from '../components/Feedback';

export default function Products() {
  const { t } = useTranslation();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', manufacturer_barcode: '', size: '' });
  const [feedback, setFeedback] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [requireConfirm, setRequireConfirm] = useState(true);

  const loadProducts = () =>
    api
      .getProducts(showInactive)
      .then(setProducts)
      .catch(() => {})
      .finally(() => setLoading(false));

  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showInactive]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFeedback(null);
    try {
      await api.createProduct(form);
      setFeedback({ type: 'success', message: `${t('products.name')} "${form.name}" ${t('common.save')}.` });
      setForm({ name: '', manufacturer_barcode: '', size: '' });
      setShowForm(false);
      loadProducts();
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  const handleArchive = async (id) => {
    if (requireConfirm && !window.confirm('Archive this product?')) return;
    try {
      await api.deleteProduct(id);
      setFeedback({ type: 'success', message: 'Product archived.' });
      loadProducts();
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  const handleRestore = async (id) => {
    try {
      await api.restoreProduct(id);
      setFeedback({ type: 'success', message: 'Product restored.' });
      loadProducts();
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  return (
    <div>
      <div className="section-header">
        <h1>{t('products.title')}</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={() => setShowInactive((v) => !v)}>
            {showInactive ? 'Hide Archived' : 'Show Archived'}
          </button>
          <button className="btn btn-primary" onClick={() => setShowForm((v) => !v)}>
            {showForm ? t('common.cancel') : t('products.newProduct')}
          </button>
        </div>
      </div>

      <div style={{ marginBottom: 8 }}>
        <label style={{ display: 'inline-flex', gap: 6, alignItems: 'center', fontSize: 13 }}>
          <input type="checkbox" checked={requireConfirm} onChange={(e) => setRequireConfirm(e.target.checked)} />
          Require confirmation for destructive actions
        </label>
      </div>

      {feedback && <Feedback message={feedback.message} type={feedback.type} />}

      {showForm && (
        <div className="card mt-4">
          <h2>{t('products.createProduct')}</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>{t('products.productName')} *</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Dulux White 15L" required autoFocus />
            </div>
            <div className="form-group">
              <label>{t('products.manufacturerBarcode')}</label>
              <input value={form.manufacturer_barcode} onChange={(e) => setForm({ ...form, manufacturer_barcode: e.target.value })} />
            </div>
            <div className="form-group">
              <label>{t('products.size')}</label>
              <input value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })} placeholder="e.g. 15L, 5L" />
            </div>
            <button type="submit" className="btn btn-primary">{t('products.createProduct')}</button>
          </form>
        </div>
      )}

      <div className="card mt-4">
        {loading ? (
          <p className="text-muted">{t('common.loading')}</p>
        ) : products.length === 0 ? (
          <p className="text-muted">{t('products.noProducts')}</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>{t('products.name')}</th>
                <th>{t('products.barcode')}</th>
                <th>{t('products.size')}</th>
                <th>{t('products.units')}</th>
                <th>{t('products.batches')}</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td className="text-muted">{p.id}</td>
                  <td><strong>{p.name}</strong></td>
                  <td className="monospace">{p.manufacturer_barcode || '—'}</td>
                  <td>{p.size || '—'}</td>
                  <td>{p._count?.units ?? 0}</td>
                  <td>{p._count?.batches ?? 0}</td>
                  <td>{p.is_active ? 'ACTIVE' : 'ARCHIVED'}</td>
                  <td>
                    {p.is_active ? (
                      <button type="button" className="btn btn-ghost" style={{ color: 'var(--danger)' }} onClick={() => handleArchive(p.id)}>Archive</button>
                    ) : (
                      <button type="button" className="btn btn-ghost" onClick={() => handleRestore(p.id)}>Restore</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
