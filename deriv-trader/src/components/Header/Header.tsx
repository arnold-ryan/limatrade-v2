import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import { clearSession } from '../../services/auth';
import styles from './Header.module.css';

export default function Header() {
  const { activeAccount, accounts, balance, currency, wsConnected, setActiveAccount, logout } = useStore();
  const navigate = useNavigate();
  const [showAccountMenu, setShowAccountMenu] = useState(false);

  const handleLogout = () => {
    clearSession();
    logout();
    navigate('/login');
  };

  const handleSwitchAccount = (acct: typeof accounts[0]) => {
    setActiveAccount(acct);
    setShowAccountMenu(false);
    // Reload to re-authorize with new token
    window.location.reload();
  };

  const isDemo = activeAccount?.account.startsWith('VRT');
  const formattedBalance = balance != null
    ? balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '—';

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        {/* Logo */}
        <a href="/dashboard" className={styles.logo}>
          <svg width="28" height="28" viewBox="0 0 48 48" fill="none">
            <rect width="48" height="48" rx="10" fill="#118e1c" fillOpacity="0.15"/>
            <path d="M12 24C12 17.37 17.37 12 24 12C30.63 12 36 17.37 36 24C36 30.63 30.63 36 24 36" stroke="#118e1c" strokeWidth="2.5" strokeLinecap="round"/>
            <path d="M24 36L18 30L24 24L30 30L24 36Z" fill="#118e1c"/>
            <circle cx="24" cy="20" r="3" fill="#118e1c"/>
          </svg>
          <span className={styles.logoText}>DerivTrader</span>
        </a>

        {/* Connection indicator */}
        <div className={styles.connStatus}>
          <div className={wsConnected ? 'dot-live' : styles.dotOffline} />
          <span className={styles.connLabel}>
            {wsConnected ? 'Live' : 'Connecting…'}
          </span>
        </div>
      </div>

      <div className={styles.right}>
        {/* Balance */}
        {balance != null && (
          <div className={styles.balanceChip}>
            <span className={styles.balanceCurrency}>{currency}</span>
            <span className={styles.balanceAmount}>{formattedBalance}</span>
            {isDemo && <span className="badge badge-warning" style={{ marginLeft: 6 }}>Demo</span>}
          </div>
        )}

        {/* Account switcher */}
        <div className={styles.accountMenu}>
          <button
            className={styles.accountBtn}
            onClick={() => setShowAccountMenu(v => !v)}
          >
            <div className={styles.avatar}>
              {activeAccount?.account.slice(0, 2).toUpperCase()}
            </div>
            <span className={styles.accountId}>{activeAccount?.account}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>

          {showAccountMenu && (
            <div className={styles.dropdown}>
              <div className={styles.dropdownHeader}>Accounts</div>
              {accounts.map(acct => (
                <button
                  key={acct.account}
                  className={`${styles.dropdownItem} ${acct.account === activeAccount?.account ? styles.activeItem : ''}`}
                  onClick={() => handleSwitchAccount(acct)}
                >
                  <span>{acct.account}</span>
                  <span className={styles.dropdownCurrency}>{acct.currency}</span>
                  {acct.account === activeAccount?.account && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#118e1c" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  )}
                </button>
              ))}
              <div className={styles.dropdownDivider} />
              <button className={styles.dropdownItem} onClick={handleLogout} style={{ color: 'var(--color-danger)' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
