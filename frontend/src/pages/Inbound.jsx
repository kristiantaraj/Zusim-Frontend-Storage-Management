import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api';
import { generateBatchZpl, printWithBrowserPrint } from '../printing';
import Feedback from '../components/Feedback';

export default function Inbound() {
  const { t } = useTranslation();
  const readStoredNumber = (key, fallback) => {
    const raw = window.localStorage.getItem(key);
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({
    product_id: '',
    delivery_date: new Date().toISOString().split('T')[0],
  });
  const [labelWidthMm, setLabelWidthMm] = useState(() => readStoredNumber('labelWidthMm', 100));
  const [labelHeightMm, setLabelHeightMm] = useState(() => readStoredNumber('labelHeightMm', 150));
  const [quantity, setQuantity] = useState(10);
  const [generatedUnits, setGeneratedUnits] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [printing, setPrinting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [step, setStep] = useState(1); // 1: select product, 2: generate, 3: print

  useEffect(() => {
    api.getProducts().then(setProducts).catch(() => {});
  }, []);

  useEffect(() => {
    window.localStorage.setItem('labelWidthMm', String(labelWidthMm));
  }, [labelWidthMm]);

  useEffect(() => {
    window.localStorage.setItem('labelHeightMm', String(labelHeightMm));
  }, [labelHeightMm]);

  // Step 1: select product and generate batch
  const handleSelectProduct = async (e) => {
    e.preventDefault();
    if (generating) return;
    setFeedback(null);
    if (!form.product_id) return;
    setGenerating(true);

    try {
      // Create a batch automatically for demo
      const batch = await api.createBatch({
        product_id: parseInt(form.product_id, 10),
        delivery_date: form.delivery_date,
        notes: 'Demo batch',
      });

      // Generate units
      const result = await api.generateUnits({
        batch_id: batch.id,
        quantity,
      });

      setGeneratedUnits(result.units);
      setStep(2);
      setFeedback({ type: 'success', message: `${result.count} ${t('inbound.unitsGenerated')}` });
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setGenerating(false);
    }
  };

  // Step 2: print labels
  const handlePrint = async () => {
    setPrinting(true);
    setFeedback(null);
    const selectedProduct = products.find((p) => p.id === parseInt(form.product_id, 10));
    const zpl = generateBatchZpl(
      generatedUnits.map((u) => ({
        unitId: u.id,
        productName: selectedProduct?.name ?? '',
        batchDate: form.delivery_date,
      })),
      {
        labelWidthMm,
        labelHeightMm,
      }
    );
    try {
      await printWithBrowserPrint(zpl);
      setPrinting(false);
      setFeedback({ type: 'success', message: `${generatedUnits.length} ${t('inbound.labelsSent')}` });
    } catch (err) {
      setPrinting(false);
      setFeedback({ type: 'error', message: `${t('inbound.printError')} ${err.message}` });
    }
  };

  const handleReset = () => {
    setStep(1);
    setGeneratedUnits([]);
    setFeedback(null);
    setPrinting(false);
  };

  return (
    <div>
      <div className="section-header">
        <h1>{t('inbound.title')}</h1>
        {step > 1 && (
          <button className="btn btn-ghost" onClick={handleReset}>
            {t('inbound.startOver')}
          </button>
        )}
      </div>

      {feedback && <Feedback message={feedback.message} type={feedback.type} />}

      {/* Step 1: Select Product */}
      {step === 1 && (
        <div className="card">
          <h2>{t('inbound.step1')}</h2>
          <form onSubmit={handleSelectProduct}>
            <div className="form-group">
              <label>{t('inbound.selectProduct')} *</label>
              <select
                value={form.product_id}
                onChange={(e) => setForm({ ...form, product_id: e.target.value })}
                disabled={generating}
                required
              >
                <option value="">{t('inbound.selectProduct')}…</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.size ? `(${p.size})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>{t('inbound.numberOfUnits')} *</label>
              <input
                type="number"
                min="1"
                max="500"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 1)}
                disabled={generating}
                required
                style={{ maxWidth: 160 }}
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={!form.product_id || generating}>
              {generating ? t('inbound.generatingUnits') : t('inbound.generateUnits')}
            </button>
          </form>
        </div>
      )}

      {/* Step 2: Print Labels */}
      {step === 2 && (
        <div className="card">
          <h2>{t('inbound.step3')}</h2>
          <p className="text-muted" style={{ marginBottom: 16 }}>
            {t('inbound.reviewIds')}
          </p>

          <div className="card" style={{ marginBottom: 16 }}>
            <h3 style={{ marginTop: 0 }}>{t('inbound.labelSize')}</h3>
            <p className="text-muted" style={{ marginBottom: 12 }}>
              {t('inbound.labelSizeHelp')}
            </p>
            <div className="row" style={{ gap: 16, alignItems: 'end', flexWrap: 'wrap' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>{t('inbound.labelWidthMm')}</label>
                <input
                  type="number"
                  min="30"
                  max="200"
                  step="1"
                  value={labelWidthMm}
                  onChange={(e) => setLabelWidthMm(parseInt(e.target.value, 10) || 30)}
                  style={{ width: 140 }}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>{t('inbound.labelHeightMm')}</label>
                <input
                  type="number"
                  min="30"
                  max="300"
                  step="1"
                  value={labelHeightMm}
                  onChange={(e) => setLabelHeightMm(parseInt(e.target.value, 10) || 30)}
                  style={{ width: 140 }}
                />
              </div>
            </div>
          </div>

          <div style={{ maxHeight: 300, overflowY: 'auto', marginBottom: 16 }}>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Unit ID</th>
                  <th>{t('units.status')}</th>
                </tr>
              </thead>
              <tbody>
                {generatedUnits.map((u, i) => (
                  <tr key={u.id}>
                    <td className="text-muted">{i + 1}</td>
                    <td className="monospace">{u.id}</td>
                    <td>
                      <span className="badge badge-in">{u.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="row">
            <button
              className="btn btn-primary"
              onClick={handlePrint}
              disabled={printing}
            >
              {printing ? t('inbound.printing') : `🖨  ${t('inbound.printLabels').replace('{{count}}', generatedUnits.length)}`}
            </button>
            <button className="btn btn-ghost" onClick={handleReset}>
              {t('inbound.done')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
