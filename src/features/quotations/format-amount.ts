const EUR = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatEUR(value: number): string {
  return EUR.format(value);
}

const QUANTITY = new Intl.NumberFormat("fr-FR", {
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});

export function formatQuantity(value: number): string {
  return QUANTITY.format(value);
}

const PERCENT = new Intl.NumberFormat("fr-FR", {
  maximumFractionDigits: 2,
  minimumFractionDigits: 1,
});

export function formatVatRate(value: number): string {
  return `${PERCENT.format(value)} %`;
}
