import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api';
import Feedback from '../components/Feedback';

export default function Foremen() {
  const { t } = useTranslation();
  const [foremen, setForemen] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);
  const [form, setForm] = useState({ name: '', icon: '' });
  const [showInactive, setShowInactive] = useState(false);
  const [requireConfirm, setRequireConfirm] = useState(true);

  const loadForemen = () =>
    api
      .getForemen(showInactive)
      .then(setForemen)
      .catch(() => setForemen([]))
      .finally(() => setLoading(false));

  useEffect(() => {
    loadForemen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showInactive]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setFeedback(null);

    try {
      await api.createForeman({ name: form.name, icon: form.icon || undefined });
      setForm({ name: '', icon: '' });
      setFeedback({ type: 'success', message: t('foremen.created') });
      loadForemen();
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  const handleDelete = async (id) => {
    if (requireConfirm && !window.confirm('Archive this foreman?')) return;
    setFeedback(null);
    try {
      await api.deleteForeman(id);
      setFeedback({ type: 'success', message: t('foremen.deleted') });
      loadForemen();
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  const handleRestore = async (id) => {
    setFeedback(null);
    try {
      await api.restoreForeman(id);
      setFeedback({ type: 'success', message: 'Foreman restored.' });
      loadForemen();
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  return (
    <div>
      <div className="section-header">
        <h1>{t('foremen.title')}</h1>
        <button className="btn btn-ghost" onClick={() => setShowInactive((v) => !v)}>
          {showInactive ? 'Hide Archived' : 'Show Archived'}
        </button>
      </div>

      <div style={{ marginBottom: 8 }}>
        <label style={{ display: 'inline-flex', gap: 6, alignItems: 'center', fontSize: 13 }}>
          <input type="checkbox" checked={requireConfirm} onChange={(e) => setRequireConfirm(e.target.checked)} />
          Require confirmation for destructive actions
        </label>
      </div>

      {feedback && <Feedback message={feedback.message} type={feedback.type} />}

      <div className="card" style={{ marginBottom: 16 }}>
        <h2>{t('foremen.addNew')}</h2>
        <form onSubmit={handleCreate}>
          <div className="row">
            <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
              <label>{t('foremen.name')}</label>
              <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder={t('foremen.namePlaceholder')} required />
            </div>
            <div className="form-group" style={{ width: 140, marginBottom: 0 }}>
              <label>{t('foremen.icon')}</label>
              <input value={form.icon} onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))} placeholder="👷" maxLength={10} />
            </div>
            <div style={{ display: 'flex', alignItems: 'end' }}>
              <button className="btn btn-primary" type="submit">{t('foremen.addNew')}</button>
            </div>
          </div>
        </form>
      </div>

      <div className="card">
        {loading ? (
          <p className="text-muted">{t('common.loading')}</p>
        ) : foremen.length === 0 ? (
          <p className="text-muted">{t('foremen.noForemen')}</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>{t('foremen.icon')}</th>
                <th>{t('foremen.name')}</th>
                <th>{t('units.created')}</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {foremen.map((foreman) => (
                <tr key={foreman.id}>
                  <td style={{ fontSize: 22 }}>{foreman.icon || '👷'}</td>
                  <td><strong>{foreman.name}</strong></td>
                  <td className="text-muted">{new Date(foreman.created_at).toLocaleDateString()}</td>
                  <td>{foreman.is_active ? 'ACTIVE' : 'ARCHIVED'}</td>
                  <td>
                    {foreman.is_active ? (
                      <button type="button" className="btn btn-ghost" style={{ color: 'var(--danger)' }} onClick={() => handleDelete(foreman.id)}>{t('common.delete')}</button>
                    ) : (
                      <button type="button" className="btn btn-ghost" onClick={() => handleRestore(foreman.id)}>Restore</button>
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
