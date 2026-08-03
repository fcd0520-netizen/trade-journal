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
    minimumFractionDigits: currency === "JPY" ? 0 : 2,
    maximumFractionDigits: currency === "JPY" ? 0 : 2,
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

export const formatUsd = (value: unknown): string | null =>
  formatCurrency(value, "USD");

export const formatProfitUsd = (value: unknown): string | null => {
  const parsed = parseMoney(value);
  if (parsed === null) return null;

  const formatted = formatUsd(Math.abs(parsed));
  if (formatted === null) return null;
  return parsed > 0 ? `+${formatted}` : parsed < 0 ? `-${formatted}` : formatted;
};

export const formatProfitCurrency = (
  value: unknown,
  currency: "USD" | "JPY"
): string | null => {
  const parsed = parseMoney(value);
  if (parsed === null) return null;

  const rounded = currency === "JPY"
    ? Math.round(parsed)
    : Math.round((parsed + Number.EPSILON) * 100) / 100;
  const formatted = formatCurrency(Math.abs(rounded), currency);
  if (formatted === null) return null;
  return rounded > 0 ? `+${formatted}` : rounded < 0 ? `-${formatted}` : formatted;
};

export const normalizeStoredMoney = (value: unknown): string => {
  if (typeof value !== "string" && typeof value !== "number") return "";
  return String(value);
};
