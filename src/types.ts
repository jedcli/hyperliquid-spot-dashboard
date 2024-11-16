export interface TokenHolder {
  address: string;
  balance: number;
  percent: number;
  rank: number;
}

export interface TokenData {
  token: string;
  token_id: string;
  slippage: number;
  mark_price: number;
  price_change_24h: number;
  holders_count: number;
  fdv: number;
  market_cap: number;
  holders: {
    concentration: {
      top1_share: number;
      top5_share: number;
      top20_share: number;
    };
    total_burned_percent: number;
    hip2: {
      percent: number;
    };
  };
  deploy_time: string;
}