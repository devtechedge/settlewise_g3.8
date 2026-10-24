export interface CurrencyDefinition {
  code: string;
  name: string;
  symbol: string;
  decimals: number;
}

export const CURRENCY_REGISTRY: Record<string, CurrencyDefinition> = {
  USD: { code: 'USD', name: 'US Dollar', symbol: '$', decimals: 2 },
  EUR: { code: 'EUR', name: 'Euro', symbol: '€', decimals: 2 },
  GBP: { code: 'GBP', name: 'British Pound', symbol: '£', decimals: 2 },
  INR: { code: 'INR', name: 'Indian Rupee', symbol: '₹', decimals: 2 },
  JPY: { code: 'JPY', name: 'Japanese Yen', symbol: '¥', decimals: 0 },
};

export const SUPPORTED_CURRENCY_CODES = Object.keys(CURRENCY_REGISTRY);

export function getCurrency(code: string): CurrencyDefinition {
  const upper = code.trim().toUpperCase();
  const def = CURRENCY_REGISTRY[upper];
  if (!def) {
    throw new Error(`Unsupported currency code: "${code}". Supported currencies are: ${SUPPORTED_CURRENCY_CODES.join(', ')}`);
  }
  return def;
}
