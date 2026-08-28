import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api';

const MAX_HISTORY = 20;
const MANUAL_PREFIX = 'HP-2026-';

function ScanPage({ mode, foreman, project, returnUsed, autoSubmit = false, manual = false }) {
  const { t } = useTranslation();
  const inputRef = useRef(null);
  const autoSubmitTimerRef = useRef(null);
  const [value, setValue] = useState(manual ? MANUAL_PREFIX : '');
  const [scanning, setScanning] = useState(false);
  const [history, setHistory] = useState([]); // { id, unitId, type, message, time }

  // Auto-focus on mount and whenever history updates; keep cursor after the fixed prefix
  useEffect(() => {
    inputRef.current?.focus();
    if (manual && inputRef.current) {
      const len = inputRef.current.value.length;
      inputRef.current.setSelectionRange(len, len);
    }
  }, [history, manual]);

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
    setValue(manual ? MANUAL_PREFIX : '');
    if (!unitId || (manual && unitId === MANUAL_PREFIX) || scanning) return;

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
  }, [addHistory, foreman?.id, manual, mode, project?.id, returnUsed, scanning, t]);

  const handleKeyDown = async (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    if (manual) return;
    await submitScan(value);
  };

  const handleChange = (e) => {
    const nextValue = e.target.value;

    if (manual) {
      // Keep the fixed prefix intact; operator only edits the trailing digits.
      setValue(nextValue.startsWith(MANUAL_PREFIX) ? nextValue : MANUAL_PREFIX);
      return;
    }

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
          ? (manual ? '📤✋ ' + t('scan.titleOutManual') : '📤 ' + t('nav.scanOut'))
          : returnUsed
            ? (manual ? '✋ ' + t('scan.titleUsedManual') : '🗑 ' + t('scan.titleUsed'))
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
        {manual ? t('scan.manualLabel') : t('scan.scanLabel')}
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

      {manual && (
        <button
          type="button"
          className="btn btn-primary scan-manual-return-btn"
          disabled={scanning || value.trim() === MANUAL_PREFIX}
          onClick={() => submitScan(value)}
        >
          {mode === 'out' ? t('scan.outButton') : t('scan.returnButton')}
        </button>
      )}

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

export function ScanOut({ foreman, project, autoSubmit = false, manual = false }) {
  return <ScanPage mode="out" foreman={foreman} project={project} autoSubmit={autoSubmit} manual={manual} />;
}

export function ScanIn({ foreman, autoSubmit = false }) {
  return <ScanPage mode="in" foreman={foreman} returnUsed={false} autoSubmit={autoSubmit} />;
}

export function ScanUsed({ foreman, autoSubmit = false, manual = false }) {
  return <ScanPage mode="in" foreman={foreman} returnUsed={true} autoSubmit={autoSubmit} manual={manual} />;
}

export function ScanCheck() {
  const { t } = useTranslation();
  const inputRef = useRef(null);
  const [value, setValue] = useState(MANUAL_PREFIX);
  const [loading, setLoading] = useState(false);
  const [unitInfo, setUnitInfo] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    inputRef.current?.focus();
    if (inputRef.current) {
      const len = inputRef.current.value.length;
      inputRef.current.setSelectionRange(len, len);
    }
  }, [unitInfo, errorMsg]);

  const handleSearch = async (targetId) => {
    const unitId = String(targetId || '').replace(/[\r\n]+/g, '').trim();
    if (!unitId || unitId === MANUAL_PREFIX || loading) return;

    setLoading(true);
    setErrorMsg(null);
    setUnitInfo(null);

    try {
      const res = await api.getUnit(unitId);
      setUnitInfo(res);
    } catch (err) {
      if (err.status === 404) {
        setErrorMsg(`${t('scan.notFound')} ${unitId}`);
      } else {
        setErrorMsg(err.message || t('messages.failedToLoad'));
      }
    } finally {
      setLoading(false);
      setValue(MANUAL_PREFIX);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch(value);
    }
  };

  const handleChange = (e) => {
    const nextValue = e.target.value;
    setValue(nextValue.startsWith(MANUAL_PREFIX) ? nextValue : MANUAL_PREFIX);
  };

  return (
    <div className="scan-container">
      <h1>🔍 {t('scan.titleCheck')}</h1>
      <p className="text-muted scan-instruction">
        {t('scan.checkInstruction')}
      </p>

      <div className="scan-check-input-row">
        <input
          ref={inputRef}
          className="large"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="HP-2026-000001"
          disabled={loading}
          autoComplete="off"
          spellCheck={false}
        />
        <button
          type="button"
          className="btn btn-primary scan-manual-return-btn"
          disabled={loading || value.trim() === MANUAL_PREFIX}
          onClick={() => handleSearch(value)}
        >
          🔍 {t('scan.checkButton')}
        </button>
      </div>

      {loading && <p className="text-muted scan-processing">{t('scan.processing')}</p>}

      {errorMsg && (
        <div className="scan-history-item error" style={{ marginTop: '1rem' }}>
          <span className="scan-history-message">{errorMsg}</span>
        </div>
      )}

      {unitInfo && (
        <div className="card unit-status-card">
          <div className="unit-status-header">
            <h3 style={{ margin: 0 }}>{unitInfo.id}</h3>
            <span className={`status-badge status-${unitInfo.status.toLowerCase()}`}>
              {unitInfo.status === 'IN'
                ? `🟢 ${t('dashboard.inStock')} (IN)`
                : unitInfo.status === 'OUT'
                  ? `🟡 ${t('dashboard.checkedOut')} (OUT)`
                  : `⚪ ${t('dashboard.used')} (USED)`}
            </span>
          </div>

          <div className="unit-status-body">
            <div><strong>{t('units.product')}:</strong> {unitInfo.product?.name || '—'}</div>
            {unitInfo.batch?.delivery_date && (
              <div><strong>{t('inbound.deliveryDate')}:</strong> {new Date(unitInfo.batch.delivery_date).toLocaleDateString()}</div>
            )}

            {unitInfo.status === 'OUT' && unitInfo.open_ticket && (
              <div className="unit-status-location-box">
                <div><strong>{t('foremen.activeForeman')}:</strong> {unitInfo.open_ticket.foreman?.icon || '👷'} {unitInfo.open_ticket.foreman?.name || '—'}</div>
                <div><strong>{t('projects.activeProject')}:</strong> 📁 {unitInfo.open_ticket.project?.name || '—'}</div>
              </div>
            )}

            {unitInfo.status === 'IN' && (
              <div className="unit-status-info-text text-success">
                ✓ {t('scan.statusInMagazineDesc')}
              </div>
            )}

            {unitInfo.status === 'USED' && (
              <div className="unit-status-info-text text-muted">
                ✓ {t('scan.statusUsedDesc')}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
