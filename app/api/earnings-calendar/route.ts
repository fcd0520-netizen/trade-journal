import type {
  EarningsCalendarResponse,
  EarningsEvent,
  EarningsTimeOfDay,
} from "../../types/earnings";

const TICKER_PATTERN = /^[A-Z0-9.-]+$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const CACHE_SECONDS = 60 * 60 * 6;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function formatUtcDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addUtcMonths(date: Date, months: number) {
  const result = new Date(date);
  result.setUTCMonth(result.getUTCMonth() + months);
  return result;
}

function normalizeTimeOfDay(value: unknown): EarningsTimeOfDay {
  if (value === "bmo") return "pre-market";
  if (value === "amc") return "post-market";
  if (value === "dmh") return "during-market";
  return "unknown";
}

function nullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function parseEarningsEvents(value: unknown, ticker: string): EarningsEvent[] | null {
  if (!isRecord(value) || !Array.isArray(value.earningsCalendar)) return null;

  return value.earningsCalendar
    .map((entry): EarningsEvent | null => {
      if (!isRecord(entry)) return null;
      const symbol = typeof entry.symbol === "string" ? entry.symbol.trim().toUpperCase() : "";
      const reportDate = typeof entry.date === "string" ? entry.date.trim() : "";
      if (symbol !== ticker || !DATE_PATTERN.test(reportDate)) return null;

      return {
        symbol,
        reportDate,
        estimate: nullableNumber(entry.epsEstimate),
        timeOfDay: normalizeTimeOfDay(entry.hour),
      };
    })
    .filter((event): event is EarningsEvent => event !== null)
    .sort((left, right) => left.reportDate.localeCompare(right.reportDate));
}

function errorResponse(error: string, status: number) {
  return Response.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: Request) {
  const ticker = new URL(request.url).searchParams.get("ticker")?.trim().toUpperCase();

  if (!ticker) return errorResponse("ティッカーを指定してください。", 400);
  if (!TICKER_PATTERN.test(ticker)) {
    return errorResponse("ティッカーに使用できない文字が含まれています。", 400);
  }

  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return errorResponse("決算カレンダーの設定が完了していません。", 500);

  const from = new Date();
  const to = addUtcMonths(from, 6);
  const url = new URL("https://finnhub.io/api/v1/calendar/earnings");
  url.searchParams.set("from", formatUtcDate(from));
  url.searchParams.set("to", formatUtcDate(to));
  url.searchParams.set("symbol", ticker);
  url.searchParams.set("token", apiKey);

  let response: Response;
  try {
    response = await fetch(url, { next: { revalidate: CACHE_SECONDS } });
  } catch {
    return errorResponse("決算カレンダーに接続できませんでした。", 502);
  }

  if (response.status === 429) {
    return errorResponse("決算カレンダーの利用回数上限に達しました。しばらく待ってください。", 429);
  }
  if (!response.ok) return errorResponse("決算予定を取得できませんでした。", 502);

  let rawData: unknown;
  try {
    rawData = await response.json() as unknown;
  } catch {
    return errorResponse("決算カレンダーから不正な応答が返されました。", 502);
  }

  if (isRecord(rawData) && typeof rawData.error === "string") {
    return errorResponse("決算予定を取得できませんでした。", 502);
  }

  const events = parseEarningsEvents(rawData, ticker);
  if (!events) return errorResponse("決算カレンダーのデータ形式が不正です。", 502);

  const result: EarningsCalendarResponse = {
    ticker,
    horizon: "6month",
    events,
    updatedAt: new Date().toISOString(),
  };

  return Response.json(result, {
    headers: {
      "Cache-Control": `public, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=${CACHE_SECONDS}`,
    },
  });
}
