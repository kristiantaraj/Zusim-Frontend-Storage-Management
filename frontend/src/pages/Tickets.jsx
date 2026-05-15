import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api';
import Feedback from '../components/Feedback';

function TicketCard({ ticket, onClose }) {
  const { t } = useTranslation();
  const [closing, setClosing] = useState(false);
  const [note, setNote] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);

  const total = ticket.ticket_units.length;
  const returned = ticket.ticket_units.filter((tu) => tu.returned).length;
  const allReturned = returned === total;

  const handleClose = async () => {
    setClosing(true);
    try {
      await onClose(ticket.id, note || undefined);
    } finally {
      setClosing(false);
      setShowNoteInput(false);
    }
  };

  return (
    <div
      className="card"
      style={{
        marginBottom: 16,
        borderLeft: `4px solid ${allReturned ? 'var(--success, #22c55e)' : 'var(--warning, #f59e0b)'}`,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 15 }}>
            {ticket.foreman.icon || '👷'} {ticket.foreman.name} · 📁 {ticket.project.name}
          </div>
          <div className="text-muted" style={{ fontSize: 12, marginTop: 4 }}>
            {t('tickets.opened')}: {new Date(ticket.opened_at).toLocaleString()}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: allReturned ? 'var(--success)' : 'var(--warning)' }}>
            {returned}/{total} {t('tickets.returned')}
          </span>

          {!showNoteInput ? (
            <button className="btn btn-primary" style={{ padding: '6px 14px', fontSize: 13 }} onClick={() => setShowNoteInput(true)} disabled={closing}>
              ✓ {t('tickets.closeTicket')}
            </button>
          ) : (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                style={{ fontSize: 13, padding: '4px 8px', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--bg)', color: 'var(--text)', width: 180 }}
                placeholder={t('tickets.notePlaceholder')}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                autoFocus
              />
              <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: 13 }} onClick={handleClose} disabled={closing}>
                {closing ? '…' : '✓'}
              </button>
              <button className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: 13 }} onClick={() => { setShowNoteInput(false); setNote(''); }}>
                ✕
              </button>
            </div>
          )}
        </div>
      </div>

      <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {ticket.ticket_units.map((tu) => (
          <span key={tu.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500, background: tu.returned ? '#dcfce7' : '#fef9c3', color: tu.returned ? '#166534' : '#713f12' }}>
            {tu.returned ? '✓' : '○'} {tu.unit_id}
          </span>
        ))}
      </div>
    </div>
  );
}

