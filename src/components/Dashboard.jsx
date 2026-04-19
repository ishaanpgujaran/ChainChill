import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../contractConfig'
import { QRCodeCanvas } from 'qrcode.react'
import {
  LayoutDashboard, Package, ShieldCheck, ShieldAlert, Activity,
  Building2, Wrench, Globe, Star, UserCircle,
  Factory, Warehouse, Truck, Store,
  QrCode, Download, ExternalLink, RefreshCw,
  CheckCircle2, XCircle, AlertTriangle, Clock,
} from 'lucide-react'

// ── Type metadata ──────────────────────────────────────────────────────────────
const TYPE_DOT_COLOR = {
  pharma:        '#3b82f6',
  frozen:        '#6366f1',
  fresh:         '#22c55e',
  quickcommerce: '#f97316',
}
const TYPE_LABELS = {
  pharma:        'Pharma / Vaccines',
  frozen:        'Frozen Food',
  fresh:         'Fresh / Dairy',
  quickcommerce: 'Quick Commerce',
}

function TypeDot({ type }) {
  return (
    <span style={{
      display: 'inline-block', width: 10, height: 10, borderRadius: '50%',
      background: TYPE_DOT_COLOR[type] || '#94a3b8', flexShrink: 0,
    }} />
  )
}

// ── Role metadata ──────────────────────────────────────────────────────────────
const ROLE_COLORS = {
  manufacturer: { bg: '#ede9fe', text: '#6d28d9' },
  warehouse:    { bg: '#dbeafe', text: '#1d4ed8' },
  transporter:  { bg: '#fef3c7', text: '#d97706' },
  receiver:     { bg: '#dcfce7', text: '#15803d' },
}

// ── Journey roles ──────────────────────────────────────────────────────────────
const JOURNEY_ROLES = [
  { key: 'manufacturer', label: 'Manufacturer', Icon: Factory,   match: 'manufacturer' },
  { key: 'warehouse',    label: 'Warehouse',    Icon: Warehouse, match: 'warehouse'    },
  { key: 'transporter',  label: 'Transporter',  Icon: Truck,     match: 'transporter'  },
  { key: 'receiver',     label: 'Receiver',     Icon: Store,     match: 'receiver'     },
]

// ── Helpers ───────────────────────────────────────────────────────────────────
function shortAddr(addr) { return addr ? `${addr.slice(0,6)}…${addr.slice(-4)}` : '' }
function fmtDate(ts)     { return ts ? new Date(ts*1000).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}) : '—' }
function fmtTime(ts)     { return ts ? new Date(ts*1000).toLocaleString('en-IN',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '—' }

// ── Download QR ────────────────────────────────────────────────────────────────
function doDownloadQR(batchId, canvasId) {
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
    <div onClick={onClose} style={{
      position:'fixed', inset:0, background:'rgba(0,0,0,0.55)',
      zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background:'white', borderRadius:20, padding:32,
        maxWidth:320, width:'90%', textAlign:'center',
        boxShadow:'0 25px 60px rgba(0,0,0,0.25)',
      }}>
        <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:8 }}>
          <button onClick={onClose} style={{
            background:'none', border:'none', fontSize:20, cursor:'pointer',
            color:'var(--cc-muted)', lineHeight:1,
          }}>X</button>
        </div>
        <div style={{ display:'flex', justifyContent:'center', marginBottom:14 }}>
          <QRCodeCanvas id={canvasId} value={batchId} size={180}
            bgColor="white" fgColor="#0f172a" level="H" />
        </div>
        <p style={{ fontSize:'0.78rem', color:'var(--cc-muted)', marginBottom:14 }}>
          Batch ID: <span style={{ fontFamily:'monospace', color:'var(--cc-indigo)', fontWeight:600 }}>{batchId}</span>
        </p>
        <button onClick={() => doDownloadQR(batchId, canvasId)}
          className="cc-btn cc-btn-ghost"
          style={{ width:'100%', justifyContent:'center', fontSize:'0.82rem', gap:6 }}>
          <Download size={14} /> Download QR Code
        </button>
      </div>
    </div>
  )
}

