import { useState, useEffect, useCallback } from 'react'
import { ethers } from 'ethers'
import { CONTRACT_ADDRESS, CONTRACT_ABI } from './contractConfig'
import RegisterBatch from './components/RegisterBatch'
import LogCheckpoint from './components/LogCheckpoint'
import VerifyBatch from './components/VerifyBatch'
import Dashboard from './components/Dashboard'
import './index.css'

// ── Sepolia chain ID ────────────────────────────────────
const SEPOLIA_CHAIN_ID = '0xaa36a7' // 11155111 in hex

// ── Tab configuration ───────────────────────────────────
const TABS = [
  { id: 'dashboard', label: 'Dashboard',       icon: '◈',  needsWallet: false },
  { id: 'register',  label: 'Register Batch',  icon: '⊞',  needsWallet: true  },
  { id: 'log',       label: 'Log Checkpoint',  icon: '⊕',  needsWallet: true  },
  { id: 'verify',    label: 'Verify Batch',    icon: '⊛',  needsWallet: false },
]

function shortAddress(addr) {
  return addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : ''
}

export default function App() {
  const [account,      setAccount]      = useState(null)
  const [contract,     setContract]     = useState(null)
  const [provider,     setProvider]     = useState(null)
  const [activeTab,    setActiveTab]    = useState('dashboard')
  const [networkError, setNetworkError] = useState('')
  const [connecting,   setConnecting]   = useState(false)

  // ── Auto-reconnect if already authorised ───────────────
  useEffect(() => {
    if (!window.ethereum) return
    window.ethereum
      .request({ method: 'eth_accounts' })
      .then(accs => { if (accs.length > 0) connectWallet() })
      .catch(() => {})

    // Listen for account / chain changes
    const onAccountsChanged = (accs) => {
      if (accs.length === 0) disconnectWallet()
      else connectWallet()
    }
    const onChainChanged = () => window.location.reload()

    window.ethereum.on('accountsChanged', onAccountsChanged)
    window.ethereum.on('chainChanged',    onChainChanged)
    return () => {
      window.ethereum.removeListener('accountsChanged', onAccountsChanged)
      window.ethereum.removeListener('chainChanged',    onChainChanged)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const connectWallet = useCallback(async () => {
    if (!window.ethereum) {
      alert('MetaMask is not installed.\nPlease install the MetaMask browser extension and refresh this page.')
      return
    }
    setConnecting(true)
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
      const chainId  = await window.ethereum.request({ method: 'eth_chainId' })

      if (chainId !== SEPOLIA_CHAIN_ID) {
        setNetworkError('Switch MetaMask to Sepolia Testnet')
        setConnecting(false)
        return
      }
      setNetworkError('')

      const _provider = new ethers.BrowserProvider(window.ethereum)
      const _signer   = await _provider.getSigner()
      const _contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, _signer)

      setAccount(accounts[0])
      setProvider(_provider)
      setContract(_contract)
    } catch (err) {
      if (err.code !== 4001) console.error('Wallet connection error:', err)
    } finally {
      setConnecting(false)
    }
  }, [])

  const disconnectWallet = () => {
    setAccount(null)
    setContract(null)
    setProvider(null)
  }

  // ── Read-only contract for public verify / dashboard ───
  const readContract = (() => {
    try {
      const p = new ethers.JsonRpcProvider('https://rpc.sepolia.org')
      return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, p)
    } catch { return null }
  })()

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--cc-slate-1)' }}>

      {/* ── Top Navigation ──────────────────────────────── */}
      <header style={{
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--cc-border)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}>
        <div className="max-w-5xl mx-auto px-5">
          <div className="flex items-center justify-between py-3">

            {/* Logo */}
            <div className="flex items-center gap-3">
              <div style={{
                width: 38, height: 38,
                background: 'linear-gradient(135deg, #4f46e5, #06b6d4)',
                borderRadius: 10,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, boxShadow: '0 2px 8px rgba(79,70,229,.35)'
              }}>❄️</div>
              <div>
                <h1 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--cc-text)', lineHeight: 1.2 }}>
                  ChainChill
                </h1>
                <p style={{ fontSize: '0.7rem', color: 'var(--cc-muted)', lineHeight: 1 }}>
                  Cold Chain · Ethereum Sepolia
                </p>
              </div>
            </div>

            {/* Wallet area */}
            <div className="flex items-center gap-2">
              {networkError && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: '#fef3c7', border: '1px solid #fde68a',
                  borderRadius: 8, padding: '5px 12px',
                  fontSize: '0.75rem', color: '#92400e', fontWeight: 500
                }}>
                  ⚠ {networkError}
                </div>
              )}

              {account ? (
                <div className="flex items-center gap-2">
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: '#f0fdf4', border: '1px solid #bbf7d0',
                    borderRadius: 99, padding: '6px 14px',
                  }}>
                    <div style={{ width: 7, height: 7, background: '#22c55e', borderRadius: '50%', animation: 'pulse2 2s infinite' }} />
                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#15803d', fontFamily: 'monospace' }}>
                      {shortAddress(account)}
                    </span>
                  </div>
                  <button
                    onClick={disconnectWallet}
                    className="cc-btn cc-btn-ghost"
                    style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <button
                  id="connect-wallet-btn"
                  onClick={connectWallet}
                  disabled={connecting}
                  className="cc-btn cc-btn-primary"
                  style={{ padding: '8px 18px' }}
                >
                  {connecting
                    ? <><div className="cc-spinner" style={{ width:16, height:16 }} />Connecting…</>
                    : <>🦊 Connect MetaMask</>
                  }
                </button>
              )}
            </div>
          </div>

          {/* Tab bar */}
          <nav className="flex gap-0" style={{ marginBottom: -1 }}>
            {TABS.map(tab => (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 16px',
                  fontSize: '0.85rem',
                  fontWeight: activeTab === tab.id ? 600 : 500,
                  color: activeTab === tab.id ? 'var(--cc-indigo)' : 'var(--cc-muted)',
                  borderBottom: activeTab === tab.id
                    ? '2px solid var(--cc-indigo)'
                    : '2px solid transparent',
                  background: 'none',
                  border: 'none',
                  borderBottom: activeTab === tab.id
                    ? '2px solid var(--cc-indigo)'
                    : '2px solid transparent',
                  cursor: 'pointer',
                  transition: 'color .15s, border-color .15s',
                  whiteSpace: 'nowrap',
                  fontFamily: 'inherit',
                }}
              >
                <span style={{ fontSize: '1rem' }}>{tab.icon}</span>
                {tab.label}
                {tab.needsWallet && !account && (
                  <span style={{
                    fontSize: '0.62rem', background: '#fef3c7',
                    color: '#d97706', borderRadius: 99, padding: '1px 6px',
                    fontWeight: 600
                  }}>🔒</span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* ── Main content ──────────────────────────────────── */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-5 py-7">

        {/* Wallet prompt banner */}
        {!account && (activeTab === 'register' || activeTab === 'log') && (
          <div className="animate-fadeIn" style={{
            background: 'linear-gradient(135deg, #ede9fe, #dbeafe)',
            border: '1px solid #c7d2fe', borderRadius: 'var(--radius-lg)',
            padding: '14px 20px', marginBottom: 20,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12
          }}>
            <div className="flex items-center gap-3">
              <span style={{ fontSize: '1.5rem' }}>🦊</span>
              <div>
                <p style={{ fontWeight: 600, fontSize: '0.9rem', color: '#3730a3' }}>
                  Wallet connection required
                </p>
                <p style={{ fontSize: '0.8rem', color: '#6d28d9', marginTop: 2 }}>
                  Connect MetaMask (Sepolia) to write transactions to the blockchain.
                </p>
              </div>
            </div>
            <button onClick={connectWallet} className="cc-btn cc-btn-primary" style={{ whiteSpace: 'nowrap' }}>
              Connect Wallet
            </button>
          </div>
        )}

        {/* Info banner for public verify */}
        {!account && activeTab === 'verify' && (
          <div style={{
            background: '#f0fdf4', border: '1px solid #bbf7d0',
            borderRadius: 'var(--radius-md)', padding: '12px 18px',
            marginBottom: 20, fontSize: '0.82rem', color: '#166534',
            display: 'flex', alignItems: 'center', gap: 8
          }}>
            <span>✅</span>
            <span>Batch verification is <strong>free and public</strong> — no wallet required.</span>
          </div>
        )}

        {/* Panel routing */}
        <div className="animate-fadeIn" key={activeTab}>
          {activeTab === 'dashboard' && (
            <Dashboard contract={contract} readContract={readContract} account={account} />
          )}
          {activeTab === 'register' && (
            <RegisterBatch contract={contract} account={account} />
          )}
          {activeTab === 'log' && (
            <LogCheckpoint contract={contract} account={account} />
          )}
          {activeTab === 'verify' && (
            <VerifyBatch contract={contract} readContract={readContract} />
          )}
        </div>
      </main>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer style={{
        borderTop: '1px solid var(--cc-border)',
        padding: '18px 20px',
        textAlign: 'center',
        fontSize: '0.75rem',
        color: 'var(--cc-muted)',
        background: 'white',
      }}>
        <p>
          <strong style={{ color: 'var(--cc-text)' }}>ChainChill</strong>
          &nbsp;·&nbsp; BE IT Mini-Project 2025–26 &nbsp;·&nbsp; Blockchain &amp; DLT Lab
          &nbsp;·&nbsp; Ethereum Sepolia Testnet
        </p>
        <p style={{ marginTop: 4 }}>
          Contract:&nbsp;
          <a
            href={`https://sepolia.etherscan.io/address/${CONTRACT_ADDRESS}`}
            target="_blank" rel="noopener noreferrer"
            style={{ color: 'var(--cc-indigo)', fontFamily: 'monospace', fontSize: '0.72rem' }}
          >
            {CONTRACT_ADDRESS}
          </a>
        </p>
      </footer>
    </div>
  )
}
