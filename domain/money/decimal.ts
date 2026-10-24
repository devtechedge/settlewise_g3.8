import { getCurrency } from './currency.ts';

/**
 * Parses a decimal string (e.g. "12.50" or "42") into exact integer minor units (e.g. 1250n)
 * strictly without using floating-point Number math.
 */
export function parseExactToMinorUnits(amountStr: string, currencyCode: string): bigint {
  const currency = getCurrency(currencyCode);
  const trimmed = amountStr.trim();

  if (!trimmed) {
    throw new Error('Monetary amount cannot be empty.');
  }

  // Check format: optional negative sign, digits, optional decimal point and digits
  const isNegative = trimmed.startsWith('-');
  const unsigned = isNegative ? trimmed.slice(1) : trimmed;

  if (!/^\d+(\.\d+)?$/.test(unsigned)) {
    throw new Error(`Invalid monetary amount format: "${amountStr}". Expected decimal format (e.g. "12.50").`);
  }

  const parts = unsigned.split('.');
  const wholePart = parts[0];
  const fractionalPart = parts[1] || '';

  if (fractionalPart.length > currency.decimals) {
    throw new Error(
      `Amount "${amountStr}" has ${fractionalPart.length} decimal places, but ${currency.code} only allows ${currency.decimals}.`
    );
  }

  // Pad fractional part with trailing zeros up to currency decimals
  const paddedFraction = fractionalPart.padEnd(currency.decimals, '0');
  const combined = wholePart + paddedFraction;

  const minor = BigInt(combined);
  return isNegative ? -minor : minor;
}

/**
 * Formats a bigint minor units count into an exact canonical decimal string (e.g. 1250n -> "12.50").
 */
export function formatMinorUnitsToDecimal(minorUnits: bigint, currencyCode: string): string {
  const currency = getCurrency(currencyCode);
  const isNegative = minorUnits < 0n;
  const absMinor = isNegative ? -minorUnits : minorUnits;

  if (currency.decimals === 0) {
    return (isNegative ? '-' : '') + absMinor.toString();
  }

  const divisor = 10n ** BigInt(currency.decimals);
  const whole = absMinor / divisor;
  const fraction = absMinor % divisor;

  const paddedFraction = fraction.toString().padStart(currency.decimals, '0');
  return `${isNegative ? '-' : ''}${whole.toString()}.${paddedFraction}`;
}

/**
 * Formats a bigint minor units count into a human-readable string with currency symbol.
 * e.g. 1250n -> "$12.50", -500n -> "-$5.00", 0n -> "$0.00"
 */
export function formatMoney(
  minorUnits: bigint | string | number,
  currencyCode: string,
  options?: { showPlusSign?: boolean }
): string {
  const bi = typeof minorUnits === 'bigint' ? minorUnits : BigInt(minorUnits);
  const currency = getCurrency(currencyCode);
  const decimalStr = formatMinorUnitsToDecimal(bi, currencyCode);

  const isNeg = bi < 0n;
  const isPos = bi > 0n;
  const absDecimal = isNeg ? decimalStr.slice(1) : decimalStr;

  let prefix = '';
  if (isNeg) {
    prefix = '-';
  } else if (isPos && options?.showPlusSign) {
    prefix = '+';
  }

  return `${prefix}${currency.symbol}${absDecimal}`;
}
