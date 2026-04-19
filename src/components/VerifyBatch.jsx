import { useState, useRef, useEffect } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { ethers } from 'ethers'
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../contractConfig'
import {
  CheckCircle2, XCircle, AlertTriangle, ScanSearch,
  Camera, QrCode, Download, ExternalLink,
  Factory, Warehouse as WarehouseIcon, Truck, Store, UserCircle2,
  Package, Thermometer,
} from 'lucide-react'

const TYPE_DOT_COLOR = {
  pharma:'#3b82f6', frozen:'#6366f1', fresh:'#22c55e', quickcommerce:'#f97316',
}
function TypeDot({ type }) {
  return <span style={{ display:'inline-block', width:8, height:8, borderRadius:'50%',
    background: TYPE_DOT_COLOR[type] || '#94a3b8', flexShrink:0 }} />
}

function RoleIcon({ role, size = 11 }) {
  const map = { manufacturer: Factory, warehouse: WarehouseIcon, transporter: Truck, receiver: Store }
  const Icon = map[role?.toLowerCase()] || UserCircle2
  return <Icon size={size} style={{ display:'inline', verticalAlign:'middle' }} />
}

function getReadContract() {
  try {
    if (!window.ethereum) return null
    const p = new ethers.BrowserProvider(window.ethereum)
    return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, p)
  } catch { return null }
}

const ROLE_COLORS = {
  manufacturer: { bg:'#ede9fe', text:'#6d28d9' },
  warehouse:    { bg:'#dbeafe', text:'#1d4ed8' },
  transporter:  { bg:'#fef3c7', text:'#d97706' },
  receiver:     { bg:'#dcfce7', text:'#15803d' },
}

