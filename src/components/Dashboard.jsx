import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../contractConfig'
import { QRCodeCanvas } from 'qrcode.react'

// ── Type metadata ──────────────────────────────────────────────────────────────
const TYPE_ICONS  = { pharma:'💊', frozen:'🧊', fresh:'🥛', quickcommerce:'⚡' }
const TYPE_LABELS = { pharma:'Pharma / Vaccines', frozen:'Frozen Food', fresh:'Fresh / Dairy', quickcommerce:'Quick Commerce' }

// ── Role metadata ──────────────────────────────────────────────────────────────
const ROLE_COLORS = {
  manufacturer: { bg:'#ede9fe', text:'#6d28d9' },
  warehouse:    { bg:'#dbeafe', text:'#1d4ed8' },
  transporter:  { bg:'#fef3c7', text:'#d97706' },
  receiver:     { bg:'#dcfce7', text:'#15803d' },
}
const ROLE_ICONS = { manufacturer:'🏭', warehouse:'🏢', transporter:'🚚', receiver:'📦' }

// ── Journey roles in expected order ───────────────────────────────────────────
const JOURNEY_ROLES = ['manufacturer', 'warehouse', 'transporter', 'receiver']

// ── Helpers ───────────────────────────────────────────────────────────────────
function shortAddr(addr)  { return addr ? `${addr.slice(0,6)}…${addr.slice(-4)}` : '' }
function fmtDate(ts)      { return ts ? new Date(ts*1000).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}) : '—' }
function fmtTime(ts)      { return ts ? new Date(ts*1000).toLocaleString('en-IN',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '—' }

// ── Download QR helper ────────────────────────────────────────────────────────
function downloadQR(batchId, canvasId) {
  const canvas = document.getElementById(canvasId)
  if (!canvas) return
  const link = document.createElement('a')
  link.download = `ChainChill-QR-${batchId}.png`
  link.href = canvas.toDataURL('image/png')
  link.click()
}

// ── QR Modal ──────────────────────────────────────────────────────────────────
function QRModal({ batchId, onClose }) {
  const canvasId = `qr-modal-canvas-${batchId}`
  return (
    <div
      onClick={onClose}
      style={{
        position:'fixed', inset:0, background:'rgba(0,0,0,0.55)',
        zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center',
      }}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background:'white', borderRadius:20, padding:32,
          maxWidth:320, width:'90%', textAlign:'center',
          boxShadow:'0 25px 60px rgba(0,0,0,0.25)',
        }}>
        <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:8 }}>
          <button onClick={onClose} style={{
            background:'none', border:'none', fontSize:20, cursor:'pointer',
            color:'var(--cc-muted)', lineHeight:1
          }}>✕</button>
        </div>
        <div style={{ display:'flex', justifyContent:'center', marginBottom:14 }}>
          <QRCodeCanvas
            id={canvasId}
            value={batchId}
            size={180}
            bgColor="white"
            fgColor="#0f172a"
            level="H"
          />
        </div>
        <p style={{ fontSize:'0.78rem', color:'var(--cc-muted)', marginBottom:14 }}>
          Batch ID: <span style={{ fontFamily:'monospace', color:'var(--cc-indigo)', fontWeight:600 }}>{batchId}</span>
        </p>
        <button
          onClick={() => downloadQR(batchId, canvasId)}
          className="cc-btn cc-btn-ghost"
          style={{ width:'100%', justifyContent:'center', fontSize:'0.82rem', gap:6 }}>
          ⬇ Download QR Code
        </button>
      </div>
    </div>
  )
}

