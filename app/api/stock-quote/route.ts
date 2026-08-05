import type { StockQuote } from "../../types/watchlist";

type FinnhubQuote = {
  c: number;
  d: number;
  dp: number;
  h: number;
  l: number;
  o: number;
  pc: number;
  t: number;
};

const TICKER_PATTERN = /^[A-Z0-9.-]+$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isFinnhubQuote(value: unknown): value is FinnhubQuote {
  return (
    isRecord(value) &&
    isFiniteNumber(value.c) &&
    isFiniteNumber(value.d) &&
    isFiniteNumber(value.dp) &&
    isFiniteNumber(value.h) &&
    isFiniteNumber(value.l) &&
    isFiniteNumber(value.o) &&
    isFiniteNumber(value.pc) &&
    isFiniteNumber(value.t)
  );
}

function errorResponse(error: string, status: number) {
  return Response.json({ error }, { status });
}

export async function GET(request: Request) {
  const ticker = new URL(request.url).searchParams.get("ticker")?.trim().toUpperCase();

  if (!ticker) return errorResponse("ティッカーを指定してください。", 400);
  if (!TICKER_PATTERN.test(ticker)) {
    return errorResponse("ティッカーに使用できない文字が含まれています。", 400);
  }

  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) {
    return errorResponse("株価サービスの設定が完了していません。", 500);
  }

  const url = new URL("https://finnhub.io/api/v1/quote");
  url.searchParams.set("symbol", ticker);
  url.searchParams.set("token", apiKey);

  let response: Response;
  try {
    response = await fetch(url, { cache: "no-store" });
  } catch {
    return errorResponse("株価サービスに接続できませんでした。", 502);
  }

  if (response.status === 429) {
    return errorResponse("株価サービスの利用回数上限に達しました。しばらく待って再試行してください。", 429);
  }
  if (!response.ok) {
    return errorResponse("株価サービスからデータを取得できませんでした。", 502);
  }

  let data: unknown;
  try {
    data = await response.json() as unknown;
  } catch {
    return errorResponse("株価サービスから不正な応答が返されました。", 502);
  }

  if (!isFinnhubQuote(data)) {
    return errorResponse("取得した株価データの形式が不正です。", 502);
  }
  if (
    data.c <= 0 ||
    data.h < 0 ||
    data.l < 0 ||
    data.o < 0 ||
    data.pc < 0 ||
    data.t < 0
  ) {
    return errorResponse("有効な株価を取得できませんでした。ティッカーを確認してください。", 404);
  }

  const quote: StockQuote = {
    ticker,
    currentPrice: data.c,
    change: data.d,
    changePercent: data.dp,
    high: data.h,
    low: data.l,
    open: data.o,
    previousClose: data.pc,
    updatedAt: data.t,
  };

  return Response.json(quote, {
    headers: { "Cache-Control": "no-store" },
  });
}
