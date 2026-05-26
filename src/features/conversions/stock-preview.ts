export type StockPreviewLine = {
  product_code: string;
  quantity: number;
  current_stock: number;
};

export type StockPreviewEntry = {
  product_code: string;
  delta: number;
  stockAfter: number;
  insufficient: boolean;
};

export function buildStockPreview(
  lines: readonly StockPreviewLine[],
): StockPreviewEntry[] {
  return lines.map((line) => {
    const stockAfter = line.current_stock - line.quantity;
    return {
      product_code: line.product_code,
      delta: -line.quantity,
      stockAfter,
      insufficient: stockAfter < 0,
    };
  });
}

export function formatStockPreviewLine(entry: StockPreviewEntry): string {
  const sign = entry.delta < 0 ? "" : "+";
  return `${entry.product_code} ${sign}${entry.delta} (stock après: ${entry.stockAfter})`;
}
