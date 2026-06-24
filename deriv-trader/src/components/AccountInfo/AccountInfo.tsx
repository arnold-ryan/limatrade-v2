import { useEffect, useState } from 'react';
import { useStore } from '../../store';
import { getPortfolio, getStatement, sellContract } from '../../services/websocket';
import styles from './AccountInfo.module.css';

interface Contract {
  contract_id: number;
  contract_type: string;
  underlying: string;
  buy_price: number;
  current_spot_time?: number;
  profit?: number;
  profit_percentage?: number;
  payout?: number;
  longcode?: string;
  date_expiry?: number;
}

interface StatementEntry {
  transaction_id: number;
  action_type: string;
  amount: number;
  balance_after: number;
  shortcode?: string;
  purchase_time?: number;
  sell_time?: number;
}

export default function AccountInfo() {
  const { activeAccount, currency, isLoggedIn } = useStore();
  const [tab, setTab] = useState<'positions' | 'history'>('positions');
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [statement, setStatement] = useState<StatementEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [sellingId, setSellingId] = useState<number | null>(null);

  const fetchPortfolio = async () => {
    try {
      setLoading(true);
      const resp = await getPortfolio();
      const portfolio = resp.portfolio as { contracts: Contract[] } | undefined;
      setContracts(portfolio?.contracts ?? []);
    } catch {
      setContracts([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatement = async () => {
    try {
      setLoading(true);
      const resp = await getStatement(30);
      const st = resp.statement as { transactions: StatementEntry[] } | undefined;
      setStatement(st?.transactions ?? []);
    } catch {
      setStatement([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoggedIn) return;
    if (tab === 'positions') {
      fetchPortfolio();
      const interval = setInterval(fetchPortfolio, 15000);
      return () => clearInterval(interval);
    } else {
      fetchStatement();
    }
  }, [tab, isLoggedIn]);

  const handleSell = async (contractId: number) => {
    if (sellingId) return;
    setSellingId(contractId);
    try {
      await sellContract(contractId, 0); // 0 = sell at market
      await fetchPortfolio();
    } catch (err) {
      console.error('Sell failed:', err);
    } finally {
      setSellingId(null);
    }
  };

  const formatTime = (epoch?: number) => {
    if (!epoch) return '—';
    return new Date(epoch * 1000).toLocaleString(undefined, {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <div className={styles.container}>
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${tab === 'positions' ? styles.activeTab : ''}`}
          onClick={() => setTab('positions')}
        >
          Open Positions
          {contracts.length > 0 && (
            <span className={styles.badge}>{contracts.length}</span>
          )}
        </button>
        <button
          className={`${styles.tab} ${tab === 'history' ? styles.activeTab : ''}`}
          onClick={() => setTab('history')}
        >
          Trade History
        </button>
      </div>

      <div className={styles.content}>
        {!isLoggedIn && (
          <div className={styles.empty}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.3">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            <p>Log in to view positions and history</p>
          </div>
        )}

        {isLoggedIn && loading && tab === 'positions' && contracts.length === 0 && (
          <div className={styles.loadingRow}>
            <div className="spinner" style={{ width: 16, height: 16 }} />
            <span className="text-muted text-sm">Loading…</span>
          </div>
        )}

        {/* Open Positions */}
        {isLoggedIn && tab === 'positions' && (
          <>
            {contracts.length === 0 && !loading ? (
              <div className={styles.empty}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.3">
                  <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17"/>
                  <circle cx="16" cy="19" r="1"/><circle cx="9" cy="19" r="1"/>
                </svg>
                <p>No open positions</p>
              </div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Type</th>
                    <th>Market</th>
                    <th>Stake</th>
                    <th>Payout</th>
                    <th>Expiry</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {contracts.map(c => (
                    <tr key={c.contract_id}>
                      <td className="text-mono text-sm">{c.contract_id}</td>
                      <td>
                        <span className={`badge ${c.contract_type.includes('CALL') ? 'badge-success' : 'badge-danger'}`}>
                          {c.contract_type === 'CALL' ? '↑ Rise' : c.contract_type === 'PUT' ? '↓ Fall' : c.contract_type}
                        </span>
                      </td>
                      <td className="text-sm">{c.underlying}</td>
                      <td className="text-mono text-sm">{c.buy_price?.toFixed(2)} {currency}</td>
                      <td className="text-mono text-sm text-success">{c.payout?.toFixed(2) ?? '—'}</td>
                      <td className="text-sm text-muted">{formatTime(c.date_expiry)}</td>
                      <td>
                        <button
                          className={`btn btn-ghost btn-sm`}
                          onClick={() => handleSell(c.contract_id)}
                          disabled={sellingId === c.contract_id}
                        >
                          {sellingId === c.contract_id ? <div className="spinner" style={{ width: 12, height: 12 }} /> : 'Sell'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}

        {/* Trade History */}
        {isLoggedIn && tab === 'history' && (
          <>
            {loading && statement.length === 0 ? (
              <div className={styles.loadingRow}>
                <div className="spinner" style={{ width: 16, height: 16 }} />
                <span className="text-muted text-sm">Loading history…</span>
              </div>
            ) : statement.length === 0 ? (
              <div className={styles.empty}>
                <p>No trade history yet</p>
              </div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Action</th>
                    <th>Amount</th>
                    <th>Balance After</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {statement.map(s => (
                    <tr key={s.transaction_id}>
                      <td className="text-mono text-sm">{s.transaction_id}</td>
                      <td>
                        <span className={`badge ${s.amount > 0 ? 'badge-success' : 'badge-danger'}`}>
                          {s.action_type}
                        </span>
                      </td>
                      <td className={`text-mono text-sm ${s.amount > 0 ? 'text-success' : 'text-danger'}`}>
                        {s.amount > 0 ? '+' : ''}{s.amount?.toFixed(2)} {currency}
                      </td>
                      <td className="text-mono text-sm">{s.balance_after?.toFixed(2)}</td>
                      <td className="text-sm text-muted">
                        {formatTime(s.sell_time || s.purchase_time)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>
    </div>
  );
}
