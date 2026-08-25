export const parseFormattedAmount = (str: string | number | undefined | null): number => {
  if (str === null || str === undefined) return 0;
  if (typeof str === 'number') return isNaN(str) ? 0 : Number(str.toFixed(2));
  
  const trimmed = str.trim();
  if (!trimmed) return 0;

  // Replace comma with dot for European/Spanish decimal input
  const normalized = trimmed.replace(',', '.').replace(/[^0-9.]/g, '');
  const val = parseFloat(normalized);
  return isNaN(val) ? 0 : Number(val.toFixed(2));
};
