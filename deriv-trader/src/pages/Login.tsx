import { getLoginUrl } from '../services/auth';
import styles from './Login.module.css';

export default function Login() {
  const handleLogin = async () => {
    const url = await getLoginUrl();
    window.location.href = url;
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        {/* Logo */}
        <div className={styles.logo}>
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <rect width="48" height="48" rx="12" fill="#118e1c" fillOpacity="0.15"/>
            <path d="M12 24C12 17.37 17.37 12 24 12C30.63 12 36 17.37 36 24C36 30.63 30.63 36 24 36" stroke="#118e1c" strokeWidth="2.5" strokeLinecap="round"/>
            <path d="M24 36L18 30L24 24L30 30L24 36Z" fill="#118e1c"/>
            <circle cx="24" cy="20" r="3" fill="#118e1c"/>
          </svg>
          <span className={styles.logoText}>DerivTrader</span>
        </div>

        <h1 className={styles.title}>Welcome back</h1>
        <p className={styles.subtitle}>
          Sign in with your Deriv account to access live trading, real-time prices,
          and full portfolio management.
        </p>

        <button onClick={handleLogin} className={styles.loginBtn}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
            <polyline points="10 17 15 12 10 7"/>
            <line x1="15" y1="12" x2="3" y2="12"/>
          </svg>
          Log in with Deriv
        </button>

        <div className={styles.divider}><span>New to Deriv?</span></div>

        <a
          href="https://deriv.com/signup/"
          target="_blank"
          rel="noreferrer"
          className={styles.signupLink}
        >
          Create a free Deriv account →
        </a>

        <div className={styles.features}>
          <div className={styles.feature}>
            <span className={styles.featureIcon}>📈</span>
            <span>Live price feeds via WebSocket</span>
          </div>
          <div className={styles.feature}>
            <span className={styles.featureIcon}>⚡</span>
            <span>Rise/Fall, Touch/No Touch contracts</span>
          </div>
          <div className={styles.feature}>
            <span className={styles.featureIcon}>🔐</span>
            <span>Secured by Deriv OAuth</span>
          </div>
        </div>

        <p className={styles.disclaimer}>
          This is an independent third-party platform built on the{' '}
          <a href="https://developers.deriv.com" target="_blank" rel="noreferrer">
            Deriv API
          </a>
          . Not affiliated with Deriv Ltd.
        </p>
      </div>
    </div>
  );
}
