import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api';
import Feedback from '../components/Feedback';

export default function Projects() {
  const { t } = useTranslation();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);
  const [name, setName] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [requireConfirm, setRequireConfirm] = useState(true);

  const loadProjects = () =>
    api
      .getProjects(showInactive)
      .then(setProjects)
      .catch(() => setProjects([]))
      .finally(() => setLoading(false));

  useEffect(() => {
    loadProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showInactive]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setFeedback(null);
    try {
      await api.createProject({ name });
      setName('');
      setFeedback({ type: 'success', message: t('projects.created') });
      loadProjects();
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  const handleDelete = async (id) => {
    if (requireConfirm && !window.confirm('Archive this project?')) return;
    setFeedback(null);
    try {
      await api.deleteProject(id);
      setFeedback({ type: 'success', message: t('projects.deleted') });
      loadProjects();
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  const handleRestore = async (id) => {
    setFeedback(null);
    try {
      await api.restoreProject(id);
      setFeedback({ type: 'success', message: 'Project restored.' });
      loadProjects();
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  return (
    <div>
      <div className="section-header">
        <h1>{t('projects.title')}</h1>
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
        <h2>{t('projects.addNew')}</h2>
        <form onSubmit={handleCreate}>
          <div className="row">
            <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
              <label>{t('projects.name')}</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('projects.namePlaceholder')} required />
            </div>
            <div style={{ display: 'flex', alignItems: 'end' }}>
              <button className="btn btn-primary" type="submit">{t('projects.addNew')}</button>
            </div>
          </div>
        </form>
      </div>

      <div className="card">
        {loading ? (
          <p className="text-muted">{t('common.loading')}</p>
        ) : projects.length === 0 ? (
          <p className="text-muted">{t('projects.noProjects')}</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>{t('projects.name')}</th>
                <th>{t('units.created')}</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr key={project.id}>
                  <td><strong>📁 {project.name}</strong></td>
                  <td className="text-muted">{new Date(project.created_at).toLocaleDateString()}</td>
                  <td>{project.is_active ? 'ACTIVE' : 'ARCHIVED'}</td>
                  <td>
                    {project.is_active ? (
                      <button type="button" className="btn btn-ghost" style={{ color: 'var(--danger)' }} onClick={() => handleDelete(project.id)}>{t('common.delete')}</button>
                    ) : (
                      <button type="button" className="btn btn-ghost" onClick={() => handleRestore(project.id)}>Restore</button>
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