// ── Batch Card (shared between sections) ──────────────────────────────────────
function BatchCard({ b, account, cpCount, onShowQR }) {
  const isMine  = account && (b.manufacturer?.toLowerCase?.() ?? '') === account.toLowerCase()
  const expired = b.expiryDate < Math.floor(Date.now()/1000)
  return (
    <div className="cc-card animate-fadeIn" style={{ padding:20, position:'relative', overflow:'hidden' }}>
      {/* My-batch highlight stripe */}
      {isMine && (
        <div style={{ position:'absolute', top:0, left:0, right:0, height:3,
          background:'linear-gradient(90deg, var(--cc-indigo), var(--cc-cyan))' }} />
      )}

      {/* Top row */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
            <span style={{ fontSize:'1.1rem' }}>{TYPE_ICONS[b.productType] || '📦'}</span>
            <span style={{ fontSize:'0.92rem', fontWeight:700, color:'var(--cc-text)',
              whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
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
      <div style={{ fontSize:'0.79rem', color:'var(--cc-muted)', display:'flex', flexDirection:'column', gap:4, marginBottom:12 }}>
        <div style={{ display:'flex', justifyContent:'space-between' }}>
          <span>Type</span>
          <span style={{ color:'var(--cc-text)', fontWeight:600 }}>{TYPE_LABELS[b.productType] || b.productType}</span>
        </div>
        <div style={{ display:'flex', justifyContent:'space-between' }}>
          <span>Safe range</span>
          <span style={{ color:'var(--cc-text)', fontWeight:600 }}>{b.minTemp} °C – {b.maxTemp} °C</span>
        </div>
        <div style={{ display:'flex', justifyContent:'space-between' }}>
          <span>Checkpoints</span>
          <span style={{ color:'var(--cc-text)', fontWeight:600 }}>{cpCount ?? '…'}</span>
        </div>
        <div style={{ display:'flex', justifyContent:'space-between' }}>
          <span>Expiry</span>
          <span style={{ color: expired?'#dc2626':'var(--cc-text)', fontWeight:600 }}>
            {fmtDate(b.expiryDate)}{expired?' ⚠':''}
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

      {/* Show QR button */}
      <button onClick={() => onShowQR(b.id)} className="cc-btn cc-btn-ghost"
        style={{ width:'100%', justifyContent:'center', fontSize:'0.78rem', padding:'6px 12px' }}>
        📷 Show QR
      </button>
    </div>
  )
}

// ── Journey progress component ────────────────────────────────────────────────
function JourneyProgress({ checkpoints }) {
  const rolesLogged = new Set((checkpoints || []).map(cp => cp.handlerRole?.toLowerCase()))
  return (
    <div style={{ display:'flex', alignItems:'center', gap:4, flexWrap:'wrap', marginTop:10, marginBottom:8 }}>
      {JOURNEY_ROLES.map((role, i) => {
        const done = rolesLogged.has(role)
        return (
          <span key={role} style={{ display:'flex', alignItems:'center', gap:4 }}>
            <span style={{
              fontSize:'0.75rem', fontWeight:600, padding:'3px 8px', borderRadius:99,
              background: done ? (ROLE_COLORS[role]?.bg || '#f1f5f9') : '#f8fafc',
              color: done ? (ROLE_COLORS[role]?.text || '#475569') : '#94a3b8',
              border: `1px solid ${done ? 'transparent' : '#e2e8f0'}`,
            }}>
              {ROLE_ICONS[role]} {role.charAt(0).toUpperCase()+role.slice(1)} {done ? '✅' : '⏳'}
            </span>
            {i < JOURNEY_ROLES.length - 1 && (
              <span style={{ color:'#cbd5e1', fontSize:'0.7rem' }}>→</span>
            )}
          </span>
        )
      })}
    </div>
  )
}

// ── Main Dashboard component ──────────────────────────────────────────────────
export default function Dashboard({ contract, readContract, account }) {
  const [batches,      setBatches]      = useState([])
  const [cpMap,        setCpMap]        = useState({}) // batchId → checkpoint[]
  const [cpCounts,     setCpCounts]     = useState({}) // batchId → count
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState('')
  const [filter,       setFilter]       = useState('all')
  const [qrModalBatch, setQrModalBatch] = useState(null)

  // Only load once wallet + signed contract are ready
  useEffect(() => {
    if (account && contract) loadDashboard()
  }, [account, contract]) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadDashboard() {
    const rc = contract || readContract
    if (!rc) { setError('No contract. Connect your wallet.'); return }

    try {
      const net = await rc.runner?.provider?.getNetwork?.()
      console.log('[Dashboard]', { contract: CONTRACT_ADDRESS, chain: net?.chainId?.toString(), account })
    } catch { /* best-effort */ }

    setLoading(true); setError('')

    try {
      const rawIds = await rc.getAllBatchIds()
      const ids    = Array.from(rawIds).map(id => id.toString())
      console.log('[Dashboard] IDs:', ids)

      if (ids.length === 0) { setBatches([]); setLoading(false); return }

      // Fetch batches + checkpoints in parallel
      const [batchResults, cpResults] = await Promise.all([
        Promise.all(ids.map(id =>
          rc.getBatch(id).then(data => {
            console.log('[Dashboard] raw getBatch', id, data)
            return {
              id,
              productName:   (data[0] ?? data.productName  ?? '').toString(),
              productType:   (data[1] ?? data.productType  ?? '').toString(),
              minTemp:       Number(data[2] ?? data.minTemp   ?? 0),
              maxTemp:       Number(data[3] ?? data.maxTemp   ?? 0),
              expiryDate:    Number(data[4] ?? data.expiryDate ?? 0),
              manufacturer:  (data[5] ?? data.manufacturer ?? '').toString(),
              isCompromised: !!(data[6] ?? data.isCompromised),
              createdAt:     Number(data[7] ?? data.createdAt ?? 0),
            }
          }).catch(() => null)
        )),
        Promise.all(ids.map(id =>
          rc.getCheckpoints(id).then(cps =>
            [id, cps.map(cp => ({
              handlerName:    cp.handlerName?.toString()    ?? '',
              handlerRole:    cp.handlerRole?.toString()    ?? '',
              temperature:    Number(cp.temperature         ?? 0),
              location:       cp.location?.toString()       ?? '',
              handlerAddress: cp.handlerAddress?.toString() ?? '',
              timestamp:      Number(cp.timestamp           ?? 0),
              isBreach:       !!cp.isBreach,
            }))]
          ).catch(() => [id, []])
        ))
      ])

      const valid = batchResults.filter(Boolean).filter(b => b.productName !== '')
      console.log('[Dashboard] parsed batches:', valid)
      setBatches(valid)

      // Build cpMap and cpCounts
      const newCpMap    = {}
      const newCpCounts = {}
      cpResults.forEach(([id, cps]) => {
        newCpMap[id]    = cps
        newCpCounts[id] = cps.length
      })
      setCpMap(newCpMap)
      setCpCounts(newCpCounts)

    } catch (err) {
      console.error('[Dashboard] error:', err)
      if (err.code === 'BAD_DATA' || err.message?.includes('0x')) {
        setError('Contract returned no data — make sure MetaMask is on Sepolia Testnet.')
      } else {
        setError(`Failed to load: ${err.reason || err.message || 'Unknown error'}`)
      }
    } finally {
      setLoading(false)
    }
  }

  // ── Role detection ───────────────────────────────────────────────────────────
  const acc = account?.toLowerCase() ?? ''
  const isManufacturer = acc && batches.some(b => (b.manufacturer?.toLowerCase?.() ?? '') === acc)
  const isHandler      = acc && batches.some(b =>
    (cpMap[b.id] || []).some(cp => (cp.handlerAddress?.toLowerCase?.() ?? '') === acc)
  )

  // ── Filtered batch sets ──────────────────────────────────────────────────────
  const myBatches    = batches.filter(b => (b.manufacturer?.toLowerCase?.() ?? '') === acc)
  const handledBatches = batches.filter(b =>
    (cpMap[b.id] || []).some(cp => (cp.handlerAddress?.toLowerCase?.() ?? '') === acc)
  )

  // ── Stats ────────────────────────────────────────────────────────────────────
  const total       = batches.length
  const safe        = batches.filter(b => !b.isCompromised).length
  const compromised = batches.filter(b => b.isCompromised).length
  const totalCps    = Object.values(cpCounts).reduce((s, n) => s + n, 0)

  // ── All Batches filter ───────────────────────────────────────────────────────
  const displayed = batches.filter(b => {
    if (filter === 'safe')        return !b.isCompromised
    if (filter === 'compromised') return b.isCompromised
    if (filter === 'mine')        return acc && (
      (b.manufacturer?.toLowerCase?.() ?? '') === acc ||
      (cpMap[b.id] || []).some(cp => (cp.handlerAddress?.toLowerCase?.() ?? '') === acc)
    )
    return true
  })

  const FILTER_TABS = [
    { id:'all',         label:`All (${total})` },
    { id:'safe',        label:`✅ Safe (${safe})` },
    { id:'compromised', label:`❌ Compromised (${compromised})` },
    { id:'mine',        label:'🔐 My Batches' },
  ]

  // ── Role banner config ───────────────────────────────────────────────────────
  const roleBanner = !acc ? {
    bg:'#f8fafc', border:'#e2e8f0', icon:'🌐', title:'Viewing all public batches',
    sub:'Connect your wallet to see your role-specific view.',
  } : isManufacturer && isHandler ? {
    bg:'#faf5ff', border:'#c4b5fd', icon:'⭐', title:'You are a Manufacturer and Handler',
    sub:'Showing all your activity below.',
  } : isManufacturer ? {
    bg:'#eff6ff', border:'#bfdbfe', icon:'🏭', title:'You are connected as a Manufacturer',
    sub:'Batches you registered are highlighted below.',
  } : isHandler ? {
    bg:'#f0fdf4', border:'#bbf7d0', icon:'🔧', title:'You are connected as a Handler',
    sub:'Batches you have logged checkpoints for are shown below.',
  } : {
    bg:'#f8fafc', border:'#e2e8f0', icon:'👤', title:'Wallet connected — no activity yet',
    sub:'Register a batch or log a checkpoint to appear here.',
  }

  // ── No wallet gate ───────────────────────────────────────────────────────────
  if (!account || !contract) {
    return (
      <div>
        <DashboardHeader loading={loading} onRefresh={() => {}} />
        <StatsRow total={total} safe={safe} compromised={compromised} totalCps={totalCps} loading={loading} />
        <div style={{ background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:12, padding:'14px 18px', marginBottom:20 }}>
          <span style={{ fontSize:'1.1rem' }}>🌐</span>
          {' '}<strong>Connect your wallet</strong> to load the dashboard.
          <br/><span style={{ fontSize:'0.8rem', color:'var(--cc-muted)' }}>Ensure MetaMask is on Sepolia Testnet.</span>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* ── Header ── */}
      <DashboardHeader loading={loading} onRefresh={loadDashboard} />

      {/* ── Stats row ── */}
      <StatsRow total={total} safe={safe} compromised={compromised} totalCps={totalCps} loading={loading} />

      {/* ── Role banner ── */}
      <div style={{
        background: roleBanner.bg, border: `1px solid ${roleBanner.border}`,
        borderRadius:12, padding:'14px 20px', marginBottom:24,
        display:'flex', alignItems:'flex-start', gap:12
      }}>
        <span style={{ fontSize:'1.4rem', lineHeight:1 }}>{roleBanner.icon}</span>
        <div>
          <div style={{ fontWeight:700, color:'var(--cc-text)', fontSize:'0.9rem' }}>{roleBanner.title}</div>
          <div style={{ fontSize:'0.78rem', color:'var(--cc-muted)', marginTop:2 }}>{roleBanner.sub}</div>
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div style={{ background:'#fef3c7', border:'1px solid #fde68a', borderRadius:10,
          padding:'12px 16px', marginBottom:20, fontSize:'0.84rem', color:'#92400e' }}>
          ⚠ {error}
        </div>
      )}

      {/* ── Loading skeleton ── */}
      {loading && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:14 }}>
          {[1,2,3].map(i => (
            <div key={i} style={{ background:'var(--cc-slate-2)', borderRadius:12, height:140, animation:'pulse2 1.5s infinite' }} />
          ))}
        </div>
      )}

      {!loading && (
        <>
          {/* ════════════════════════════════════════════════
              SECTION: MY REGISTERED BATCHES (Manufacturer)
          ════════════════════════════════════════════════ */}
          {isManufacturer && myBatches.length > 0 && (
            <section style={{ marginBottom:32 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
                <span style={{ fontSize:'1.2rem' }}>🏭</span>
                <h3 style={{ fontWeight:700, fontSize:'1rem', color:'var(--cc-text)', margin:0 }}>
                  My Registered Batches
                </h3>
                <span className="cc-badge" style={{ background:'#eff6ff', color:'#1d4ed8' }}>
                  {myBatches.length}
                </span>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:16 }}>
                {myBatches.map(b => {
                  const cps     = cpMap[b.id] || []
                  const lastCp  = cps[cps.length - 1]
                  return (
                    <div key={b.id} className="cc-card animate-fadeIn"
                      style={{ padding:20, position:'relative', overflow:'hidden',
                        borderTop:'3px solid var(--cc-indigo)' }}>

                      {/* Header */}
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
                            <span>{TYPE_ICONS[b.productType]||'📦'}</span>
                            <span style={{ fontSize:'0.92rem', fontWeight:700, color:'var(--cc-text)' }}>{b.productName}</span>
                          </div>
                          <code style={{ fontSize:'0.72rem', color:'var(--cc-indigo)', background:'#ede9fe', borderRadius:5, padding:'2px 7px' }}>{b.id}</code>
                        </div>
                        <span className="cc-badge" style={b.isCompromised
                          ?{background:'#fee2e2',color:'#b91c1c',marginLeft:8}
                          :{background:'#dcfce7',color:'#15803d',marginLeft:8}}>
                          {b.isCompromised?'❌ Compromised':'✅ Safe'}
                        </span>
                      </div>

                      {/* Journey progress */}
                      <JourneyProgress checkpoints={cps} />

                      {/* Last checkpoint summary */}
                      <div style={{ background:'#f8fafc', borderRadius:8, padding:'8px 12px',
                        fontSize:'0.78rem', color:'var(--cc-muted)', marginBottom:12 }}>
                        {lastCp ? (
                          <>
                            <strong>Last update:</strong>{' '}
                            <span style={{ color:'var(--cc-text)' }}>
                              {ROLE_ICONS[lastCp.handlerRole]} {lastCp.handlerRole} logged {lastCp.temperature}°C at {lastCp.location}
                            </span>
                            {lastCp.isBreach && <span style={{ color:'#b91c1c' }}> — ⚠ Breach</span>}
                          </>
                        ) : (
                          <span>No checkpoints yet</span>
                        )}
                      </div>

                      {/* Footer actions */}
                      <div style={{ display:'flex', gap:8 }}>
                        <button onClick={() => setQrModalBatch(b.id)} className="cc-btn cc-btn-ghost"
                          style={{ flex:1, justifyContent:'center', fontSize:'0.78rem', padding:'6px 10px' }}>
                          📷 Show QR
                        </button>
                        <span style={{ fontSize:'0.75rem', color:'var(--cc-muted)', alignSelf:'center' }}>
                          {cpCounts[b.id] ?? 0} checkpoint{cpCounts[b.id] !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* ════════════════════════════════════════════════
              SECTION: BATCHES I HAVE HANDLED (Handler)
          ════════════════════════════════════════════════ */}
          {isHandler && handledBatches.length > 0 && (
            <section style={{ marginBottom:32 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
                <span style={{ fontSize:'1.2rem' }}>🔧</span>
                <h3 style={{ fontWeight:700, fontSize:'1rem', color:'var(--cc-text)', margin:0 }}>
                  Batches I Have Handled
                </h3>
                <span className="cc-badge" style={{ background:'#f0fdf4', color:'#15803d' }}>
                  {handledBatches.length}
                </span>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:16 }}>
                {handledBatches.map(b => {
                  const cps    = cpMap[b.id] || []
                  const myCps  = cps.filter(cp => (cp.handlerAddress?.toLowerCase?.() ?? '') === acc)
                  const hadBreach = myCps.some(cp => cp.isBreach)
                  return (
                    <div key={b.id} className="cc-card animate-fadeIn"
                      style={{ padding:20, position:'relative', overflow:'hidden',
                        borderTop:'3px solid #22c55e' }}>

                      {/* Header */}
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
                            <span>{TYPE_ICONS[b.productType]||'📦'}</span>
                            <span style={{ fontSize:'0.92rem', fontWeight:700, color:'var(--cc-text)' }}>{b.productName}</span>
                          </div>
                          <code style={{ fontSize:'0.72rem', color:'var(--cc-indigo)', background:'#ede9fe', borderRadius:5, padding:'2px 7px' }}>{b.id}</code>
                        </div>
                        <span className="cc-badge" style={b.isCompromised
                          ?{background:'#fee2e2',color:'#b91c1c',marginLeft:8}
                          :{background:'#dcfce7',color:'#15803d',marginLeft:8}}>
                          {b.isCompromised?'❌ Compromised':'✅ Safe'}
                        </span>
                      </div>

                      {/* Breach warning */}
                      {hadBreach && (
                        <div style={{ background:'#fee2e2', border:'1px solid #fecaca', borderRadius:8,
                          padding:'8px 12px', fontSize:'0.78rem', color:'#b91c1c', marginBottom:10 }}>
                          ⚠️ One of your logged readings triggered a temperature breach
                        </div>
                      )}

                      {/* My contributions */}
                      <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:8,
                        padding:'10px 12px', marginBottom:12 }}>
                        <div style={{ fontSize:'0.73rem', fontWeight:700, color:'#15803d', marginBottom:8, textTransform:'uppercase', letterSpacing:'.04em' }}>
                          My Contributions
                        </div>
                        {myCps.map((cp, i) => (
                          <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:8,
                            paddingBottom: i < myCps.length-1 ? 8 : 0,
                            marginBottom: i < myCps.length-1 ? 8 : 0,
                            borderBottom: i < myCps.length-1 ? '1px solid #dcfce7' : 'none' }}>
                            <span className="cc-badge" style={{
                              background: ROLE_COLORS[cp.handlerRole]?.bg || '#f1f5f9',
                              color: ROLE_COLORS[cp.handlerRole]?.text || '#475569',
                              flexShrink:0, fontSize:'0.68rem'
                            }}>
                              {ROLE_ICONS[cp.handlerRole]} {cp.handlerRole}
                            </span>
                            <div style={{ fontSize:'0.75rem', color:'var(--cc-text)' }}>
                              <span style={{ fontWeight:700, color: cp.isBreach?'#b91c1c':'#15803d' }}>
                                {cp.temperature}°C
                              </span>
                              {' at '}{cp.location}
                              <span style={{ color:'var(--cc-muted)', display:'block', fontSize:'0.7rem' }}>
                                {fmtTime(cp.timestamp)} · {cp.isBreach ? '⚠ Breach' : '✓ Safe'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>

                      <button onClick={() => setQrModalBatch(b.id)} className="cc-btn cc-btn-ghost"
                        style={{ width:'100%', justifyContent:'center', fontSize:'0.78rem', padding:'6px 12px' }}>
                        📷 Show QR
                      </button>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* ════════════════════════════════════════════════
              SECTION: ALL REGISTERED BATCHES
          ════════════════════════════════════════════════ */}
          <section>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14, flexWrap:'wrap', gap:8 }}>
              <h3 style={{ fontWeight:700, fontSize:'1rem', color:'var(--cc-text)', margin:0 }}>
                {acc ? 'All Registered Batches' : 'All Batches'}
              </h3>
            </div>

            {/* Filter tabs */}
            <div style={{ display:'flex', gap:6, marginBottom:20, flexWrap:'wrap' }}>
              {FILTER_TABS.map(ft => (
                <button key={ft.id} onClick={() => setFilter(ft.id)} style={{
                  padding:'6px 14px', borderRadius:99, fontSize:'0.8rem', fontWeight:600,
                  border:'1.5px solid', cursor:'pointer', fontFamily:'inherit',
                  borderColor: filter===ft.id ? 'var(--cc-indigo)' : 'var(--cc-border)',
                  background:  filter===ft.id ? 'var(--cc-indigo)' : 'white',
                  color:       filter===ft.id ? 'white' : 'var(--cc-muted)',
                  transition:'all .14s',
                }}>
                  {ft.label}
                </button>
              ))}
            </div>

            {/* Empty state */}
            {displayed.length === 0 && !error && (
              <div className="cc-card" style={{ padding:48, textAlign:'center' }}>
                <div style={{ fontSize:48, marginBottom:12 }}>📭</div>
                <h3 style={{ fontWeight:700, color:'var(--cc-text)', marginBottom:8 }}>
                  {filter==='mine' ? 'No activity for your wallet' : 'No batches registered yet'}
                </h3>
                <p style={{ fontSize:'0.85rem', color:'var(--cc-muted)' }}>
                  {filter==='mine'
                    ? 'Register a batch or log a checkpoint to appear here.'
                    : 'Be the first to register a batch using the Register Batch tab.'}
                </p>
              </div>
            )}

            {/* Batch grid */}
            {displayed.length > 0 && (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(290px,1fr))', gap:16 }}>
                {displayed.map((b, i) => (
                  <div key={b.id} style={{ animationDelay:`${i*0.04}s` }}>
                    <BatchCard
                      b={b}
                      account={account}
                      cpCount={cpCounts[b.id]}
                      onShowQR={setQrModalBatch}
                    />
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {/* ── QR Modal ── */}
      {qrModalBatch && <QRModal batchId={qrModalBatch} onClose={() => setQrModalBatch(null)} />}
    </div>
  )
}

// ── Sub-components (kept local, no extra files) ───────────────────────────────

function DashboardHeader({ loading, onRefresh }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:12 }}>
      <div>
        <h2 style={{ fontSize:'1.25rem', fontWeight:700, color:'var(--cc-text)' }}>Dashboard</h2>
        <p style={{ fontSize:'0.85rem', color:'var(--cc-muted)', marginTop:4 }}>
          All batches on Ethereum Sepolia · Updates live from blockchain
        </p>
      </div>
      <button onClick={onRefresh} className="cc-btn cc-btn-ghost"
        disabled={loading} style={{ gap:6, fontSize:'0.82rem' }}>
        {loading
          ? <div className="cc-spinner" style={{ width:14, height:14, borderTopColor:'var(--cc-indigo)', borderColor:'#e2e8f0' }} />
          : '↻'}
        Refresh
      </button>
    </div>
  )
}

function StatsRow({ total, safe, compromised, totalCps, loading }) {
  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))', gap:14, marginBottom:20 }}>
      {[
        { label:'Total Batches',     value:total,       color:'var(--cc-indigo)', icon:'📦' },
        { label:'Safe',              value:safe,        color:'#16a34a',           icon:'✅' },
        { label:'Compromised',       value:compromised, color:'#dc2626',           icon:'❌' },
        { label:'Total Checkpoints', value:totalCps,    color:'var(--cc-cyan)',    icon:'🌡' },
      ].map(s => (
        <div key={s.label} style={{ background:'white', border:'1px solid var(--cc-border)',
          borderRadius:12, padding:'16px 18px', boxShadow:'var(--shadow-sm)' }}>
          <div style={{ fontSize:'0.75rem', fontWeight:600, color:'var(--cc-muted)', marginBottom:6,
            textTransform:'uppercase', letterSpacing:'.04em' }}>
            {s.icon} {s.label}
          </div>
          <div style={{ fontSize:'1.8rem', fontWeight:800, color:s.color, lineHeight:1 }}>
            {loading ? '—' : s.value}
          </div>
        </div>
      ))}
    </div>
  )
}
