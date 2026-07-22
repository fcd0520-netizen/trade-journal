export type PaperTrade = {
  id: number;
  ticker: string;
  companyName: string;
  side: "買い" | "売り";
  shareCount: string;
  acquisitionPrice: string;
  reason: string;
  emotion: string;
  result: string;
  memo: string;
};