export default function VerifyBatch({ contract, readContract }) {
  const [batchId,     setBatchId]     = useState('')
  const [status,      setStatus]      = useState('idle')
  const [batchData,   setBatchData]   = useState(null)
  const [checkpoints, setCheckpoints] = useState([])
  const [scanActive,  setScanActive]  = useState(false)
  const [errorMsg,    setError]       = useState('')
  const [showQr,      setShowQr]      = useState(false)
  const scannerRef = useRef(null)
  const scanDivId  = 'cc-qr-reader'

  const rc = readContract || getReadContract()

  async function fetchBatch(id) {
    if (!id.trim()) return
    setStatus('loading'); setError(''); setBatchData(null); setCheckpoints([])
    try {
      const exists = await rc.batchExists(id.trim())
      if (!exists) { setStatus('notfound'); return }
      const [batch, cps] = await Promise.all([rc.getBatch(id.trim()), rc.getCheckpoints(id.trim())])
      setBatchData({
        productName: batch.productName, productType: batch.productType,
        minTemp: Number(batch.minTemp), maxTemp: Number(batch.maxTemp),
        expiryDate: Number(batch.expiryDate), manufacturer: batch.manufacturer,
        isCompromised: batch.isCompromised, createdAt: Number(batch.createdAt),
      })
      setCheckpoints(cps.map(cp => ({
        handlerName: cp.handlerName, handlerRole: cp.handlerRole,
        temperature: Number(cp.temperature), location: cp.location,
        handlerAddress: cp.handlerAddress, timestamp: Number(cp.timestamp), isBreach: cp.isBreach,
      })))
      setStatus('found')
    } catch (err) {
      console.error(err)
      setError('Could not fetch batch data. Check your connection or try again.')
      setStatus('error')
    }
  }

  function handleSearch(e) { e.preventDefault(); fetchBatch(batchId) }

  async function startScanner() {
    const { Html5Qrcode } = await import('html5-qrcode')
    setScanActive(true)
    setTimeout(async () => {
      const scanner = new Html5Qrcode(scanDivId)
      scannerRef.current = scanner
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (decoded) => { stopScanner(); setBatchId(decoded); fetchBatch(decoded) },
        () => {}
      )
    }, 150)
  }

  async function stopScanner() {
    if (scannerRef.current) { try { await scannerRef.current.stop() } catch {} scannerRef.current = null }
    setScanActive(false)
  }

  useEffect(() => () => { stopScanner() }, [])

  const fmtDate = ts => new Date(ts*1000).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})
  const fmtTime = ts => new Date(ts*1000).toLocaleString('en-IN',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})
  const short   = addr => addr ? `${addr.slice(0,6)}…${addr.slice(-4)}` : ''
  const ptLabel = t => ({ pharma:'Pharma', frozen:'Frozen Food', fresh:'Fresh / Dairy', quickcommerce:'Quick Commerce' }[t] || t)

  return (
    <div style={{ maxWidth:700, margin:'0 auto' }}>
      <div style={{ marginBottom:24 }}>
        <h2 style={{ fontSize:'1.25rem', fontWeight:700, color:'var(--cc-text)' }}>Verify Batch Safety</h2>
        <p style={{ fontSize:'0.85rem', color:'var(--cc-muted)', marginTop:4 }}>
          Enter a Batch ID or scan its QR code. No wallet required.
        </p>
      </div>

      {/* Search */}
      <div className="cc-card" style={{ padding:24, marginBottom:24 }}>
          <form onSubmit={handleSearch} style={{ display:'flex', gap:10, marginBottom:16 }}>
          <input id="verify-batchId-input" className="cc-input"
            placeholder="Enter Batch ID e.g. BATCH-001"
            value={batchId} onChange={e => setBatchId(e.target.value)} style={{ flex:1 }} />
          <button id="verify-search-btn" type="submit" className="cc-btn cc-btn-primary"
            disabled={status==='loading'||!batchId.trim()}
            style={{ gap:5 }}>
            {status==='loading' ? <div className="cc-spinner" /> : <ScanSearch size={15} />}
            Verify
          </button>
        </form>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
          <div style={{ flex:1, height:1, background:'var(--cc-border)' }} />
          <span style={{ fontSize:'0.75rem', color:'var(--cc-muted)' }}>or scan QR code</span>
          <div style={{ flex:1, height:1, background:'var(--cc-border)' }} />
        </div>
        {!scanActive ? (
          <button id="scan-qr-btn" className="cc-btn cc-btn-ghost"
            onClick={startScanner} style={{ width:'100%', justifyContent:'center', gap:5 }}>
            <Camera size={15} /> Open Camera to Scan QR
          </button>
        ) : (
          <div>
            <div id={scanDivId} style={{ borderRadius:10, overflow:'hidden' }} />
            <button className="cc-btn cc-btn-ghost"
              onClick={stopScanner} style={{ width:'100%', justifyContent:'center', marginTop:10 }}>
              Cancel Scan
            </button>
          </div>
        )}
      </div>

      {errorMsg && (
        <div style={{ background:'#fee2e2',border:'1px solid #fecaca',borderRadius:10,padding:'12px 18px',marginBottom:20,fontSize:'0.85rem',color:'#b91c1c',
          display:'flex', alignItems:'center', gap:6 }}>
          <AlertTriangle size={13} style={{ flexShrink:0 }} /> {errorMsg}
        </div>
      )}

      {status==='notfound' && (
        <div className="cc-card animate-fadeIn" style={{ padding:32, textAlign:'center' }}>
          <div style={{ display:'flex', justifyContent:'center', marginBottom:10 }}>
            <ScanSearch size={40} style={{ color:'#94a3b8' }} />
          </div>
          <h3 style={{ fontWeight:700, color:'var(--cc-text)', marginBottom:6 }}>Batch Not Found</h3>
          <p style={{ fontSize:'0.85rem', color:'var(--cc-muted)' }}>
            No batch with ID <strong>"{batchId}"</strong> exists on-chain.
          </p>
        </div>
      )}

      {status==='found' && batchData && (
        <div className="animate-fadeIn">
          {/* Status banner */}
          <div style={{
            borderRadius:14, padding:'22px 28px', marginBottom:20,
            background: batchData.isCompromised ? 'linear-gradient(135deg,#fee2e2,#fecaca)' : 'linear-gradient(135deg,#dcfce7,#bbf7d0)',
            border: batchData.isCompromised ? '1.5px solid #fca5a5' : '1.5px solid #86efac',
            display:'flex', alignItems:'center', gap:16
          }}>
            <div style={{ display:'flex', flexShrink:0 }}>
              {batchData.isCompromised
                ? <XCircle size={42} style={{ color:'#b91c1c' }} />
                : <CheckCircle2 size={42} style={{ color:'#15803d' }} />}
            </div>
            <div>
              <div style={{ fontSize:'1.4rem', fontWeight:800, color:batchData.isCompromised?'#b91c1c':'#15803d', lineHeight:1.1 }}>
                {batchData.isCompromised ? 'COMPROMISED' : 'SAFE'}
              </div>
              <div style={{ fontSize:'0.85rem', color:batchData.isCompromised?'#991b1b':'#166534', marginTop:4 }}>
                {batchData.isCompromised
                  ? 'One or more temperature breaches recorded on-chain.'
                  : 'All checkpoints are within the safe temperature range.'}
              </div>
            </div>
          </div>

          {/* Batch details */}
          <div className="cc-card" style={{ padding:22, marginBottom:20 }}>
            <h3 style={{ fontWeight:700, fontSize:'0.95rem', color:'var(--cc-text)', marginBottom:14 }}>
              <Package size={15} style={{ color:'var(--cc-indigo)', marginRight:5 }} />
              Batch Details — <span style={{ fontFamily:'monospace', color:'var(--cc-indigo)' }}>{batchId}</span>
            </h3>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px 24px', fontSize:'0.84rem' }}>
              {[
                ['Product',      batchData.productName],
                ['Type',         ptLabel(batchData.productType)],
                ['Safe Range',   `${batchData.minTemp} °C – ${batchData.maxTemp} °C`],
                ['Expiry',       fmtDate(batchData.expiryDate)],
                ['Registered',   fmtTime(batchData.createdAt)],
                ['Manufacturer', short(batchData.manufacturer)],
              ].map(([k,v]) => (
                <div key={k} style={{ display:'flex', flexDirection:'column', gap:2 }}>
                  <span className="cc-label" style={{ marginBottom:0 }}>{k}</span>
                  <span style={{ fontWeight:600, color:'var(--cc-text)',
                    fontFamily:k==='Manufacturer'?'monospace':'inherit',
                    fontSize:k==='Manufacturer'?'0.8rem':'inherit',
                    display:'flex', alignItems:'center', gap:4
                  }}>
                    {k==='Type' && <TypeDot type={batchData.productType} />}
                    {v}
                    {k==='Manufacturer' && (
                      <a href={`https://sepolia.etherscan.io/address/${batchData.manufacturer}`}
                        target="_blank" rel="noopener noreferrer"
                        style={{ color:'var(--cc-indigo)', marginLeft:2 }}>
                        <ExternalLink size={10} />
                      </a>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Timeline */}
          <div className="cc-card" style={{ padding:22, marginBottom:16 }}>
            <h3 style={{ fontWeight:700, fontSize:'0.95rem', color:'var(--cc-text)', marginBottom:18 }}>
              <Thermometer size={14} style={{ color:'var(--cc-muted)', marginRight:4 }} />
              Temperature Timeline — {checkpoints.length} checkpoint{checkpoints.length!==1?'s':''}
            </h3>
            {checkpoints.length===0 ? (
              <p style={{ color:'var(--cc-muted)', fontSize:'0.85rem' }}>No checkpoints logged yet.</p>
            ) : (
              <div style={{ position:'relative', paddingLeft:28 }}>
                <div style={{ position:'absolute', left:8, top:12, bottom:12, width:2, background:'var(--cc-border)' }} />
                {checkpoints.map((cp, i) => {
                  const rc_ = ROLE_COLORS[cp.handlerRole]||{bg:'#f1f5f9',text:'#475569'}
                  return (
                    <div key={i} className="animate-slideIn"
                      style={{ position:'relative', marginBottom:i<checkpoints.length-1?20:0, animationDelay:`${i*0.06}s` }}>
                      <div style={{
                        position:'absolute', left:-20, top:14, width:12, height:12, borderRadius:'50%',
                        background:cp.isBreach?'#f43f5e':'#22c55e', border:'2px solid white',
                        boxShadow:`0 0 0 2px ${cp.isBreach?'#fca5a5':'#86efac'}`, zIndex:1
                      }} />
                      <div style={{
                        background:cp.isBreach?'#fff5f5':'white',
                        border:cp.isBreach?'1.5px solid #fecaca':'1px solid var(--cc-border)',
                        borderRadius:10, padding:'14px 16px'
                      }}>
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8, flexWrap:'wrap', gap:8 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <span className="cc-badge" style={{ background:rc_.bg, color:rc_.text }}>
                              <RoleIcon role={cp.handlerRole} /> {cp.handlerRole}
                            </span>
                            <span style={{ fontWeight:700, fontSize:'0.88rem', color:'var(--cc-text)' }}>{cp.handlerName}</span>
                          </div>
                          <span className="cc-badge" style={cp.isBreach
                            ?{background:'#fee2e2',color:'#b91c1c',display:'flex',alignItems:'center',gap:3}
                            :{background:'#dcfce7',color:'#15803d',display:'flex',alignItems:'center',gap:3}}>
                            {cp.isBreach
                              ? <><AlertTriangle size={11}/>Breach</>
                              : <><CheckCircle2 size={11}/>Safe</>}
                          </span>
                        </div>
                        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:8, fontSize:'0.8rem' }}>
                          <div><div style={{ color:'var(--cc-muted)', fontWeight:500 }}>Temperature</div>
                            <div style={{ fontWeight:700, fontSize:'1.05rem', color:cp.isBreach?'#b91c1c':'#0f172a' }}>{cp.temperature} °C</div></div>
                          <div><div style={{ color:'var(--cc-muted)', fontWeight:500 }}>Location</div><div style={{ fontWeight:600 }}>{cp.location}</div></div>
                          <div><div style={{ color:'var(--cc-muted)', fontWeight:500 }}>Logged</div><div style={{ fontWeight:600 }}>{fmtTime(cp.timestamp)}</div></div>
                          <div><div style={{ color:'var(--cc-muted)', fontWeight:500 }}>Handler</div>
                            <a href={`https://sepolia.etherscan.io/address/${cp.handlerAddress}`} target="_blank" rel="noopener noreferrer"
                              style={{ color:'var(--cc-indigo)', fontFamily:'monospace', fontSize:'0.75rem',
                                display:'inline-flex', alignItems:'center', gap:2 }}>
                              {short(cp.handlerAddress)} <ExternalLink size={10} />
                            </a></div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Collapsible QR section */}
          <div className="cc-card" style={{ padding:'14px 20px' }}>
            <button
              onClick={() => setShowQr(v => !v)}
              className="cc-btn cc-btn-ghost"
              style={{ width:'100%', justifyContent:'center', fontSize:'0.85rem', gap:5 }}>
              <QrCode size={14} />
              {showQr ? 'Hide QR Code' : 'Show QR Code for this Batch'}
            </button>
            {showQr && (
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:12, paddingTop:16 }}>
                <QRCodeCanvas
                  id={`verify-qr-canvas-${batchId}`}
                  value={batchId}
                  size={160}
                  bgColor="white"
                  fgColor="#0f172a"
                  level="H"
                />
                <p style={{ fontSize:'0.78rem', color:'var(--cc-muted)', margin:0 }}>
                  Batch ID: <span style={{ fontFamily:'monospace', color:'var(--cc-indigo)' }}>{batchId}</span>
                </p>
                <button
                  onClick={() => {
                    const canvas = document.getElementById(`verify-qr-canvas-${batchId}`)
                    if (!canvas) return
                    const link = document.createElement('a')
                    link.download = `ChainChill-QR-${batchId}.png`
                    link.href = canvas.toDataURL('image/png')
                    link.click()
                  }}
                  className="cc-btn cc-btn-ghost"
                  style={{ fontSize:'0.82rem', gap:5 }}>
                  <Download size={13} /> Download QR Code
                </button>
                <p style={{ fontSize:'0.72rem', color:'var(--cc-muted)', margin:0 }}>
                  Scan this QR to share batch verification
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