// ── Journey Progress ──────────────────────────────────────────────────────────
function JourneyProgress({ checkpoints }) {
  // CHANGE SET 1 FIX:
  // 1. Manufacturer step is ALWAYS complete — registering the batch IS the manufacturer step
  // 2. All other roles use case-insensitive .includes() to avoid strict-match failures
  const rolesLogged = new Set((checkpoints || []).map(cp => cp.handlerRole?.toLowerCase() ?? ''))

  return (
    <div style={{ display:'flex', alignItems:'center', gap:4, flexWrap:'wrap', marginTop:10, marginBottom:8 }}>
      {JOURNEY_ROLES.map((role, i) => {
        // Manufacturer is always done; others use case-insensitive includes
        const done = role.key === 'manufacturer'
          ? true
          : Array.from(rolesLogged).some(r => r.includes(role.match))

        const colors = ROLE_COLORS[role.key] || { bg:'#f1f5f9', text:'#475569' }
        return (
          <span key={role.key} style={{ display:'flex', alignItems:'center', gap:4 }}>
            <span style={{
              display:'flex', alignItems:'center', gap:4,
              fontSize:'0.72rem', fontWeight:600, padding:'3px 8px', borderRadius:99,
              background: done ? colors.bg : '#f8fafc',
              color:      done ? colors.text : '#94a3b8',
              border:     `1px solid ${done ? 'transparent' : '#e2e8f0'}`,
            }}>
              <role.Icon size={11} />
              {role.label}
              {done
                ? <CheckCircle2 size={11} style={{ color:'#16a34a' }} />
                : <Clock size={11} style={{ color:'#d1d5db' }} />}
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

// ── Batch Card (All Batches section) ──────────────────────────────────────────
function BatchCard({ b, account, cpCount, onShowQR }) {
  const isMine  = account && (b.manufacturer?.toLowerCase?.() ?? '') === account.toLowerCase()
  const expired = b.expiryDate < Math.floor(Date.now()/1000)
  return (
    <div className="cc-card animate-fadeIn" style={{ padding:20, position:'relative', overflow:'hidden' }}>
      {isMine && (
        <div style={{ position:'absolute', top:0, left:0, right:0, height:3,
          background:'linear-gradient(90deg, var(--cc-indigo), var(--cc-cyan))' }} />
      )}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
            <TypeDot type={b.productType} />
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
          ? { background:'#fee2e2', color:'#b91c1c', marginLeft:8, display:'flex', alignItems:'center', gap:4 }
          : { background:'#dcfce7', color:'#15803d', marginLeft:8, display:'flex', alignItems:'center', gap:4 }}>
          {b.isCompromised
            ? <><XCircle size={12} /> Compromised</>
            : <><CheckCircle2 size={12} /> Safe</>}
        </span>
      </div>

      <div style={{ fontSize:'0.79rem', color:'var(--cc-muted)', display:'flex', flexDirection:'column', gap:4, marginBottom:12 }}>
        <div style={{ display:'flex', justifyContent:'space-between' }}>
          <span>Type</span>
          <span style={{ color:'var(--cc-text)', fontWeight:600, display:'flex', alignItems:'center', gap:5 }}>
            <TypeDot type={b.productType} />{TYPE_LABELS[b.productType] || b.productType}
          </span>
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
          <span style={{ color: expired?'#dc2626':'var(--cc-text)', fontWeight:600, display:'flex', alignItems:'center', gap:4 }}>
            {expired && <AlertTriangle size={12} style={{ color:'#dc2626' }} />}
            {fmtDate(b.expiryDate)}
          </span>
        </div>
        <div style={{ display:'flex', justifyContent:'space-between' }}>
          <span>Manufacturer</span>
          <a href={`https://sepolia.etherscan.io/address/${b.manufacturer}`}
            target="_blank" rel="noopener noreferrer"
            style={{ color:'var(--cc-indigo)', fontFamily:'monospace', fontSize:'0.72rem', display:'flex', alignItems:'center', gap:3 }}>
            {isMine ? 'You' : shortAddr(b.manufacturer)} <ExternalLink size={11} />
          </a>
        </div>
      </div>

      <button onClick={() => onShowQR(b.id)} className="cc-btn cc-btn-ghost"
        style={{ width:'100%', justifyContent:'center', fontSize:'0.78rem', padding:'6px 12px', gap:5 }}>
        <QrCode size={14} /> Show QR
      </button>
    </div>
  )
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────
export default function Dashboard({ contract, readContract, account }) {
  const [batches,      setBatches]      = useState([])
  const [cpMap,        setCpMap]        = useState({})
  const [cpCounts,     setCpCounts]     = useState({})
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState('')
  const [filter,       setFilter]       = useState('all')
  const [qrModalBatch, setQrModalBatch] = useState(null)

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

      const [batchResults, cpResults] = await Promise.all([
        Promise.all(ids.map(id =>
          rc.getBatch(id).then(data => ({
            id,
            productName:   (data[0] ?? data.productName  ?? '').toString(),
            productType:   (data[1] ?? data.productType  ?? '').toString(),
            minTemp:       Number(data[2] ?? data.minTemp   ?? 0),
            maxTemp:       Number(data[3] ?? data.maxTemp   ?? 0),
            expiryDate:    Number(data[4] ?? data.expiryDate ?? 0),
            manufacturer:  (data[5] ?? data.manufacturer ?? '').toString(),
            isCompromised: !!(data[6] ?? data.isCompromised),
            createdAt:     Number(data[7] ?? data.createdAt ?? 0),
          })).catch(() => null)
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
      setBatches(valid)

      const newCpMap = {}, newCpCounts = {}
      cpResults.forEach(([id, cps]) => { newCpMap[id] = cps; newCpCounts[id] = cps.length })
      setCpMap(newCpMap); setCpCounts(newCpCounts)

    } catch (err) {
      console.error('[Dashboard] error:', err)
      setError(err.code === 'BAD_DATA' || err.message?.includes('0x')
        ? 'Contract returned no data — ensure MetaMask is on Sepolia Testnet.'
        : `Failed to load: ${err.reason || err.message || 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  // ── Role detection ────────────────────────────────────────────────────────────
  const acc = account?.toLowerCase() ?? ''
  const isManufacturer = !!acc && batches.some(b => (b.manufacturer?.toLowerCase?.() ?? '') === acc)
  const isHandler      = !!acc && batches.some(b =>
    (cpMap[b.id] || []).some(cp => (cp.handlerAddress?.toLowerCase?.() ?? '') === acc)
  )
  const myBatches      = batches.filter(b => (b.manufacturer?.toLowerCase?.() ?? '') === acc)
  const handledBatches = batches.filter(b =>
    (cpMap[b.id] || []).some(cp => (cp.handlerAddress?.toLowerCase?.() ?? '') === acc)
  )

  // ── Stats ─────────────────────────────────────────────────────────────────────
  const total = batches.length
  const safe  = batches.filter(b => !b.isCompromised).length
  const comp  = batches.filter(b =>  b.isCompromised).length
  const totalCps = Object.values(cpCounts).reduce((s, n) => s + n, 0)

  // ── Filter ────────────────────────────────────────────────────────────────────
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
    { id:'safe',        label:`Safe (${safe})` },
    { id:'compromised', label:`Compromised (${comp})` },
    { id:'mine',        label:'My Batches' },
  ]

  // ── Role banner ───────────────────────────────────────────────────────────────
  const roleBanner = !acc ? {
    bg:'#f8fafc', border:'#e2e8f0', Icon:Globe,       title:'Viewing all public batches',
    sub:'Connect your wallet to see your role-specific view.',
  } : isManufacturer && isHandler ? {
    bg:'#faf5ff', border:'#c4b5fd', Icon:Star,        title:'You are a Manufacturer and Handler',
    sub:'Showing all your activity below.',
  } : isManufacturer ? {
    bg:'#eff6ff', border:'#bfdbfe', Icon:Building2,   title:'You are connected as a Manufacturer',
    sub:'Batches you registered are highlighted below.',
  } : isHandler ? {
    bg:'#f0fdf4', border:'#bbf7d0', Icon:Wrench,      title:'You are connected as a Handler',
    sub:'Batches you have logged checkpoints for are shown below.',
  } : {
    bg:'#f8fafc', border:'#e2e8f0', Icon:UserCircle,  title:'Wallet connected — no activity yet',
    sub:'Register a batch or log a checkpoint to appear here.',
  }

  // ── No-wallet gate ────────────────────────────────────────────────────────────
  if (!account || !contract) {
    return (
      <div>
        <DashHeader loading={loading} onRefresh={() => {}} />
        <StatsRow total={0} safe={0} comp={0} totalCps={0} loading={false} />
        <div style={{ background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:12,
          padding:'16px 20px', display:'flex', alignItems:'flex-start', gap:12 }}>
          <Globe size={20} style={{ color:'#94a3b8', flexShrink:0, marginTop:2 }} />
          <div>
            <div style={{ fontWeight:700, color:'var(--cc-text)', fontSize:'0.9rem' }}>
              Connect your wallet to load the dashboard
            </div>
            <div style={{ fontSize:'0.78rem', color:'var(--cc-muted)', marginTop:2 }}>
              Click "Connect MetaMask" and ensure you're on Sepolia Testnet.
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <DashHeader loading={loading} onRefresh={loadDashboard} />
      <StatsRow total={total} safe={safe} comp={comp} totalCps={totalCps} loading={loading} />

      {/* Role banner */}
      <div style={{
        background: roleBanner.bg, border:`1px solid ${roleBanner.border}`,
        borderRadius:12, padding:'14px 20px', marginBottom:24,
        display:'flex', alignItems:'flex-start', gap:12,
      }}>
        <roleBanner.Icon size={20} style={{ flexShrink:0, marginTop:2, color:'var(--cc-muted)' }} />
        <div>
          <div style={{ fontWeight:700, color:'var(--cc-text)', fontSize:'0.9rem' }}>{roleBanner.title}</div>
          <div style={{ fontSize:'0.78rem', color:'var(--cc-muted)', marginTop:2 }}>{roleBanner.sub}</div>
        </div>
      </div>

      {error && (
        <div style={{ background:'#fef3c7', border:'1px solid #fde68a', borderRadius:10,
          padding:'12px 16px', marginBottom:20, fontSize:'0.84rem', color:'#92400e',
          display:'flex', alignItems:'center', gap:8 }}>
          <AlertTriangle size={14} style={{ flexShrink:0 }} /> {error}
        </div>
      )}

      {loading && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:14 }}>
          {[1,2,3].map(i => (
            <div key={i} style={{ background:'var(--cc-slate-2)', borderRadius:12, height:140, animation:'pulse2 1.5s infinite' }} />
          ))}
        </div>
      )}

      {!loading && (<>

        {/* ── Manufacturer section ── */}
        {isManufacturer && myBatches.length > 0 && (
          <section style={{ marginBottom:32 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
              <Building2 size={18} style={{ color:'var(--cc-indigo)' }} />
              <h3 style={{ fontWeight:700, fontSize:'1rem', color:'var(--cc-text)', margin:0 }}>
                My Registered Batches
              </h3>
              <span className="cc-badge" style={{ background:'#eff6ff', color:'#1d4ed8' }}>{myBatches.length}</span>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:16 }}>
              {myBatches.map(b => {
                const cps    = cpMap[b.id] || []
                const lastCp = cps[cps.length - 1]
                return (
                  <div key={b.id} className="cc-card animate-fadeIn"
                    style={{ padding:20, position:'relative', overflow:'hidden', borderTop:'3px solid var(--cc-indigo)' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
                          <TypeDot type={b.productType} />
                          <span style={{ fontSize:'0.92rem', fontWeight:700, color:'var(--cc-text)' }}>{b.productName}</span>
                        </div>
                        <code style={{ fontSize:'0.72rem', color:'var(--cc-indigo)', background:'#ede9fe', borderRadius:5, padding:'2px 7px' }}>{b.id}</code>
                      </div>
                      <span className="cc-badge" style={b.isCompromised
                        ?{background:'#fee2e2',color:'#b91c1c',marginLeft:8,display:'flex',alignItems:'center',gap:3}
                        :{background:'#dcfce7',color:'#15803d',marginLeft:8,display:'flex',alignItems:'center',gap:3}}>
                        {b.isCompromised ? <><XCircle size={12}/>Compromised</> : <><CheckCircle2 size={12}/>Safe</>}
                      </span>
                    </div>
                    <JourneyProgress checkpoints={cps} />
                    <div style={{ background:'#f8fafc', borderRadius:8, padding:'8px 12px',
                      fontSize:'0.78rem', color:'var(--cc-muted)', marginBottom:12 }}>
                      {lastCp ? (
                        <span>
                          <strong style={{ color:'var(--cc-text)' }}>Last:</strong>{' '}
                          {lastCp.handlerRole} logged {lastCp.temperature}°C at {lastCp.location}
                          {lastCp.isBreach && <span style={{ color:'#b91c1c' }}> — Breach</span>}
                        </span>
                      ) : 'No checkpoints yet'}
                    </div>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}>
                      <button onClick={() => setQrModalBatch(b.id)} className="cc-btn cc-btn-ghost"
                        style={{ flex:1, justifyContent:'center', fontSize:'0.78rem', padding:'6px 10px', gap:5 }}>
                        <QrCode size={13} /> Show QR
                      </button>
                      <span style={{ fontSize:'0.75rem', color:'var(--cc-muted)', whiteSpace:'nowrap' }}>
                        {cpCounts[b.id] ?? 0} checkpoint{cpCounts[b.id] !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* ── Handler section ── */}
        {isHandler && handledBatches.length > 0 && (
          <section style={{ marginBottom:32 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
              <Wrench size={18} style={{ color:'#16a34a' }} />
              <h3 style={{ fontWeight:700, fontSize:'1rem', color:'var(--cc-text)', margin:0 }}>
                Batches I Have Handled
              </h3>
              <span className="cc-badge" style={{ background:'#f0fdf4', color:'#15803d' }}>{handledBatches.length}</span>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:16 }}>
              {handledBatches.map(b => {
                const cps      = cpMap[b.id] || []
                const myCps    = cps.filter(cp => (cp.handlerAddress?.toLowerCase?.() ?? '') === acc)
                const hadBreach = myCps.some(cp => cp.isBreach)
                return (
                  <div key={b.id} className="cc-card animate-fadeIn"
                    style={{ padding:20, position:'relative', overflow:'hidden', borderTop:'3px solid #22c55e' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
                          <TypeDot type={b.productType} />
                          <span style={{ fontSize:'0.92rem', fontWeight:700, color:'var(--cc-text)' }}>{b.productName}</span>
                        </div>
                        <code style={{ fontSize:'0.72rem', color:'var(--cc-indigo)', background:'#ede9fe', borderRadius:5, padding:'2px 7px' }}>{b.id}</code>
                      </div>
                      <span className="cc-badge" style={b.isCompromised
                        ?{background:'#fee2e2',color:'#b91c1c',marginLeft:8,display:'flex',alignItems:'center',gap:3}
                        :{background:'#dcfce7',color:'#15803d',marginLeft:8,display:'flex',alignItems:'center',gap:3}}>
                        {b.isCompromised ? <><XCircle size={12}/>Compromised</> : <><CheckCircle2 size={12}/>Safe</>}
                      </span>
                    </div>
                    {hadBreach && (
                      <div style={{ background:'#fee2e2', border:'1px solid #fecaca', borderRadius:8,
                        padding:'8px 12px', fontSize:'0.78rem', color:'#b91c1c', marginBottom:10,
                        display:'flex', alignItems:'center', gap:6 }}>
                        <AlertTriangle size={13} /> One of your logged readings triggered a temperature breach
                      </div>
                    )}
                    <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:8,
                      padding:'10px 12px', marginBottom:12 }}>
                      <div style={{ fontSize:'0.72rem', fontWeight:700, color:'#15803d', marginBottom:8,
                        textTransform:'uppercase', letterSpacing:'.04em' }}>
                        My Contributions
                      </div>
                      {myCps.map((cp, i) => (
                        <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:8,
                          paddingBottom: i < myCps.length-1 ? 8 : 0,
                          marginBottom:  i < myCps.length-1 ? 8 : 0,
                          borderBottom:  i < myCps.length-1 ? '1px solid #dcfce7' : 'none' }}>
                          <span className="cc-badge" style={{
                            background: ROLE_COLORS[cp.handlerRole]?.bg || '#f1f5f9',
                            color:      ROLE_COLORS[cp.handlerRole]?.text || '#475569',
                            flexShrink:0, fontSize:'0.68rem',
                          }}>
                            {cp.handlerRole}
                          </span>
                          <div style={{ fontSize:'0.75rem', color:'var(--cc-text)' }}>
                            <span style={{ fontWeight:700, color: cp.isBreach?'#b91c1c':'#15803d' }}>
                              {cp.temperature}°C
                            </span>
                            {' at '}{cp.location}
                            <span style={{ color:'var(--cc-muted)', display:'block', fontSize:'0.7rem' }}>
                              {fmtTime(cp.timestamp)} · {cp.isBreach ? 'Breach' : 'Safe'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <button onClick={() => setQrModalBatch(b.id)} className="cc-btn cc-btn-ghost"
                      style={{ width:'100%', justifyContent:'center', fontSize:'0.78rem', padding:'6px 12px', gap:5 }}>
                      <QrCode size={13} /> Show QR
                    </button>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* ── All Batches ── */}
        <section>
          <div style={{ marginBottom:14 }}>
            <h3 style={{ fontWeight:700, fontSize:'1rem', color:'var(--cc-text)', margin:0 }}>
              {acc ? 'All Registered Batches' : 'All Batches'}
            </h3>
          </div>
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

          {displayed.length === 0 && !error && (
            <div className="cc-card" style={{ padding:48, textAlign:'center' }}>
              <Package size={48} style={{ color:'#cbd5e1', margin:'0 auto 12px' }} />
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

          {displayed.length > 0 && (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(290px,1fr))', gap:16 }}>
              {displayed.map((b, i) => (
                <div key={b.id} style={{ animationDelay:`${i*0.04}s` }}>
                  <BatchCard b={b} account={account} cpCount={cpCounts[b.id]} onShowQR={setQrModalBatch} />
                </div>
              ))}
            </div>
          )}
        </section>
      </>)}

      {qrModalBatch && <QRModal batchId={qrModalBatch} onClose={() => setQrModalBatch(null)} />}
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────
function DashHeader({ loading, onRefresh }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:12 }}>
      <div>
        <h2 style={{ fontSize:'1.25rem', fontWeight:700, color:'var(--cc-text)', display:'flex', alignItems:'center', gap:8 }}>
          <LayoutDashboard size={20} /> Dashboard
        </h2>
        <p style={{ fontSize:'0.85rem', color:'var(--cc-muted)', marginTop:4 }}>
          All batches on Ethereum Sepolia · Updates live from blockchain
        </p>
      </div>
      <button onClick={onRefresh} className="cc-btn cc-btn-ghost" disabled={loading}
        style={{ gap:6, fontSize:'0.82rem' }}>
        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        Refresh
      </button>
    </div>
  )
}

function StatsRow({ total, safe, comp, totalCps, loading }) {
  const STATS = [
    { label:'Total Batches',     value:total,    color:'var(--cc-indigo)', Icon:Package      },
    { label:'Safe',              value:safe,     color:'#16a34a',           Icon:ShieldCheck  },
    { label:'Compromised',       value:comp,     color:'#dc2626',           Icon:ShieldAlert  },
    { label:'Total Checkpoints', value:totalCps, color:'var(--cc-cyan)',    Icon:Activity     },
  ]
  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))', gap:14, marginBottom:20 }}>
      {STATS.map(s => (
        <div key={s.label} style={{ background:'white', border:'1px solid var(--cc-border)',
          borderRadius:12, padding:'16px 18px', boxShadow:'var(--shadow-sm)' }}>
          <div style={{ fontSize:'0.75rem', fontWeight:600, color:'var(--cc-muted)', marginBottom:6,
            textTransform:'uppercase', letterSpacing:'.04em', display:'flex', alignItems:'center', gap:5 }}>
            <s.Icon size={14} style={{ color:s.color }} /> {s.label}
          </div>
          <div style={{ fontSize:'1.8rem', fontWeight:800, color:s.color, lineHeight:1 }}>
            {loading ? '—' : s.value}
          </div>
        </div>
      ))}
    </div>
  )
}
