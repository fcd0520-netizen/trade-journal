import type {
  StockHistoryPoint,
  StockHistoryRange,
  StockHistoryResponse,
} from "../../types/stock-history";

type AlphaVantageDailyPrice = {
  "1. open": string;
  "2. high": string;
  "3. low": string;
  "4. close": string;
  "5. volume": string;
};

type AlphaVantageDailyResponse = {
  "Time Series (Daily)"?: Record<string, AlphaVantageDailyPrice>;
  Note?: string;
  Information?: string;
  "Error Message"?: string;
};

const TICKER_PATTERN = /^[A-Z0-9.-]+$/;
const RANGE_COUNTS: Record<StockHistoryRange, number> = {
  "1M": 22,
  "3M": 66,
  "6M": 100,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isRange(value: string): value is StockHistoryRange {
  return value === "1M" || value === "3M" || value === "6M";
}

function isDailyPrice(value: unknown): value is AlphaVantageDailyPrice {
  if (!isRecord(value)) return false;
  return ["1. open", "2. high", "3. low", "4. close", "5. volume"].every(
    (key) => typeof value[key] === "string",
  );
}

function parseAlphaVantageResponse(value: unknown): AlphaVantageDailyResponse | null {
  if (!isRecord(value)) return null;

  const result: AlphaVantageDailyResponse = {};
  if (typeof value.Note === "string") result.Note = value.Note;
  if (typeof value.Information === "string") result.Information = value.Information;
  if (typeof value["Error Message"] === "string") result["Error Message"] = value["Error Message"];

  const series = value["Time Series (Daily)"];
  if (isRecord(series)) {
    const validEntries = Object.entries(series).filter(
      (entry): entry is [string, AlphaVantageDailyPrice] => isDailyPrice(entry[1]),
    );
    result["Time Series (Daily)"] = Object.fromEntries(validEntries);
  }
  return result;
}

function toPoints(series: Record<string, AlphaVantageDailyPrice>): StockHistoryPoint[] {
  return Object.entries(series)
    .map(([date, price]) => ({
      date,
      open: Number(price["1. open"]),
      high: Number(price["2. high"]),
      low: Number(price["3. low"]),
      close: Number(price["4. close"]),
      volume: Number(price["5. volume"]),
    }))
    .filter((point) =>
      /^\d{4}-\d{2}-\d{2}$/.test(point.date) &&
      [point.open, point.high, point.low, point.close, point.volume].every(Number.isFinite) &&
      point.open > 0 &&
      point.high >= Math.max(point.open, point.close) &&
      point.low > 0 &&
      point.low <= Math.min(point.open, point.close) &&
      point.volume >= 0,
    )
    .sort((left, right) => left.date.localeCompare(right.date));
}

function errorResponse(error: string, status: number) {
  return Response.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const ticker = params.get("ticker")?.trim().toUpperCase();
  const requestedRange = params.get("range")?.trim().toUpperCase() ?? "3M";

  if (!ticker) return errorResponse("ティッカーを指定してください。", 400);
  if (!TICKER_PATTERN.test(ticker)) {
    return errorResponse("ティッカーに使用できない文字が含まれています。", 400);
  }
  if (!isRange(requestedRange)) {
    return errorResponse("期間は1M、3M、6Mのいずれかを指定してください。", 400);
  }

  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) return errorResponse("チャートサービスの設定が完了していません。", 500);

  const url = new URL("https://www.alphavantage.co/query");
  url.searchParams.set("function", "TIME_SERIES_DAILY");
  url.searchParams.set("symbol", ticker);
  url.searchParams.set("outputsize", "compact");
  url.searchParams.set("apikey", apiKey);

  let response: Response;
  try {
    response = await fetch(url, { cache: "no-store" });
  } catch {
    return errorResponse("チャートサービスに接続できませんでした。", 502);
  }

  if (response.status === 429) {
    return errorResponse("チャートサービスの利用回数上限に達しました。しばらく待ってください。", 429);
  }
  if (!response.ok) return errorResponse("チャートデータを取得できませんでした。", 502);

  let rawData: unknown;
  try {
    rawData = await response.json() as unknown;
  } catch {
    return errorResponse("チャートサービスから不正な応答が返されました。", 502);
  }

  const data = parseAlphaVantageResponse(rawData);
  if (!data) return errorResponse("チャートデータの形式が不正です。", 502);
  if (data["Error Message"]) {
    return errorResponse("ティッカーが無効です。銘柄コードを確認してください。", 404);
  }
  if (data.Note || data.Information) {
    return errorResponse("チャートサービスの利用回数上限に達しました。しばらく待ってください。", 429);
  }

  const series = data["Time Series (Daily)"];
  if (!series) return errorResponse("この銘柄のチャートデータがありません。", 404);

  const points = toPoints(series).slice(-RANGE_COUNTS[requestedRange]);
  if (points.length === 0) return errorResponse("この銘柄のチャートデータがありません。", 404);

  const result: StockHistoryResponse = {
    ticker,
    range: requestedRange,
    points,
    updatedAt: new Date().toISOString(),
  };
  return Response.json(result, { headers: { "Cache-Control": "no-store" } });
}
