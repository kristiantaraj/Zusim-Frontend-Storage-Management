import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api';

const MAX_HISTORY = 20;

function ScanPage({ mode, foreman, project, returnUsed, autoSubmit = false }) {
  const { t } = useTranslation();
  const inputRef = useRef(null);
  const autoSubmitTimerRef = useRef(null);
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

  useEffect(() => {
    return () => {
      if (autoSubmitTimerRef.current) {
        clearTimeout(autoSubmitTimerRef.current);
        autoSubmitTimerRef.current = null;
      }
    };
  }, []);

  const submitScan = useCallback(async (rawValue) => {
    const unitId = String(rawValue || '').replace(/[\r\n]+/g, '').trim();
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
  }, [addHistory, foreman?.id, mode, project?.id, returnUsed, scanning, t]);

  const handleKeyDown = async (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    await submitScan(value);
  };

  const handleChange = (e) => {
    const nextValue = e.target.value;
    setValue(nextValue);

    if (!autoSubmit || scanning) return;

    if (autoSubmitTimerRef.current) {
      clearTimeout(autoSubmitTimerRef.current);
      autoSubmitTimerRef.current = null;
    }

    const hasScannerTerminator = /[\r\n]/.test(nextValue);
    const delayMs = hasScannerTerminator ? 0 : 150;

    autoSubmitTimerRef.current = setTimeout(() => {
      submitScan(nextValue);
    }, delayMs);
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
        <p className="text-muted scan-meta-line">
          {t('scan.selectedForeman')}: {foreman.icon || '👷'} {foreman.name}
        </p>
      )}
      {project?.name && (
        <p className="text-muted scan-meta-line scan-meta-line-gap">
          {t('scan.selectedProject')}: 📁 {project.name}
        </p>
      )}
      <p className="text-muted scan-instruction">
        {t('scan.scanLabel')}
      </p>

      <input
        ref={inputRef}
        className="large"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="HP-2026-000001"
        disabled={scanning}
        autoComplete="off"
        spellCheck={false}
      />

      {scanning && (
        <p className="text-muted scan-processing">
          {t('scan.processing')}
        </p>
      )}

      {history.length > 0 && (
        <div className="scan-history">
          <div className="scan-history-header">
            <strong>{t('scan.recentScans')}</strong>
            <button
              className="btn btn-ghost scan-clear-btn"
              onClick={() => setHistory([])}
            >
              {t('scan.clear')}
            </button>
          </div>
          {history.map((h) => (
            <div key={h.id} className={`scan-history-item ${h.type}`}>
              <span className="scan-history-time">{h.time}</span>
              <span className="scan-history-message">{h.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ScanOut({ foreman, project, autoSubmit = false }) {
  return <ScanPage mode="out" foreman={foreman} project={project} autoSubmit={autoSubmit} />;
}

export function ScanIn({ foreman, autoSubmit = false }) {
  return <ScanPage mode="in" foreman={foreman} returnUsed={false} autoSubmit={autoSubmit} />;
}

export function ScanUsed({ foreman, autoSubmit = false }) {
  return <ScanPage mode="in" foreman={foreman} returnUsed={true} autoSubmit={autoSubmit} />;
}
