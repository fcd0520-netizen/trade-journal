export const parseMoney = (value: unknown): number | null => {
  if (typeof value !== "string" && typeof value !== "number") return null;

  const normalized = String(value).trim().replaceAll(",", "");
  if (normalized === "") return null;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const formatNumber = (value: number) =>
  new Intl.NumberFormat("ja-JP", { maximumFractionDigits: 0 }).format(
    Math.abs(value)
  );

export const formatYen = (value: unknown): string | null => {
  const parsed = parseMoney(value);
  if (parsed === null) return null;

  return `${parsed < 0 ? "-" : ""}${formatNumber(parsed)}円`;
};

export const formatProfitYen = (value: unknown): string | null => {
  const parsed = parseMoney(value);
  if (parsed === null) return null;
  if (parsed === 0) return "0円";

  return `${parsed > 0 ? "+" : "-"}${formatNumber(parsed)}円`;
};

export const normalizeStoredMoney = (value: unknown): string => {
  if (typeof value !== "string" && typeof value !== "number") return "";
  return String(value);
};
