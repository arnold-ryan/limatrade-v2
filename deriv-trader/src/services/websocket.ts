// Deriv WebSocket Service
// Connects to wss://ws.derivws.com/websockets/v3
// Handles reconnection, subscriptions, and request/response matching

export type WSMessage = Record<string, unknown>;

type Listener = (data: WSMessage) => void;

// WebSocket uses a numeric app_id for the connection (separate from OAuth client_id)
const WS_APP_ID = import.meta.env.VITE_WS_APP_ID || '16929';
const WS_URL = `wss://ws.derivws.com/websockets/v3?app_id=${WS_APP_ID}`;

let socket: WebSocket | null = null;
let reqId = 1;
const pending = new Map<number, { resolve: (d: WSMessage) => void; reject: (e: Error) => void }>();
const subscriptions = new Map<string, Set<Listener>>();
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let isConnecting = false;
const messageQueue: WSMessage[] = [];
const connectionListeners = new Set<(connected: boolean) => void>();

export function onConnectionChange(fn: (connected: boolean) => void) {
  connectionListeners.add(fn);
  return () => connectionListeners.delete(fn);
}

function notifyConnection(connected: boolean) {
  connectionListeners.forEach(fn => fn(connected));
}

function processQueue() {
  while (messageQueue.length > 0 && socket?.readyState === WebSocket.OPEN) {
    const msg = messageQueue.shift();
    if (msg) socket.send(JSON.stringify(msg));
  }
}

export function connect(): Promise<void> {
  if (socket?.readyState === WebSocket.OPEN) return Promise.resolve();
  if (isConnecting) return new Promise(res => setTimeout(res, 500));

  isConnecting = true;
  return new Promise((resolve, reject) => {
    socket = new WebSocket(WS_URL);

    socket.onopen = () => {
      isConnecting = false;
      notifyConnection(true);
      processQueue();
      resolve();
    };

    socket.onmessage = (event: MessageEvent) => {
      try {
        const data: WSMessage = JSON.parse(event.data as string);
        const id = data.req_id as number | undefined;

        // Resolve one-time request
        if (id && pending.has(id)) {
          const p = pending.get(id)!;
          pending.delete(id);
          if (data.error) {
            p.reject(new Error((data.error as { message: string }).message));
          } else {
            p.resolve(data);
          }
        }

        // Broadcast to subscription listeners
        const msgType = data.msg_type as string;
        if (msgType) {
          subscriptions.get(msgType)?.forEach(fn => fn(data));
          subscriptions.get('*')?.forEach(fn => fn(data));
        }
      } catch (e) {
        console.error('WS parse error', e);
      }
    };

    socket.onerror = (err) => {
      console.error('WebSocket error', err);
      isConnecting = false;
    };

    socket.onclose = () => {
      isConnecting = false;
      notifyConnection(false);
      scheduleReconnect();
      // Reject any pending promises
      pending.forEach(p => p.reject(new Error('WebSocket closed')));
      pending.clear();
    };

    // Timeout if can't connect
    setTimeout(() => {
      if (isConnecting) {
        isConnecting = false;
        reject(new Error('Connection timeout'));
      }
    }, 10000);
  });
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect().catch(() => {});
  }, 3000);
}

export function send(message: WSMessage): Promise<WSMessage> {
  return new Promise((resolve, reject) => {
    const id = reqId++;
    const payload = { ...message, req_id: id };
    pending.set(id, { resolve, reject });

    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(payload));
    } else {
      messageQueue.push(payload);
      connect().catch(reject);
    }
  });
}

export function subscribe(msgType: string, listener: Listener): () => void {
  if (!subscriptions.has(msgType)) subscriptions.set(msgType, new Set());
  subscriptions.get(msgType)!.add(listener);
  return () => subscriptions.get(msgType)?.delete(listener);
}

// Authorize with token (from OAuth callback)
export async function authorize(token: string) {
  return send({ authorize: token });
}

// Get account balance
export async function getBalance(subscribe_?: boolean) {
  return send({ balance: 1, account: 'current', subscribe: subscribe_ ? 1 : undefined });
}

// Subscribe to ticks for a symbol
export function subscribeTicks(symbol: string, onTick: Listener): () => void {
  let subId: string | null = null;

  send({ ticks: symbol, subscribe: 1 }).then(data => {
    subId = (data.subscription as { id: string })?.id ?? null;
  });

  const unsub = subscribe('tick', (data) => {
    const tick = data.tick as { symbol: string } | undefined;
    if (tick?.symbol === symbol) onTick(data);
  });

  return () => {
    unsub();
    if (subId) send({ forget: subId }).catch(() => {});
  };
}

// Get active symbols
export async function getActiveSymbols() {
  return send({ active_symbols: 'brief', product_type: 'basic' });
}

// Get proposal (price quote for a contract)
export async function getProposal(params: {
  symbol: string;
  contract_type: string;
  amount: number;
  currency: string;
  duration: number;
  duration_unit: string;
  basis: string;
}) {
  return send({
    proposal: 1,
    subscribe: 1,
    ...params,
  });
}

// Buy a contract
export async function buyContract(proposalId: string, price: number) {
  return send({ buy: proposalId, price });
}

// Sell a contract
export async function sellContract(contractId: number, price: number) {
  return send({ sell: contractId, price });
}

// Get open positions (portfolio)
export async function getPortfolio() {
  return send({ portfolio: 1 });
}

// Get trade history (statement)
export async function getStatement(limit = 25) {
  return send({ statement: 1, limit });
}

// Forget a subscription
export async function forget(id: string) {
  return send({ forget: id });
}

// Ping to keep connection alive
export function startPing() {
  return setInterval(() => {
    if (socket?.readyState === WebSocket.OPEN) {
      send({ ping: 1 }).catch(() => {});
    }
  }, 30000);
}
