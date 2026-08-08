import { useState } from 'react';
import {
  calculateTax,
  validateInput,
  formatCurrency,
  formatPercent,
  STANDARD_DEDUCTIONS,
} from './taxCalculator';
import './App.css';

const FILING_OPTIONS = [
  { value: 'single',             label: 'Single' },
  { value: 'married_jointly',    label: 'Married Filing Jointly' },
  { value: 'married_separately', label: 'Married Filing Separately' },
  { value: 'head_of_household',  label: 'Head of Household' },
];

function App() {
  const [income, setIncome]             = useState('');
  const [filingStatus, setFilingStatus] = useState('single');
  const [deductions, setDeductions]     = useState('');
  const [result, setResult]             = useState(null);
  const [errors, setErrors]             = useState([]);
  const [activeTab, setActiveTab]       = useState('breakdown');
  const [animating, setAnimating]       = useState(false);

  const handleCalculate = () => {
    const validation = validateInput({ income, filingStatus, deductions });
    if (!validation.valid) {
      setErrors(validation.errors);
      setResult(null);
      return;
    }
    setErrors([]);
    setAnimating(true);
    setTimeout(() => {
      setResult(calculateTax({ income, filingStatus, deductions }));
      setAnimating(false);
    }, 300);
  };

  const handleReset = () => {
    setIncome('');
    setFilingStatus('single');
    setDeductions('');
    setResult(null);
    setErrors([]);
  };

  const standardDed = STANDARD_DEDUCTIONS[filingStatus] || 0;

  return (
    <div className="app-wrapper">
      {/* ── Header ── */}
      <header className="app-header">
        <div className="header-inner">
          <div className="logo-group">
            <span className="logo-icon">⚖️</span>
            <div>
              <h1 className="app-title">TaxCalc Pro</h1>
              <p className="app-subtitle">US Federal Income Tax Calculator · Tax Year 2024</p>
            </div>
          </div>
          <div className="header-badge">IRS 2024</div>
        </div>
      </header>

      <main className="main-grid">
        {/* ── Left Panel: Input Form ── */}
        <section className="card input-card" aria-label="Tax Input Form">
          <div className="card-header">
            <span className="card-icon">📋</span>
            <h2>Your Tax Information</h2>
          </div>

          <div className="form-group">
            <label htmlFor="income-input">Annual Gross Income</label>
            <div className="input-wrapper">
              <span className="input-prefix">$</span>
              <input
                id="income-input"
                type="number"
                min="0"
                placeholder="e.g. 85000"
                value={income}
                onChange={e => setIncome(e.target.value)}
                className="form-input"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="filing-status">Filing Status</label>
            <select
              id="filing-status"
              value={filingStatus}
              onChange={e => setFilingStatus(e.target.value)}
              className="form-input form-select"
            >
              {FILING_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="deductions-input">
              Itemized Deductions
              <span className="label-hint">(Optional — Standard: {formatCurrency(standardDed)})</span>
            </label>
            <div className="input-wrapper">
              <span className="input-prefix">$</span>
              <input
                id="deductions-input"
                type="number"
                min="0"
                placeholder={`Standard: ${standardDed}`}
                value={deductions}
                onChange={e => setDeductions(e.target.value)}
                className="form-input"
              />
            </div>
            <p className="field-hint">
              Leave blank to use the standard deduction of {formatCurrency(standardDed)}.
            </p>
          </div>

          {errors.length > 0 && (
            <div className="error-box" role="alert">
              {errors.map((e, i) => <p key={i}>⚠ {e}</p>)}
            </div>
          )}

          <div className="btn-row">
            <button id="calculate-btn" className="btn btn-primary" onClick={handleCalculate}>
              Calculate Tax
            </button>
            <button id="reset-btn" className="btn btn-secondary" onClick={handleReset}>
              Reset
            </button>
          </div>
        </section>

        {/* ── Right Panel: Results ── */}
        <section className={`card results-card ${animating ? 'fade-out' : 'fade-in'}`} aria-label="Tax Results">
          {!result ? (
            <div className="empty-state">
              <div className="empty-icon">🧮</div>
              <h3>No Results Yet</h3>
              <p>Enter your income and filing status, then click <strong>Calculate Tax</strong> to see your full tax breakdown.</p>
            </div>
          ) : (
            <>
              {/* Summary KPIs */}
              <div className="kpi-grid">
                <div className="kpi-card kpi-primary">
                  <p className="kpi-label">Total Tax Liability</p>
                  <p className="kpi-value">{formatCurrency(result.totalTaxLiability)}</p>
                </div>
                <div className="kpi-card">
                  <p className="kpi-label">Effective Rate</p>
                  <p className="kpi-value">{result.effectiveRate}%</p>
                </div>
                <div className="kpi-card">
                  <p className="kpi-label">Taxable Income</p>
                  <p className="kpi-value">{formatCurrency(result.taxableIncome)}</p>
                </div>
                <div className="kpi-card kpi-green">
                  <p className="kpi-label">After-Tax Income</p>
                  <p className="kpi-value">{formatCurrency(result.afterTaxIncome)}</p>
                </div>
              </div>

              {/* Tax Bar */}
              <div className="tax-bar-wrap">
                <div className="tax-bar-labels">
                  <span>Federal Tax</span>
                  <span>FICA</span>
                  <span>Take-Home</span>
                </div>
                <div className="tax-bar">
                  {result.grossIncome > 0 && (
                    <>
                      <div
                        className="bar-segment bar-federal"
                        style={{ width: `${(result.federalTax / result.grossIncome) * 100}%` }}
                        title={`Federal: ${formatCurrency(result.federalTax)}`}
                      />
                      <div
                        className="bar-segment bar-fica"
                        style={{ width: `${(result.fica.total / result.grossIncome) * 100}%` }}
                        title={`FICA: ${formatCurrency(result.fica.total)}`}
                      />
                      <div
                        className="bar-segment bar-takehome"
                        style={{ width: `${(result.afterTaxIncome / result.grossIncome) * 100}%` }}
                        title={`Take-home: ${formatCurrency(result.afterTaxIncome)}`}
                      />
                    </>
                  )}
                </div>
              </div>

              {/* Tabs */}
              <div className="tabs">
                {['breakdown', 'fica', 'summary'].map(tab => (
                  <button
                    key={tab}
                    id={`tab-${tab}`}
                    className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab === 'breakdown' ? '📊 Brackets' : tab === 'fica' ? '🏥 FICA' : '📄 Summary'}
                  </button>
                ))}
              </div>

              {/* Tab: Bracket Breakdown */}
              {activeTab === 'breakdown' && (
                <div className="tab-content">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Rate</th>
                        <th>Income Range</th>
                        <th>Taxable</th>
                        <th>Tax Owed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.breakdown.map((b, i) => (
                        <tr key={i}>
                          <td><span className="rate-badge">{formatPercent(b.rate)}</span></td>
                          <td className="mono">{formatCurrency(b.min)} – {b.max === '∞' ? '∞' : formatCurrency(b.max)}</td>
                          <td className="mono">{formatCurrency(b.taxableAmount)}</td>
                          <td className="mono tax-col">{formatCurrency(b.taxAmount)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="total-row">
                        <td colSpan={3}>Total Federal Tax</td>
                        <td className="mono">{formatCurrency(result.federalTax)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              {/* Tab: FICA */}
              {activeTab === 'fica' && (
                <div className="tab-content fica-grid">
                  <div className="fica-item">
                    <p className="fica-label">Social Security (6.2%)</p>
                    <p className="fica-value">{formatCurrency(result.fica.socialSecurity)}</p>
                    <p className="fica-note">Wage base cap: $168,600</p>
                  </div>
                  <div className="fica-item">
                    <p className="fica-label">Medicare (1.45%)</p>
                    <p className="fica-value">{formatCurrency(result.fica.medicare)}</p>
                    <p className="fica-note">+0.9% above $200,000</p>
                  </div>
                  <div className="fica-item fica-total">
                    <p className="fica-label">Total FICA</p>
                    <p className="fica-value">{formatCurrency(result.fica.total)}</p>
                  </div>
                </div>
              )}

              {/* Tab: Summary */}
              {activeTab === 'summary' && (
                <div className="tab-content summary-list">
                  {[
                    ['Gross Income',         formatCurrency(result.grossIncome)],
                    ['Deduction Used',       formatCurrency(result.deductionUsed)],
                    ['Taxable Income',       formatCurrency(result.taxableIncome)],
                    ['Federal Income Tax',   formatCurrency(result.federalTax)],
                    ['Social Security Tax',  formatCurrency(result.fica.socialSecurity)],
                    ['Medicare Tax',         formatCurrency(result.fica.medicare)],
                    ['Total Tax Liability',  formatCurrency(result.totalTaxLiability)],
                    ['Effective Tax Rate',   `${result.effectiveRate}%`],
                    ['After-Tax Income',     formatCurrency(result.afterTaxIncome)],
                  ].map(([label, value]) => (
                    <div className="summary-row" key={label}>
                      <span>{label}</span>
                      <strong>{value}</strong>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </section>
      </main>

      <footer className="app-footer">
        <p>
          TaxCalc Pro · Built with React + Vite · 
          <span>Disclaimer: For educational purposes only. Consult a certified tax professional.</span>
        </p>
      </footer>
    </div>
  );
}

export default App;
