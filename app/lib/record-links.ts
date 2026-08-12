export type RecordSource = "journal" | "watchlist" | "paperTrade";

export const recordIdQueryKey: Record<RecordSource, string> = {
  journal: "journalId",
  watchlist: "watchlistId",
  paperTrade: "paperTradeId",
};

const recordDestination: Record<RecordSource, { pathname: string; hash: string }> = {
  journal: { pathname: "/", hash: "journal-list" },
  watchlist: { pathname: "/watchlist", hash: "watchlist-list" },
  paperTrade: { pathname: "/paper-trade", hash: "paper-trade-list" },
};

export const parseRecordId = (value: string | null): number | null => {
  if (value === null || !/^\d+$/.test(value)) return null;

  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
};

export const getRecordHref = (source: RecordSource, recordId: number) => {
  const destination = recordDestination[source];
  const query = new URLSearchParams({
    [recordIdQueryKey[source]]: String(recordId),
  });
  return `${destination.pathname}?${query.toString()}#${destination.hash}`;
};
