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

export const formatCurrency = (
  value: unknown,
  currency: "USD" | "JPY"
): string | null => {
  const parsed = parseMoney(value);
  if (parsed === null) return null;

  return new Intl.NumberFormat(currency === "USD" ? "en-US" : "ja-JP", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(parsed);
};

export const calculateInvestment = (
  shareCount: unknown,
  acquisitionPrice: unknown
): number | null => {
  const shares = parseMoney(shareCount);
  const price = parseMoney(acquisitionPrice);
  if (shares === null || price === null) return null;
  return shares * price;
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
