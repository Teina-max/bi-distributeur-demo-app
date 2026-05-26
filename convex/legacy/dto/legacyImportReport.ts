export type LegacyImportInput = {
  inserted: number;
  updated?: number;
  deleted?: number;
  errors?: number;
  // Defensive counter: rows that were dropped by the mutation because they
  // were detected as comment-like / non-business (e.g. legacy_document_lines
  // with empty product code and zero amounts).
  filtered?: number;
};

export const toLegacyImportReportDto = (input: LegacyImportInput) => ({
  inserted: input.inserted,
  updated: input.updated ?? 0,
  deleted: input.deleted ?? 0,
  errors: input.errors ?? 0,
  filtered: input.filtered ?? 0,
});

export type LegacyImportReportDto = ReturnType<typeof toLegacyImportReportDto>;
