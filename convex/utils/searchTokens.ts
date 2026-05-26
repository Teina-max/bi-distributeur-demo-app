const normalize = (input: string): string =>
  input.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

const splitTokens = (input: string): string[] =>
  normalize(input)
    .split(/\s+/)
    .filter((token) => token.length > 0);

export const buildSearchTokens = (...sources: string[]): string[] => {
  const tokens = new Set<string>();
  for (const source of sources) {
    for (const token of splitTokens(source)) {
      tokens.add(token);
    }
  }
  return Array.from(tokens);
};

export const matchesTokens = (
  docTokens: readonly string[],
  query: string,
): boolean => {
  const queryTokens = splitTokens(query);
  if (queryTokens.length === 0) return false;
  const normalizedDoc = docTokens.flatMap((token) => splitTokens(token));
  return queryTokens.every((q) =>
    normalizedDoc.some((doc) => doc.startsWith(q)),
  );
};
