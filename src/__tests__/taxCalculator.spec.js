/**
 * taxCalculator.spec.js
 * ─────────────────────────────────────────────────────
 * Jasmine-style unit tests for the Tax Calculator core logic.
 * Compatible with both Vitest (describe/it/expect) and Jasmine syntax.
 *
 * Run with:  npm run test
 */

import {
  validateInput,
  calculateTaxableIncome,
  calculateFederalTax,
  calculateFICATax,
  calculateTax,
  formatCurrency,
  formatPercent,
  STANDARD_DEDUCTIONS,
} from '../taxCalculator';

// ─── Suite 1: validateInput ────────────────────────────────────────────────────
describe('validateInput()', () => {
  it('should return valid=true for correct inputs', () => {
    const result = validateInput({ income: 75000, filingStatus: 'single', deductions: 0 });
    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  it('should return an error when income is missing', () => {
    const result = validateInput({ income: '', filingStatus: 'single' });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Income is required.');
  });

  it('should return an error when income is negative', () => {
    const result = validateInput({ income: -1000, filingStatus: 'single' });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Income cannot be negative.');
  });

  it('should return an error for a non-numeric income', () => {
    const result = validateInput({ income: 'abc', filingStatus: 'single' });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Income must be a valid number.');
  });

  it('should return an error for an invalid filing status', () => {
    const result = validateInput({ income: 50000, filingStatus: 'unknown_status' });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('A valid filing status is required.');
  });

  it('should return an error when deductions are negative', () => {
    const result = validateInput({ income: 50000, filingStatus: 'single', deductions: -500 });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Deductions cannot be negative.');
  });

  it('should return multiple errors when multiple fields are invalid', () => {
    const result = validateInput({ income: '', filingStatus: '' });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(1);
  });
});

// ─── Suite 2: calculateTaxableIncome ──────────────────────────────────────────
describe('calculateTaxableIncome()', () => {
  it('should subtract the standard deduction from gross income (single)', () => {
    const taxableIncome = calculateTaxableIncome(80000, 'single');
    expect(taxableIncome).toBe(80000 - STANDARD_DEDUCTIONS.single);
  });

  it('should use the larger of standard or itemized deductions', () => {
    // Itemized > Standard
    const taxableIncome = calculateTaxableIncome(100000, 'single', 20000);
    expect(taxableIncome).toBe(100000 - 20000);
  });

  it('should use standard deduction when itemized is lower', () => {
    const taxableIncome = calculateTaxableIncome(100000, 'single', 1000);
    expect(taxableIncome).toBe(100000 - STANDARD_DEDUCTIONS.single);
  });

  it('should never return a negative taxable income', () => {
    const taxableIncome = calculateTaxableIncome(5000, 'single');
    expect(taxableIncome).toBe(0);
  });

  it('should handle married_jointly deduction correctly', () => {
    const taxableIncome = calculateTaxableIncome(60000, 'married_jointly');
    expect(taxableIncome).toBe(60000 - STANDARD_DEDUCTIONS.married_jointly);
  });
});

// ─── Suite 3: calculateFederalTax ─────────────────────────────────────────────
describe('calculateFederalTax()', () => {
  it('should return 0 tax for zero income', () => {
    const { totalTax } = calculateFederalTax(0, 'single');
    expect(totalTax).toBe(0);
  });

  it('should apply only the 10% bracket for income ≤ $11,600 (single)', () => {
    const { totalTax, breakdown } = calculateFederalTax(10000, 'single');
    expect(breakdown.length).toBe(1);
    expect(breakdown[0].rate).toBe(0.10);
    expect(totalTax).toBeCloseTo(1000, 2);
  });

  it('should apply multiple brackets for higher income', () => {
    const { breakdown } = calculateFederalTax(50000, 'single');
    expect(breakdown.length).toBeGreaterThan(1);
  });

  it('should throw an error for an unknown filing status', () => {
    expect(() => calculateFederalTax(50000, 'invalid_status')).toThrow();
  });

  it('should produce correct total tax for $100,000 taxable income (single)', () => {
    const { totalTax } = calculateFederalTax(100000, 'single');
    // 10%(11600)=1160 + 12%(35550)=4266 + 22%(52850)=11627  → ~17053
    expect(totalTax).toBeCloseTo(17053, 0);
  });
});

// ─── Suite 4: calculateFICATax ────────────────────────────────────────────────
describe('calculateFICATax()', () => {
  it('should calculate Social Security at 6.2% up to wage base', () => {
    const { socialSecurity } = calculateFICATax(100000);
    expect(socialSecurity).toBeCloseTo(6200, 1);
  });

  it('should cap Social Security at the $168,600 wage base', () => {
    const { socialSecurity } = calculateFICATax(300000);
    expect(socialSecurity).toBeCloseTo(168600 * 0.062, 1);
  });

  it('should calculate Medicare at 1.45% for income below $200,000', () => {
    const { medicare } = calculateFICATax(100000);
    expect(medicare).toBeCloseTo(1450, 1);
  });

  it('should add 0.9% additional Medicare for income over $200,000', () => {
    const { medicare } = calculateFICATax(300000);
    const expected = 300000 * 0.0145 + 100000 * 0.009;
    expect(medicare).toBeCloseTo(expected, 1);
  });

  it('should return 0 for all components when income is 0', () => {
    const fica = calculateFICATax(0);
    expect(fica.socialSecurity).toBe(0);
    expect(fica.medicare).toBe(0);
    expect(fica.total).toBe(0);
  });
});

// ─── Suite 5: calculateTax (integration) ──────────────────────────────────────
describe('calculateTax() — integration', () => {
  it('should return a complete result object', () => {
    const result = calculateTax({ income: 80000, filingStatus: 'single' });
    expect(result).toHaveProperty('grossIncome');
    expect(result).toHaveProperty('taxableIncome');
    expect(result).toHaveProperty('federalTax');
    expect(result).toHaveProperty('fica');
    expect(result).toHaveProperty('totalTaxLiability');
    expect(result).toHaveProperty('effectiveRate');
    expect(result).toHaveProperty('afterTaxIncome');
    expect(result).toHaveProperty('breakdown');
  });

  it('should calculate correct gross income', () => {
    const result = calculateTax({ income: 75000, filingStatus: 'single' });
    expect(result.grossIncome).toBe(75000);
  });

  it('should ensure after-tax income + total tax = gross income (approx)', () => {
    const result = calculateTax({ income: 90000, filingStatus: 'single' });
    const sum = result.afterTaxIncome + result.totalTaxLiability;
    expect(sum).toBeCloseTo(result.grossIncome, 0);
  });

  it('should produce a non-negative effective rate', () => {
    const result = calculateTax({ income: 50000, filingStatus: 'married_jointly' });
    expect(result.effectiveRate).toBeGreaterThanOrEqual(0);
  });

  it('should return zero tax for income below standard deduction', () => {
    const result = calculateTax({ income: 10000, filingStatus: 'single' });
    expect(result.federalTax).toBe(0);
  });

  it('should accept string income values (form input)', () => {
    const result = calculateTax({ income: '85000', filingStatus: 'single' });
    expect(result.grossIncome).toBe(85000);
  });
});

// ─── Suite 6: Formatters ───────────────────────────────────────────────────────
describe('formatCurrency()', () => {
  it('should format a number as USD currency', () => {
    expect(formatCurrency(1234.5)).toBe('$1,234.50');
  });

  it('should format zero correctly', () => {
    expect(formatCurrency(0)).toBe('$0.00');
  });

  it('should format large numbers with commas', () => {
    expect(formatCurrency(1000000)).toBe('$1,000,000.00');
  });
});

describe('formatPercent()', () => {
  it('should format a decimal rate as a percentage string', () => {
    expect(formatPercent(0.22)).toBe('22.0%');
  });

  it('should format 0 as 0.0%', () => {
    expect(formatPercent(0)).toBe('0.0%');
  });
});