function HistoryCard({ ticket, onReopen }) {
  const { t } = useTranslation();
  const total = ticket.ticket_units.length;
  return (
    <div className="card" style={{ marginBottom: 12, opacity: 0.9 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>
            {ticket.foreman.icon || '👷'} {ticket.foreman.name} · 📁 {ticket.project.name}
          </div>
          <div className="text-muted" style={{ fontSize: 12, marginTop: 2 }}>
            {t('tickets.opened')}: {new Date(ticket.opened_at).toLocaleString()} — {t('tickets.closed')}: {new Date(ticket.closed_at).toLocaleString()}
          </div>
          {ticket.note && <div className="text-muted" style={{ fontSize: 12, marginTop: 2, fontStyle: 'italic' }}>{ticket.note}</div>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="text-muted" style={{ fontSize: 12 }}>{total} {t('tickets.units')}</span>
          <button className="btn btn-ghost" onClick={() => onReopen(ticket.id)}>Reopen</button>
        </div>
      </div>
    </div>
  );
}

export default function Tickets() {
  const { t } = useTranslation();
  const [tab, setTab] = useState('open');
  const [openTickets, setOpenTickets] = useState([]);
  const [closedTickets, setClosedTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);
  const [mergeForm, setMergeForm] = useState({ target_ticket_id: '', source_ticket_ids: '', note: '' });
  const [splitForm, setSplitForm] = useState({ ticket_id: '', unit_ids: '', note: '' });

  const loadOpen = useCallback(async () => {
    const data = await api.getTickets('OPEN');
    setOpenTickets(Array.isArray(data) ? data : []);
  }, []);

  const loadClosed = useCallback(async () => {
    const data = await api.getTickets('CLOSED');
    setClosedTickets(Array.isArray(data) ? data : []);
  }, []);

  const refresh = useCallback(async () => {
    if (tab === 'open') await loadOpen();
    if (tab === 'history') await loadClosed();
  }, [tab, loadOpen, loadClosed]);

  useEffect(() => {
    setLoading(true);
    setFeedback(null);
    refresh().catch(() => setFeedback({ type: 'error', message: t('messages.failedToLoad') })).finally(() => setLoading(false));
  }, [tab, refresh, t]);

  useEffect(() => {
    if (tab !== 'open') return;
    const interval = setInterval(() => loadOpen().catch(() => {}), 30000);
    return () => clearInterval(interval);
  }, [tab, loadOpen]);

  const handleClose = async (id, note) => {
    try {
      await api.closeTicket(id, note);
      setOpenTickets((prev) => prev.filter((tk) => tk.id !== id));
      setFeedback({ type: 'success', message: `Closed ticket #${id}` });
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  const handleReopen = async (id) => {
    try {
      await api.reopenTicket(id);
      setFeedback({ type: 'success', message: `Reopened ticket #${id}` });
      loadClosed();
      loadOpen();
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  const submitMerge = async (e) => {
    e.preventDefault();
    try {
      await api.mergeTickets({
        target_ticket_id: parseInt(mergeForm.target_ticket_id, 10),
        source_ticket_ids: mergeForm.source_ticket_ids.split(',').map((x) => parseInt(x.trim(), 10)).filter(Boolean),
        note: mergeForm.note || undefined,
      });
      setFeedback({ type: 'success', message: 'Tickets merged.' });
      setMergeForm({ target_ticket_id: '', source_ticket_ids: '', note: '' });
      loadOpen();
      loadClosed();
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  const submitSplit = async (e) => {
    e.preventDefault();
    try {
      await api.splitTicket(parseInt(splitForm.ticket_id, 10), {
        unit_ids: splitForm.unit_ids.split(',').map((x) => x.trim()).filter(Boolean),
        note: splitForm.note || undefined,
      });
      setFeedback({ type: 'success', message: 'Ticket split created.' });
      setSplitForm({ ticket_id: '', unit_ids: '', note: '' });
      loadOpen();
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  return (
    <div>
      <h1 style={{ marginBottom: 20 }}>{t('tickets.title')}</h1>
      {feedback && <Feedback message={feedback.message} type={feedback.type} />}

      <div className="row" style={{ marginBottom: 16 }}>
        <div className="card" style={{ flex: 1, minWidth: 320 }}>
          <h2 style={{ marginBottom: 10 }}>Merge Tickets</h2>
          <form onSubmit={submitMerge}>
            <div className="form-group">
              <label>Target Ticket ID</label>
              <input value={mergeForm.target_ticket_id} onChange={(e) => setMergeForm((f) => ({ ...f, target_ticket_id: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label>Source Ticket IDs (comma separated)</label>
              <input value={mergeForm.source_ticket_ids} onChange={(e) => setMergeForm((f) => ({ ...f, source_ticket_ids: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label>Note</label>
              <input value={mergeForm.note} onChange={(e) => setMergeForm((f) => ({ ...f, note: e.target.value }))} />
            </div>
            <button className="btn btn-primary" type="submit">Merge</button>
          </form>
        </div>

        <div className="card" style={{ flex: 1, minWidth: 320 }}>
          <h2 style={{ marginBottom: 10 }}>Split Ticket</h2>
          <form onSubmit={submitSplit}>
            <div className="form-group">
              <label>Source Ticket ID</label>
              <input value={splitForm.ticket_id} onChange={(e) => setSplitForm((f) => ({ ...f, ticket_id: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label>Unit IDs to move (comma separated)</label>
              <input value={splitForm.unit_ids} onChange={(e) => setSplitForm((f) => ({ ...f, unit_ids: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label>Note</label>
              <input value={splitForm.note} onChange={(e) => setSplitForm((f) => ({ ...f, note: e.target.value }))} />
            </div>
            <button className="btn btn-primary" type="submit">Split</button>
          </form>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: '1px solid var(--border)' }}>
        {['open', 'history'].map((key) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px 18px', fontSize: 14, fontWeight: tab === key ? 700 : 400, color: tab === key ? 'var(--primary)' : 'var(--text-muted)', borderBottom: tab === key ? '2px solid var(--primary)' : '2px solid transparent' }}
          >
            {key === 'open' ? `🟡 ${t('tickets.open')}` : `🗂 ${t('tickets.history')}`}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-muted">{t('common.loading')}</p>
      ) : tab === 'open' ? (
        openTickets.length === 0 ? <p className="text-muted">{t('tickets.noOpen')}</p> : openTickets.map((tk) => <TicketCard key={tk.id} ticket={tk} onClose={handleClose} />)
      ) : (
        closedTickets.length === 0 ? <p className="text-muted">{t('tickets.noHistory')}</p> : closedTickets.map((tk) => <HistoryCard key={tk.id} ticket={tk} onReopen={handleReopen} />)
      )}
    </div>
  );
}
