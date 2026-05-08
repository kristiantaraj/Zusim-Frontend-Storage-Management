import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api';

const MAX_HISTORY = 20;

function ScanPage({ mode, foreman, project, returnUsed }) {
  const { t } = useTranslation();
  const inputRef = useRef(null);
  const [value, setValue] = useState('');
  const [scanning, setScanning] = useState(false);
  const [history, setHistory] = useState([]); // { id, unitId, type, message, time }

  // Auto-focus on mount and whenever history updates
  useEffect(() => {
    inputRef.current?.focus();
  }, [history]);

  const addHistory = useCallback((unitId, type, message) => {
    setHistory((prev) => [
      { id: Date.now(), unitId, type, message, time: new Date().toLocaleTimeString() },
      ...prev.slice(0, MAX_HISTORY - 1),
    ]);
  }, []);

  const handleKeyDown = async (e) => {
    if (e.key !== 'Enter') return;
    const unitId = value.trim();
    setValue('');
    if (!unitId || scanning) return;

    setScanning(true);
    try {
      const result = mode === 'out'
        ? await api.scanOut(unitId, undefined, foreman?.id, project?.id)
        : await api.scanIn(unitId, undefined, foreman?.id, returnUsed === true);
      const productLabel = result.unit.product ? `[${result.unit.product}] ` : '';
      const actionLabel = result.unit.status; // IN / OUT / USED
      let msg = `${actionLabel} ✓  ${productLabel}${unitId}`;
      if (result.autoClosedTicket) {
        msg += `  🎉 ${t('tickets.autoClosed')}`;
      }
      addHistory(unitId, 'success', msg);
    } catch (err) {
      if (err.code === 'ALREADY_OUT' || err.code === 'ALREADY_IN') {
        addHistory(unitId, 'warning', `${t(err.code === 'ALREADY_OUT' ? 'scan.alreadyOut' : 'scan.alreadyIn')} ${unitId} (${t('scan.currentStatus')}: ${err.data?.unit?.status ?? '?'})`);
      } else if (err.status === 404) {
        addHistory(unitId, 'error', `${t('scan.notFound')} ${unitId}`);
      } else {
        addHistory(unitId, 'error', `Error: ${err.message}`);
      }
    } finally {
      setScanning(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="scan-container">
      <h1>
        {mode === 'out'
          ? '📤 ' + t('nav.scanOut')
          : returnUsed
            ? '🗑 ' + t('scan.titleUsed')
            : '↩ ' + t('scan.titleIn')}
      </h1>
      {foreman?.name && (
        <p className="text-muted" style={{ marginBottom: 4 }}>
          {t('scan.selectedForeman')}: {foreman.icon || '👷'} {foreman.name}
        </p>
      )}
      {project?.name && (
        <p className="text-muted" style={{ marginBottom: 8 }}>
          {t('scan.selectedProject')}: 📁 {project.name}
        </p>
      )}
      <p className="text-muted" style={{ marginBottom: 20 }}>
        {t('scan.scanLabel')}
      </p>

      <input
        ref={inputRef}
        className="large"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="HP-2026-000001"
        disabled={scanning}
        autoComplete="off"
        spellCheck={false}
      />

      {scanning && (
        <p className="text-muted" style={{ marginTop: 10 }}>
          {t('scan.processing')}
        </p>
      )}

      {history.length > 0 && (
        <div className="scan-history">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <strong style={{ fontSize: 14 }}>{t('scan.recentScans')}</strong>
            <button
              className="btn btn-ghost"
              style={{ padding: '4px 10px', fontSize: 12 }}
              onClick={() => setHistory([])}
            >
              {t('scan.clear')}
            </button>
          </div>
          {history.map((h) => (
            <div key={h.id} className={`scan-history-item ${h.type}`}>
              <span style={{ fontFamily: 'monospace', fontSize: 13 }}>{h.time}</span>
              <span style={{ flex: 1 }}>{h.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ScanOut({ foreman, project }) {
  return <ScanPage mode="out" foreman={foreman} project={project} />;
}

export function ScanIn({ foreman }) {
  return <ScanPage mode="in" foreman={foreman} returnUsed={false} />;
}

export function ScanUsed({ foreman }) {
  return <ScanPage mode="in" foreman={foreman} returnUsed={true} />;
}
