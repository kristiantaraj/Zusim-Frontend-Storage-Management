import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api';

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
            {ticket.foreman.icon || '👷'} {ticket.foreman.name} &nbsp;·&nbsp; 📁 {ticket.project.name}
          </div>
          <div className="text-muted" style={{ fontSize: 12, marginTop: 4 }}>
            {t('tickets.opened')}: {new Date(ticket.opened_at).toLocaleString()}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: allReturned ? 'var(--success, #22c55e)' : 'var(--warning, #f59e0b)',
            }}
          >
            {returned}/{total} {t('tickets.returned')}
          </span>

          {!showNoteInput ? (
            <button
              className="btn btn-primary"
              style={{ padding: '6px 14px', fontSize: 13 }}
              onClick={() => setShowNoteInput(true)}
              disabled={closing}
              title={t('tickets.closeTicket')}
            >
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

      {/* Unit list */}
      <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {ticket.ticket_units.map((tu) => (
          <span
            key={tu.id}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '3px 10px',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 500,
              background: tu.returned ? 'var(--success-bg, #dcfce7)' : 'var(--warning-bg, #fef9c3)',
              color: tu.returned ? 'var(--success-text, #166534)' : 'var(--warning-text, #713f12)',
              border: `1px solid ${tu.returned ? 'var(--success, #22c55e)' : 'var(--warning, #f59e0b)'}`,
            }}
          >
            {tu.returned ? '✓' : '○'} {tu.unit_id}
            {tu.unit?.product?.name && <span style={{ opacity: 0.7 }}>({tu.unit.product.name})</span>}
          </span>
        ))}
      </div>
    </div>
  );
}

function HistoryCard({ ticket }) {
  const { t } = useTranslation();
  const total = ticket.ticket_units.length;
  const closedByLabel = ticket.closed_by === 'auto' ? t('tickets.closedAuto') : t('tickets.closedManager');

  return (
    <div className="card" style={{ marginBottom: 12, opacity: 0.85 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>
            {ticket.foreman.icon || '👷'} {ticket.foreman.name} &nbsp;·&nbsp; 📁 {ticket.project.name}
          </div>
          <div className="text-muted" style={{ fontSize: 12, marginTop: 2 }}>
            {t('tickets.opened')}: {new Date(ticket.opened_at).toLocaleString()} &nbsp;—&nbsp;
            {t('tickets.closed')}: {new Date(ticket.closed_at).toLocaleString()}
          </div>
          {ticket.note && (
            <div className="text-muted" style={{ fontSize: 12, marginTop: 2, fontStyle: 'italic' }}>
              {ticket.note}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{total} {t('tickets.units')}</span>
          <span
            style={{
              fontSize: 11,
              padding: '2px 8px',
              borderRadius: 12,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
            }}
          >
            {closedByLabel}
          </span>
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
  const [error, setError] = useState('');

  const loadOpen = useCallback(async () => {
    const data = await api.getTickets('OPEN');
    setOpenTickets(Array.isArray(data) ? data : []);
  }, []);

  const loadClosed = useCallback(async () => {
    const data = await api.getTickets('CLOSED');
    setClosedTickets(Array.isArray(data) ? data : []);
  }, []);

  useEffect(() => {
    setLoading(true);
    setError('');
    const loader = tab === 'open' ? loadOpen : loadClosed;
    loader()
      .catch(() => setError(t('messages.failedToLoad')))
      .finally(() => setLoading(false));
  }, [tab, loadOpen, loadClosed, t]);

  // Poll open tickets every 30 seconds
  useEffect(() => {
    if (tab !== 'open') return;
    const interval = setInterval(() => loadOpen().catch(() => {}), 30000);
    return () => clearInterval(interval);
  }, [tab, loadOpen]);

  const handleClose = async (id, note) => {
    try {
      await api.closeTicket(id, note);
      setOpenTickets((prev) => prev.filter((tk) => tk.id !== id));
    } catch {
      setError(t('tickets.closeFailed'));
    }
  };

  return (
    <div>
      <h1 style={{ marginBottom: 20 }}>{t('tickets.title')}</h1>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        {['open', 'history'].map((key) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '8px 18px',
              fontSize: 14,
              fontWeight: tab === key ? 700 : 400,
              color: tab === key ? 'var(--primary)' : 'var(--text-muted)',
              borderBottom: tab === key ? '2px solid var(--primary)' : '2px solid transparent',
              marginBottom: -1,
            }}
          >
            {key === 'open' ? `🟡 ${t('tickets.open')}` : `🗂 ${t('tickets.history')}`}
            {key === 'open' && openTickets.length > 0 && (
              <span
                style={{
                  marginLeft: 6,
                  background: 'var(--danger, #ef4444)',
                  color: '#fff',
                  borderRadius: 10,
                  fontSize: 11,
                  padding: '1px 7px',
                  fontWeight: 700,
                }}
              >
                {openTickets.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}

      {loading ? (
        <p className="text-muted">{t('common.loading')}</p>
      ) : tab === 'open' ? (
        openTickets.length === 0 ? (
          <p className="text-muted">{t('tickets.noOpen')}</p>
        ) : (
          openTickets.map((tk) => (
            <TicketCard key={tk.id} ticket={tk} onClose={handleClose} />
          ))
        )
      ) : (
        closedTickets.length === 0 ? (
          <p className="text-muted">{t('tickets.noHistory')}</p>
        ) : (
          closedTickets.map((tk) => <HistoryCard key={tk.id} ticket={tk} />)
        )
      )}
    </div>
  );
}
