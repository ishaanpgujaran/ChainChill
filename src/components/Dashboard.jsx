import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../contractConfig'

function getReadContract() {
  try {
    const p = new ethers.JsonRpcProvider('https://rpc.sepolia.org')
    return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, p)
  } catch { return null }
}

const TYPE_ICONS = { pharma:'💊', food:'🥛', quickcommerce:'⚡' }
const TYPE_LABELS = { pharma:'Pharma', food:'Food & Dairy', quickcommerce:'Quick Commerce' }

function shortAddr(addr) { return addr ? `${addr.slice(0,6)}…${addr.slice(-4)}` : '' }
function fmtDate(ts) { return new Date(ts*1000).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}) }

export default function Dashboard({ contract, readContract, account }) {
  const [batches,   setBatches]   = useState([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState('')
  const [filter,    setFilter]    = useState('all') // all | safe | compromised | mine
  const [cpCounts,  setCpCounts]  = useState({})

  const rc = readContract || getReadContract()

  useEffect(() => { loadDashboard() }, [account]) // reload when wallet changes

  async function loadDashboard() {
    if (!rc) { setError('No RPC connection.'); setLoading(false); return }
    setLoading(true); setError('')
    try {
      const ids = await rc.getAllBatchIds()
      if (ids.length === 0) { setBatches([]); setLoading(false); return }

      const batchResults = await Promise.all(
        ids.map(id => rc.getBatch(id).then(b => ({ id, ...b })).catch(() => null))
      )

      const validBatches = batchResults.filter(Boolean).map(b => ({
        id:           b.id,
        productName:  b.productName,
        productType:  b.productType,
        minTemp:      Number(b.minTemp),
        maxTemp:      Number(b.maxTemp),
        expiryDate:   Number(b.expiryDate),
        manufacturer: b.manufacturer,
        isCompromised:b.isCompromised,
        createdAt:    Number(b.createdAt),
      }))

      setBatches(validBatches)

      // Load checkpoint counts in background
      Promise.all(ids.map(id => rc.getCheckpoints(id).then(cps => [id, cps.length]).catch(() => [id, 0])))
        .then(entries => setCpCounts(Object.fromEntries(entries)))
    } catch (err) {
      console.error(err)
      setError('Failed to load dashboard. The RPC may be rate-limited — try again in a moment.')
    } finally { setLoading(false) }
  }

  // Stats
  const total       = batches.length
  const safe        = batches.filter(b => !b.isCompromised).length
  const compromised = batches.filter(b => b.isCompromised).length
  const totalCps    = Object.values(cpCounts).reduce((s,n) => s+n, 0)

  // Filtered list
  const displayed = batches.filter(b => {
    if (filter === 'safe')        return !b.isCompromised
    if (filter === 'compromised') return b.isCompromised
    if (filter === 'mine')        return account && b.manufacturer.toLowerCase() === account.toLowerCase()
    return true
  })

  const FILTER_TABS = [
    { id:'all',          label:`All (${total})` },
    { id:'safe',         label:`✅ Safe (${safe})` },
    { id:'compromised',  label:`❌ Compromised (${compromised})` },
    { id:'mine',         label:'🔐 My Batches' },
  ]

  return (
    <div>
      {/* Page header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <div>
          <h2 style={{ fontSize:'1.25rem', fontWeight:700, color:'var(--cc-text)' }}>Dashboard</h2>
          <p style={{ fontSize:'0.85rem', color:'var(--cc-muted)', marginTop:4 }}>
            All batches registered on Ethereum Sepolia · Updates live from blockchain
          </p>
        </div>
        <button onClick={loadDashboard} className="cc-btn cc-btn-ghost"
          disabled={loading} style={{ gap:6, fontSize:'0.82rem' }}>
          {loading ? <div className="cc-spinner" style={{ width:14, height:14, borderTopColor:'var(--cc-indigo)', borderColor:'#e2e8f0' }} /> : '↻'}
          Refresh
        </button>
      </div>

      {/* Stats row */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))', gap:14, marginBottom:26 }}>
        {[
          { label:'Total Batches',     value:total,       color:'var(--cc-indigo)', bg:'#ede9fe', icon:'📦' },
          { label:'Safe',              value:safe,        color:'#16a34a',          bg:'#dcfce7', icon:'✅' },
          { label:'Compromised',       value:compromised, color:'#dc2626',          bg:'#fee2e2', icon:'❌' },
          { label:'Total Checkpoints', value:totalCps,    color:'var(--cc-cyan)',   bg:'#ecfeff', icon:'🌡' },
        ].map(s => (
          <div key={s.label} style={{
            background:'white', border:'1px solid var(--cc-border)', borderRadius:12,
            padding:'16px 18px', boxShadow:'var(--shadow-sm)',
          }}>
            <div style={{ fontSize:'0.75rem', fontWeight:600, color:'var(--cc-muted)', marginBottom:6, textTransform:'uppercase', letterSpacing:'.04em' }}>
              {s.icon} {s.label}
            </div>
            <div style={{ fontSize:'1.8rem', fontWeight:800, color:s.color, lineHeight:1 }}>
              {loading ? '—' : s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display:'flex', gap:6, marginBottom:20, flexWrap:'wrap' }}>
        {FILTER_TABS.map(ft => (
          <button key={ft.id} onClick={() => setFilter(ft.id)}
            style={{
              padding:'6px 14px', borderRadius:99, fontSize:'0.8rem', fontWeight:600,
              border:'1.5px solid', cursor:'pointer', fontFamily:'inherit',
              borderColor: filter===ft.id ? 'var(--cc-indigo)' : 'var(--cc-border)',
              background:  filter===ft.id ? 'var(--cc-indigo)' : 'white',
              color:       filter===ft.id ? 'white' : 'var(--cc-muted)',
              transition:  'all .14s',
            }}>
            {ft.label}
          </button>
        ))}
        {filter==='mine' && !account && (
          <span style={{ fontSize:'0.78rem', color:'var(--cc-muted)', alignSelf:'center', marginLeft:6 }}>
            (Connect wallet to see your batches)
          </span>
        )}
      </div>

      {/* Error */}
      {error && (
        <div style={{ background:'#fef3c7', border:'1px solid #fde68a', borderRadius:10, padding:'12px 16px', marginBottom:20, fontSize:'0.84rem', color:'#92400e' }}>
          ⚠ {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:14 }}>
          {[1,2,3].map(i => (
            <div key={i} style={{ background:'var(--cc-slate-2)', borderRadius:12, height:130, animation:'pulse2 1.5s infinite' }} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && displayed.length === 0 && (
        <div className="cc-card" style={{ padding:48, textAlign:'center' }}>
          <div style={{ fontSize:48, marginBottom:12 }}>📭</div>
          <h3 style={{ fontWeight:700, color:'var(--cc-text)', marginBottom:8 }}>
            {filter==='mine' ? 'No batches registered by your wallet' : 'No batches found'}
          </h3>
          <p style={{ fontSize:'0.85rem', color:'var(--cc-muted)' }}>
            {filter==='mine'
              ? 'Switch to "Register Batch" tab to create your first on-chain batch.'
              : 'Register a batch to get started.'}
          </p>
        </div>
      )}

      {/* Batch cards grid */}
      {!loading && displayed.length > 0 && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(290px,1fr))', gap:16 }}>
          {displayed.map((b, i) => {
            const isMine = account && b.manufacturer.toLowerCase() === account.toLowerCase()
            const expired = b.expiryDate < Math.floor(Date.now()/1000)
            return (
              <div key={b.id} className="cc-card animate-fadeIn"
                style={{ padding:20, animationDelay:`${i*0.04}s`, position:'relative', overflow:'hidden' }}>

                {/* My batch highlight stripe */}
                {isMine && (
                  <div style={{ position:'absolute', top:0, left:0, right:0, height:3,
                    background:'linear-gradient(90deg, var(--cc-indigo), var(--cc-cyan))' }} />
                )}

                {/* Top row */}
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
                      <span style={{ fontSize:'1.1rem' }}>{TYPE_ICONS[b.productType]||'📦'}</span>
                      <span style={{ fontSize:'0.92rem', fontWeight:700, color:'var(--cc-text)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                        {b.productName}
                      </span>
                    </div>
                    <code style={{ fontSize:'0.72rem', color:'var(--cc-indigo)', background:'#ede9fe', borderRadius:5, padding:'2px 7px' }}>
                      {b.id}
                    </code>
                  </div>
                  <span className="cc-badge" style={b.isCompromised
                    ? { background:'#fee2e2', color:'#b91c1c', marginLeft:8 }
                    : { background:'#dcfce7', color:'#15803d', marginLeft:8 }}>
                    {b.isCompromised ? '❌ Compromised' : '✅ Safe'}
                  </span>
                </div>

                {/* Details */}
                <div style={{ fontSize:'0.79rem', color:'var(--cc-muted)', display:'flex', flexDirection:'column', gap:4 }}>
                  <div style={{ display:'flex', justifyContent:'space-between' }}>
                    <span>Type</span>
                    <span style={{ color:'var(--cc-text)', fontWeight:600 }}>{TYPE_LABELS[b.productType]||b.productType}</span>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between' }}>
                    <span>Safe range</span>
                    <span style={{ color:'var(--cc-text)', fontWeight:600 }}>{b.minTemp} °C – {b.maxTemp} °C</span>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between' }}>
                    <span>Checkpoints</span>
                    <span style={{ color:'var(--cc-text)', fontWeight:600 }}>{cpCounts[b.id] ?? '…'}</span>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between' }}>
                    <span>Expiry</span>
                    <span style={{ color: expired ? '#dc2626' : 'var(--cc-text)', fontWeight:600 }}>
                      {fmtDate(b.expiryDate)}{expired ? ' ⚠' : ''}
                    </span>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between' }}>
                    <span>Manufacturer</span>
                    <a href={`https://sepolia.etherscan.io/address/${b.manufacturer}`}
                      target="_blank" rel="noopener noreferrer"
                      style={{ color:'var(--cc-indigo)', fontFamily:'monospace', fontSize:'0.72rem' }}>
                      {isMine ? '⭐ You' : shortAddr(b.manufacturer)} ↗
                    </a>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
