export type EarningsTimeOfDay =
  | "pre-market"
  | "post-market"
  | "during-market"
  | "unknown";

export type EarningsEvent = {
  symbol: string;
  reportDate: string;
  estimate: number | null;
  timeOfDay: EarningsTimeOfDay;
};

export type EarningsCalendarResponse = {
  ticker: string;
  horizon: "6month";
  events: EarningsEvent[];
  updatedAt: string;
};
