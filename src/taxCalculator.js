/**
 * taxCalculator.js
 * Core business logic for the Tax Calculator application.
 * All functions are pure (no side effects) to enable easy unit testing with Jasmine.
 */

// ─── Tax Brackets (US Federal 2024) ─────────────────────────────────────────
export const TAX_BRACKETS = {
  single: [
    { min: 0,       max: 11600,   rate: 0.10 },
    { min: 11600,   max: 47150,   rate: 0.12 },
    { min: 47150,   max: 100525,  rate: 0.22 },
    { min: 100525,  max: 191950,  rate: 0.24 },
    { min: 191950,  max: 243725,  rate: 0.32 },
    { min: 243725,  max: 609350,  rate: 0.35 },
    { min: 609350,  max: Infinity, rate: 0.37 },
  ],
  married_jointly: [
    { min: 0,       max: 23200,   rate: 0.10 },
    { min: 23200,   max: 94300,   rate: 0.12 },
    { min: 94300,   max: 201050,  rate: 0.22 },
    { min: 201050,  max: 383900,  rate: 0.24 },
    { min: 383900,  max: 487450,  rate: 0.32 },
    { min: 487450,  max: 731200,  rate: 0.35 },
    { min: 731200,  max: Infinity, rate: 0.37 },
  ],
  married_separately: [
    { min: 0,       max: 11600,   rate: 0.10 },
    { min: 11600,   max: 47150,   rate: 0.12 },
    { min: 47150,   max: 100525,  rate: 0.22 },
    { min: 100525,  max: 191950,  rate: 0.24 },
    { min: 191950,  max: 243725,  rate: 0.32 },
    { min: 243725,  max: 365600,  rate: 0.35 },
    { min: 365600,  max: Infinity, rate: 0.37 },
  ],
  head_of_household: [
    { min: 0,       max: 16550,   rate: 0.10 },
    { min: 16550,   max: 63100,   rate: 0.12 },
    { min: 63100,   max: 100500,  rate: 0.22 },
    { min: 100500,  max: 191950,  rate: 0.24 },
    { min: 191950,  max: 243700,  rate: 0.32 },
    { min: 243700,  max: 609350,  rate: 0.35 },
    { min: 609350,  max: Infinity, rate: 0.37 },
  ],
};

export const STANDARD_DEDUCTIONS = {
  single: 14600,
  married_jointly: 29200,
  married_separately: 14600,
  head_of_household: 21900,
};

// ─── Validation ──────────────────────────────────────────────────────────────

/**
 * Validates tax input fields.
 * @param {Object} input
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateInput({ income, filingStatus, deductions = 0 }) {
  const errors = [];

  if (income === undefined || income === null || income === '') {
    errors.push('Income is required.');
  } else if (isNaN(Number(income))) {
    errors.push('Income must be a valid number.');
  } else if (Number(income) < 0) {
    errors.push('Income cannot be negative.');
  }

  if (!filingStatus || !TAX_BRACKETS[filingStatus]) {
    errors.push('A valid filing status is required.');
  }

  if (deductions !== undefined && deductions !== '' && isNaN(Number(deductions))) {
    errors.push('Deductions must be a valid number.');
  } else if (Number(deductions) < 0) {
    errors.push('Deductions cannot be negative.');
  }

  return { valid: errors.length === 0, errors };
}

// ─── Core Calculation ─────────────────────────────────────────────────────────

/**
 * Calculates taxable income after applying standard or itemized deductions.
 * @param {number} grossIncome
 * @param {string} filingStatus
 * @param {number} itemizedDeductions
 * @returns {number}
 */
export function calculateTaxableIncome(grossIncome, filingStatus, itemizedDeductions = 0) {
  const standardDeduction = STANDARD_DEDUCTIONS[filingStatus] || 0;
  const deduction = Math.max(standardDeduction, itemizedDeductions);
  return Math.max(0, grossIncome - deduction);
}

/**
 * Calculates federal income tax using progressive brackets.
 * @param {number} taxableIncome
 * @param {string} filingStatus
 * @returns {{ totalTax: number, breakdown: Array }}
 */
export function calculateFederalTax(taxableIncome, filingStatus) {
  const brackets = TAX_BRACKETS[filingStatus];
  if (!brackets) throw new Error(`Unknown filing status: ${filingStatus}`);

  let totalTax = 0;
  const breakdown = [];

  for (const bracket of brackets) {
    if (taxableIncome <= bracket.min) break;
    const taxableInBracket = Math.min(taxableIncome, bracket.max) - bracket.min;
    const taxInBracket = taxableInBracket * bracket.rate;
    totalTax += taxInBracket;
    breakdown.push({
      rate: bracket.rate,
      min: bracket.min,
      max: bracket.max === Infinity ? '∞' : bracket.max,
      taxableAmount: taxableInBracket,
      taxAmount: taxInBracket,
    });
  }

  return { totalTax, breakdown };
}

/**
 * Calculates FICA taxes (Social Security + Medicare).
 * @param {number} grossIncome
 * @returns {{ socialSecurity: number, medicare: number, total: number }}
 */
export function calculateFICATax(grossIncome) {
  const SS_WAGE_BASE = 168600;
  const SS_RATE = 0.062;
  const MEDICARE_RATE = 0.0145;
  const ADDITIONAL_MEDICARE_RATE = 0.009;
  const ADDITIONAL_MEDICARE_THRESHOLD = 200000;

  const socialSecurity = Math.min(grossIncome, SS_WAGE_BASE) * SS_RATE;
  let medicare = grossIncome * MEDICARE_RATE;
  if (grossIncome > ADDITIONAL_MEDICARE_THRESHOLD) {
    medicare += (grossIncome - ADDITIONAL_MEDICARE_THRESHOLD) * ADDITIONAL_MEDICARE_RATE;
  }

  return {
    socialSecurity: parseFloat(socialSecurity.toFixed(2)),
    medicare: parseFloat(medicare.toFixed(2)),
    total: parseFloat((socialSecurity + medicare).toFixed(2)),
  };
}

/**
 * Main entry point: calculates all taxes and effective rates.
 * @param {Object} input - { income, filingStatus, deductions }
 * @returns {Object} Full tax result
 */
export function calculateTax({ income, filingStatus, deductions = 0 }) {
  const grossIncome = Number(income);
  const itemizedDeductions = Number(deductions) || 0;

  const taxableIncome = calculateTaxableIncome(grossIncome, filingStatus, itemizedDeductions);
  const { totalTax, breakdown } = calculateFederalTax(taxableIncome, filingStatus);
  const fica = calculateFICATax(grossIncome);

  const totalTaxLiability = parseFloat((totalTax + fica.total).toFixed(2));
  const effectiveRate = grossIncome > 0 ? parseFloat(((totalTax / grossIncome) * 100).toFixed(2)) : 0;
  const afterTaxIncome = parseFloat((grossIncome - totalTaxLiability).toFixed(2));

  return {
    grossIncome,
    taxableIncome: parseFloat(taxableIncome.toFixed(2)),
    federalTax: parseFloat(totalTax.toFixed(2)),
    fica,
    totalTaxLiability,
    effectiveRate,
    afterTaxIncome,
    breakdown,
    filingStatus,
    deductionUsed: Math.max(STANDARD_DEDUCTIONS[filingStatus], itemizedDeductions),
  };
}

// ─── Formatters ───────────────────────────────────────────────────────────────

export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatPercent(rate) {
  return `${(rate * 100).toFixed(1)}%`;
}
