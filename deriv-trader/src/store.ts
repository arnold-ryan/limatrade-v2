import { create } from 'zustand';
import { DerivAccount } from './services/auth';
import { WSMessage } from './services/websocket';

export interface TickData {
  symbol: string;
  quote: number;
  epoch: number;
  prevQuote?: number;
}

export interface OpenContract {
  contract_id: number;
  contract_type: string;
  symbol: string;
  buy_price: number;
  profit: number;
  profit_percentage: number;
  date_expiry: number;
  is_sold: number;
  payout: number;
}

export interface StatementItem {
  transaction_id: number;
  action_type: string;
  amount: number;
  balance_after: number;
  contract_id?: number;
  symbol?: string;
  shortcode?: string;
  purchase_time?: number;
  sell_time?: number;
}

interface AppState {
  // Auth
  accounts: DerivAccount[];
  activeAccount: DerivAccount | null;
  isLoggedIn: boolean;
  isAuthorizing: boolean;
  authError: string | null;
  setAccounts: (accounts: DerivAccount[]) => void;
  setActiveAccount: (account: DerivAccount) => void;
  setAuthorizing: (v: boolean) => void;
  setAuthError: (err: string | null) => void;
  logout: () => void;

  // Connection
  wsConnected: boolean;
  setWsConnected: (v: boolean) => void;

  // Balance
  balance: number | null;
  currency: string;
  setBalance: (balance: number, currency: string) => void;

  // Ticks
  ticks: Map<string, TickData>;
  updateTick: (symbol: string, data: WSMessage) => void;

  // Symbols
  symbols: Array<{ symbol: string; display_name: string; market: string; is_open: boolean }>;
  setSymbols: (symbols: AppState['symbols']) => void;
  activeSymbol: string;
  setActiveSymbol: (symbol: string) => void;

  // Open contracts
  openContracts: OpenContract[];
  setOpenContracts: (contracts: OpenContract[]) => void;
  removeContract: (id: number) => void;

  // Statement / history
  statement: StatementItem[];
  setStatement: (items: StatementItem[]) => void;

  // Trade form
  tradeAmount: string;
  setTradeAmount: (v: string) => void;
  tradeDuration: number;
  setTradeDuration: (v: number) => void;
  tradeDurationUnit: string;
  setTradeDurationUnit: (v: string) => void;
  proposal: WSMessage | null;
  setProposal: (p: WSMessage | null) => void;
  isBuying: boolean;
  setIsBuying: (v: boolean) => void;
  lastTrade: { type: string; result: string; profit: number } | null;
  setLastTrade: (t: AppState['lastTrade']) => void;
}

export const useStore = create<AppState>((set) => ({
  // Auth
  accounts: [],
  activeAccount: null,
  isLoggedIn: false,
  isAuthorizing: false,
  authError: null,
  setAccounts: (accounts) => set({ accounts }),
  setActiveAccount: (account) => set({ activeAccount: account, isLoggedIn: true }),
  setAuthorizing: (v) => set({ isAuthorizing: v }),
  setAuthError: (err) => set({ authError: err }),
  logout: () => set({ accounts: [], activeAccount: null, isLoggedIn: false, balance: null, openContracts: [], statement: [] }),

  // Connection
  wsConnected: false,
  setWsConnected: (v) => set({ wsConnected: v }),

  // Balance
  balance: null,
  currency: 'USD',
  setBalance: (balance, currency) => set({ balance, currency }),

  // Ticks
  ticks: new Map(),
  updateTick: (symbol, data) =>
    set((state) => {
      const tickData = data.tick as { quote: number; epoch: number } | undefined;
      if (!tickData) return {};
      const prev = state.ticks.get(symbol);
      const newTick: TickData = {
        symbol,
        quote: tickData.quote,
        epoch: tickData.epoch,
        prevQuote: prev?.quote,
      };
      const newTicks = new Map(state.ticks);
      newTicks.set(symbol, newTick);
      return { ticks: newTicks };
    }),

  // Symbols
  symbols: [],
  setSymbols: (symbols) => set({ symbols }),
  activeSymbol: 'R_100',
  setActiveSymbol: (symbol) => set({ activeSymbol: symbol, proposal: null }),

  // Open contracts
  openContracts: [],
  setOpenContracts: (contracts) => set({ openContracts: contracts }),
  removeContract: (id) =>
    set((state) => ({ openContracts: state.openContracts.filter(c => c.contract_id !== id) })),

  // Statement
  statement: [],
  setStatement: (items) => set({ statement: items }),

  // Trade form
  tradeAmount: '10',
  setTradeAmount: (v) => set({ tradeAmount: v }),
  tradeDuration: 5,
  setTradeDuration: (v) => set({ tradeDuration: v }),
  tradeDurationUnit: 't',
  setTradeDurationUnit: (v) => set({ tradeDurationUnit: v }),
  proposal: null,
  setProposal: (p) => set({ proposal: p }),
  isBuying: false,
  setIsBuying: (v) => set({ isBuying: v }),
  lastTrade: null,
  setLastTrade: (t) => set({ lastTrade: t }),
}));
