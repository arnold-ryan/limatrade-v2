import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { loadAccounts, getActiveAccount } from '../services/auth';
import * as WS from '../services/websocket';
import Header from '../components/Header/Header';
import TickerBar from '../components/TickerBar/TickerBar';
import TradingForm from '../components/TradingForm/TradingForm';
import PriceChart from '../components/Chart/PriceChart';
import AccountInfo from '../components/AccountInfo/AccountInfo';
import styles from './Dashboard.module.css';

export default function Dashboard() {
  const navigate = useNavigate();
  const {
    setAccounts, setActiveAccount, isLoggedIn,
    setWsConnected, setBalance, setAuthorizing,
  } = useStore();
  const pingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Restore session
    const accounts = loadAccounts();
    const active = getActiveAccount();

    if (!active || !accounts.length) {
      navigate('/login');
      return;
    }

    setAccounts(accounts);
    setActiveAccount(active);

    // Track connection state
    const offConn = WS.onConnectionChange((connected) => {
      setWsConnected(connected);
    });

    // Connect and authorize
    (async () => {
      try {
        setAuthorizing(true);
        await WS.connect();

        const authResp = await WS.authorize(active.token);
        const authData = authResp.authorize as {
          loginid: string; balance: number; currency: string; email: string
        } | undefined;

        if (authData) {
          setBalance(authData.balance, authData.currency);
          setActiveAccount({ ...active, account: authData.loginid, currency: authData.currency });
        }

        // Subscribe to balance updates
        WS.subscribe('balance', (data) => {
          const b = data.balance as { balance: number; currency: string } | undefined;
          if (b) setBalance(b.balance, b.currency);
        });

        await WS.getBalance(true);

        setAuthorizing(false);

        // Keep-alive ping
        pingRef.current = WS.startPing();
      } catch (err) {
        console.error('Init error', err);
        setAuthorizing(false);
      }
    })();

    return () => {
      offConn();
      if (pingRef.current) clearInterval(pingRef.current);
    };
  }, [navigate, setAccounts, setActiveAccount, setWsConnected, setBalance, setAuthorizing]);

  if (!isLoggedIn) return null;

  return (
    <div className={styles.layout}>
      <Header />
      <TickerBar />
      <div className={styles.main}>
        {/* Left: Chart + Positions */}
        <div className={styles.chartArea}>
          <div className={styles.chart}>
            <PriceChart />
          </div>
          <div className={styles.positions}>
            <AccountInfo />
          </div>
        </div>

        {/* Right: Trade Form */}
        <div className={styles.sidebar}>
          <TradingForm />
        </div>
      </div>
    </div>
  );
}
