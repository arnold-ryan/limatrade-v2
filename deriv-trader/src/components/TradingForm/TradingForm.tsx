import { useEffect, useRef, useState } from 'react';
import { useStore } from '../../store';
import { getProposal, buyContract, forget } from '../../services/websocket';
import { WSMessage } from '../../services/websocket';
import styles from './TradingForm.module.css';

const DURATION_UNITS = [
  { value: 't', label: 'Ticks' },
  { value: 's', label: 'Seconds' },
  { value: 'm', label: 'Minutes' },
  { value: 'h', label: 'Hours' },
];

const CONTRACT_TYPES = [
  { rise: 'CALL', fall: 'PUT', label: 'Rise/Fall' },
  { rise: 'ONETOUCH', fall: 'NOTOUCH', label: 'Touch/No Touch' },
];

interface ProposalData {
  id: string;
  ask_price: number;
  payout: number;
  longcode: string;
}

export default function TradingForm() {
  const {
    activeSymbol, ticks, tradeAmount, setTradeAmount,
    tradeDuration, setTradeDuration, tradeDurationUnit, setTradeDurationUnit,
    isBuying, setIsBuying, setLastTrade,
    isLoggedIn,
  } = useStore();

  const [proposal, setProposal] = useState<ProposalData | null>(null);
  const [proposalError, setProposalError] = useState<string | null>(null);
  const [contractType, setContractType] = useState(0);
  const [tradeStatus, setTradeStatus] = useState<string | null>(null);

  const proposalSubId = useRef<string | null>(null);
  const proposalTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const tick = ticks.get(activeSymbol);

  // Debounced proposal request
  useEffect(() => {
    if (!isLoggedIn) return;
    if (proposalTimer.current) clearTimeout(proposalTimer.current);

    proposalTimer.current = setTimeout(async () => {
      // Forget previous proposal subscription
      if (proposalSubId.current) {
        await forget(proposalSubId.current).catch(() => {});
        proposalSubId.current = null;
        setProposal(null);
      }

      const amount = parseFloat(tradeAmount);
      if (isNaN(amount) || amount <= 0) {
        setProposalError('Enter a valid amount');
        return;
      }

      try {
        setProposalError(null);
        const resp = await getProposal({
          symbol: activeSymbol,
          contract_type: CONTRACT_TYPES[contractType].rise,
          amount,
          currency: 'USD',
          duration: tradeDuration,
          duration_unit: tradeDurationUnit,
          basis: 'stake',
        });

        const p = resp.proposal as ProposalData | undefined;
        if (p) {
          setProposal(p);
          proposalSubId.current = p.id;
        }

        // Subscribe to ongoing proposal updates
        const w = window as unknown as Record<string, unknown>;
        const unsub = w.__proposalUnsub as (() => void) | undefined;
        unsub?.();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Could not get quote';
        setProposalError(message);
      }
    }, 600);

    return () => {
      if (proposalTimer.current) clearTimeout(proposalTimer.current);
    };
  }, [activeSymbol, tradeAmount, tradeDuration, tradeDurationUnit, contractType, isLoggedIn]);

  const handleBuy = async (direction: 'rise' | 'fall') => {
    if (!proposal || isBuying) return;
    setIsBuying(true);
    setTradeStatus('Placing trade…');

    try {
      const ctype = direction === 'rise'
        ? CONTRACT_TYPES[contractType].rise
        : CONTRACT_TYPES[contractType].fall;

      // Get fresh proposal for the chosen direction
      const freshProposal = await getProposal({
        symbol: activeSymbol,
        contract_type: ctype,
        amount: parseFloat(tradeAmount),
        currency: 'USD',
        duration: tradeDuration,
        duration_unit: tradeDurationUnit,
        basis: 'stake',
      });

      const fp = freshProposal.proposal as ProposalData;
      const result = await buyContract(fp.id, fp.ask_price);
      const buyResult = result.buy as { contract_id: number; buy_price: number; payout: number } | undefined;

      if (buyResult) {
        setTradeStatus(`✓ Contract #${buyResult.contract_id} purchased for ${buyResult.buy_price} USD`);
        setLastTrade({ type: ctype, result: 'pending', profit: 0 });
        setTimeout(() => setTradeStatus(null), 4000);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Trade failed';
      setTradeStatus(`✗ ${message}`);
      setTimeout(() => setTradeStatus(null), 5000);
    } finally {
      setIsBuying(false);
    }
  };

  return (
    <div className={styles.form}>
      <div className={styles.header}>
        <h3 className={styles.title}>Trade</h3>
        <div className={styles.symbolPill}>
          {activeSymbol.replace('frx', '').replace('cry', '').replace('R_', 'Vol ').replace('1HZ', '').replace('V', '')}
        </div>
      </div>

      {/* Live price */}
      <div className={styles.priceDisplay}>
        <span className={styles.priceLabel}>Current Price</span>
        <span className={`${styles.priceValue} text-mono`}>
          {tick?.quote != null
            ? tick.quote.toFixed(activeSymbol.startsWith('frx') ? 5 : activeSymbol.startsWith('cry') ? 2 : 2)
            : '—'}
        </span>
      </div>

      {/* Contract type selector */}
      <div className={styles.section}>
        <label className={styles.label}>Contract Type</label>
        <div className={styles.segmented}>
          {CONTRACT_TYPES.map((ct, i) => (
            <button
              key={i}
              className={`${styles.segment} ${contractType === i ? styles.segmentActive : ''}`}
              onClick={() => setContractType(i)}
            >
              {ct.label}
            </button>
          ))}
        </div>
      </div>

      {/* Amount */}
      <div className={styles.section}>
        <label className={styles.label}>Stake (USD)</label>
        <div className={styles.amountRow}>
          <button
            className={styles.amountBtn}
            onClick={() => setTradeAmount(String(Math.max(1, parseFloat(tradeAmount || '0') - 1)))}
          >−</button>
          <input
            type="number"
            className={`input ${styles.amountInput}`}
            value={tradeAmount}
            onChange={e => setTradeAmount(e.target.value)}
            min="1"
            step="1"
          />
          <button
            className={styles.amountBtn}
            onClick={() => setTradeAmount(String(parseFloat(tradeAmount || '0') + 1))}
          >+</button>
        </div>
        <div className={styles.presets}>
          {[5, 10, 25, 50, 100].map(v => (
            <button key={v} className={styles.preset} onClick={() => setTradeAmount(String(v))}>
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Duration */}
      <div className={styles.section}>
        <label className={styles.label}>Duration</label>
        <div className={styles.durationRow}>
          <input
            type="number"
            className={`input ${styles.durationInput}`}
            value={tradeDuration}
            onChange={e => setTradeDuration(parseInt(e.target.value) || 1)}
            min="1"
          />
          <select
            className={`input ${styles.durationUnit}`}
            value={tradeDurationUnit}
            onChange={e => setTradeDurationUnit(e.target.value)}
          >
            {DURATION_UNITS.map(u => (
              <option key={u.value} value={u.value}>{u.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Proposal / Payout info */}
      <div className={styles.proposalBox}>
        {proposalError ? (
          <span className="text-danger text-sm">{proposalError}</span>
        ) : proposal ? (
          <>
            <div className={styles.proposalRow}>
              <span className="text-muted">Stake</span>
              <span className="text-mono">{parseFloat(tradeAmount).toFixed(2)} USD</span>
            </div>
            <div className={styles.proposalRow}>
              <span className="text-muted">Potential payout</span>
              <span className={`text-mono text-success`}>{proposal.payout.toFixed(2)} USD</span>
            </div>
          </>
        ) : (
          <div className={styles.proposalLoading}>
            <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
            <span className="text-muted text-sm">Getting quote…</span>
          </div>
        )}
      </div>

      {/* Trade status message */}
      {tradeStatus && (
        <div className={`${styles.tradeStatus} ${tradeStatus.startsWith('✓') ? styles.statusSuccess : tradeStatus.startsWith('✗') ? styles.statusError : styles.statusPending}`}>
          {tradeStatus}
        </div>
      )}

      {/* Buy/Sell buttons */}
      {!isLoggedIn ? (
        <p className={`text-muted text-sm`} style={{ textAlign: 'center', padding: '8px 0' }}>
          Log in to trade
        </p>
      ) : (
        <div className={styles.tradeButtons}>
          <button
            className={`btn btn-primary ${styles.buyBtn}`}
            onClick={() => handleBuy('rise')}
            disabled={!proposal || isBuying}
          >
            {isBuying ? <div className="spinner" /> : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="18 15 12 9 6 15"/>
                </svg>
                Rise
              </>
            )}
          </button>
          <button
            className={`btn btn-danger ${styles.sellBtn}`}
            onClick={() => handleBuy('fall')}
            disabled={!proposal || isBuying}
          >
            {isBuying ? <div className="spinner" /> : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
                Fall
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
