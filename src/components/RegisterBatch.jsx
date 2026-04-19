import { useState } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { CheckCircle2, Download, ExternalLink, PackagePlus, AlertTriangle, Lock } from 'lucide-react'

const TYPE_DOT_COLOR = {
  pharma:        '#3b82f6',
  frozen:        '#6366f1',
  fresh:         '#22c55e',
  quickcommerce: '#f97316',
}
function TypeDot({ type }) {
  return <span style={{ display:'inline-block', width:10, height:10, borderRadius:'50%',
    background: TYPE_DOT_COLOR[type] || '#94a3b8', flexShrink:0 }} />
}

const PRODUCT_TYPES = [
  { value: 'pharma',        label: 'Pharma / Vaccines' },
  { value: 'frozen',        label: 'Frozen Food' },
  { value: 'fresh',         label: 'Fresh / Dairy' },
  { value: 'quickcommerce', label: 'Quick Commerce' },
]

const TEMP_PRESETS = {
  pharma:        { min: '2',   max: '8'  },
  frozen:        { min: '-18', max: '0'  },
  fresh:         { min: '1',   max: '8'  },
  quickcommerce: { min: '0',   max: '10' },
}

const PRODUCT_INFO = {
  pharma: {
    label: 'Pharma / Vaccines',
    range: '2°C to 8°C',
    description: 'Medicines, vaccines, injections, and biological samples.',
    examples: ['Polio Vaccine', 'Insulin', 'Antibiotics', 'Blood Samples'],
    borderColor: '#3b82f6',
    bg: '#eff6ff',
    badgeBg: '#dbeafe', badgeText: '#1d4ed8',
    disclaimer: null,
  },
  frozen: {
    label: 'Frozen Food',
    range: '−18°C to 0°C',
    description: 'Frozen meals, ice cream, meat, seafood, and frozen vegetables.',
    examples: ['Ice Cream', 'Frozen Chicken', 'Seafood', 'Ready Meals'],
    borderColor: '#6366f1',
    bg: '#eef2ff',
    badgeBg: '#e0e7ff', badgeText: '#4338ca',
    disclaimer: null,
  },
  fresh: {
    label: 'Fresh / Dairy',
    range: '1°C to 8°C',
    description: 'Milk, curd, fresh vegetables, fruits, eggs, and paneer.',
    examples: ['Amul Milk', 'Curd', 'Fresh Vegetables', 'Eggs', 'Paneer'],
    borderColor: '#22c55e',
    bg: '#f0fdf4',
    badgeBg: '#dcfce7', badgeText: '#15803d',
    disclaimer: null,
  },
  quickcommerce: {
    label: 'Quick Commerce',
    range: '0°C to 10°C',
    description: 'Perishable goods for sub-30-minute delivery via Blinkit, Zepto, Swiggy Instamart.',
    examples: ['Grocery Orders', 'Cold Beverages', 'Fresh Snacks', 'Packaged Dairy'],
    borderColor: '#f97316',
    bg: '#fff7ed',
    badgeBg: '#ffedd5', badgeText: '#c2410c',
    disclaimer: 'Quick Commerce is a delivery method — ensure product-specific temperature requirements are met by the handler.',
  },
}

export default function RegisterBatch({ contract, account }) {
  const [form, setForm] = useState({
    batchId: '', productName: '', productType: 'pharma',
    minTemp: '2', maxTemp: '8', expiryDate: ''
  })
  const info = PRODUCT_INFO[form.productType] || null
  const [status, setStatus]   = useState('idle')  // idle | loading | success | error
  const [txHash, setTxHash]   = useState('')
  const [errorMsg, setError]  = useState('')

  function handleTypeChange(e) {
    const t = e.target.value
    const p = TEMP_PRESETS[t] || {}
    setForm(f => ({ ...f, productType: t, minTemp: p.min ?? f.minTemp, maxTemp: p.max ?? f.maxTemp }))
  }

  function set(field) { return e => setForm(f => ({ ...f, [field]: e.target.value })) }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!contract || !account) return

    const { batchId, productName, productType, minTemp, maxTemp, expiryDate } = form

    if (!batchId.trim() || !productName.trim() || !expiryDate) {
      setError('Please fill in all fields.')
      return
    }
    if (Number(minTemp) >= Number(maxTemp)) {
      setError('Min temperature must be less than max temperature.')
      return
    }

    setStatus('loading')
    setError('')

    try {
      const expiryTs = Math.floor(new Date(expiryDate).getTime() / 1000)
      const tx = await contract.registerBatch(
        batchId.trim(), productName.trim(), productType,
        BigInt(minTemp), BigInt(maxTemp), BigInt(expiryTs)
      )
      setTxHash(tx.hash)
      await tx.wait()
      setStatus('success')
    } catch (err) {
      console.error(err)
      if (err.code === 4001) setError('Transaction cancelled by user.')
      else if (err.reason) setError(`Contract error: ${err.reason}`)
      else setError('Transaction failed. Batch ID may already exist, or network issue.')
      setStatus('error')
    }
  }

  function reset() {
    setForm({ batchId:'', productName:'', productType:'pharma', minTemp: TEMP_PRESETS.pharma.min, maxTemp: TEMP_PRESETS.pharma.max, expiryDate:'' })
    setStatus('idle'); setTxHash(''); setError('')
  }

  function downloadQR() {
    const canvas = document.getElementById('batch-qr-canvas')
    if (!canvas) return
    const url = canvas.toDataURL('image/png')
    const link = document.createElement('a')
    link.download = `ChainChill-QR-${form.batchId}.png`
    link.href = url
    link.click()
  }

  // ── Success view ────────────────────────────────────────────────────────────
  if (status === 'success') {
    return (
      <div className="animate-fadeIn" style={{ maxWidth: 620, margin: '0 auto' }}>
        <div className="cc-card" style={{ padding: 36, textAlign: 'center' }}>
          <div style={{ display:'flex', justifyContent:'center', marginBottom:12 }}>
            <CheckCircle2 size={52} style={{ color:'#16a34a' }} />
          </div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--cc-text)', marginBottom: 6 }}>
            Batch Registered!
          </h2>
          <p style={{ color: 'var(--cc-muted)', marginBottom: 24, fontSize: '0.9rem' }}>
            <strong>{form.productName}</strong> has been permanently recorded on the Ethereum Sepolia blockchain.
          </p>

          {/* QR Code + Download */}
          <div style={{
            display: 'inline-flex', flexDirection: 'column', alignItems: 'center',
            background: 'white', border: '1px solid var(--cc-border)',
            borderRadius: 12, padding: 20, marginBottom: 8,
            boxShadow: 'var(--shadow-sm)'
          }}>
            <QRCodeCanvas
              id="batch-qr-canvas"
              value={form.batchId}
              size={160}
              bgColor="white"
              fgColor="#0f172a"
              level="H"
            />
            <p style={{ marginTop: 10, fontSize: '0.78rem', color: 'var(--cc-muted)', fontWeight: 600 }}>
              Batch ID: <span style={{ fontFamily: 'monospace', color: 'var(--cc-indigo)' }}>{form.batchId}</span>
            </p>
          </div>

          {/* Download button + helper */}
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6, marginBottom:20 }}>
            <button onClick={downloadQR} className="cc-btn cc-btn-ghost"
              style={{ fontSize:'0.82rem', gap:6 }}>
              <Download size={14} /> Download QR Code
            </button>
            <p style={{ fontSize:'0.72rem', color:'var(--cc-muted)', margin:0 }}>
              Share this QR with handlers and consumers to verify this batch
            </p>
          </div>

          {/* Batch summary */}
          <div style={{
            background: 'var(--cc-slate-2)', borderRadius: 10, padding: '14px 20px',
            textAlign: 'left', marginBottom: 20, fontSize: '0.84rem'
          }}>
            {[
              ['Product',    form.productName],
              ['Type',       (PRODUCT_INFO[form.productType]?.label || form.productType)],
              ['Safe range', `${form.minTemp} °C to ${form.maxTemp} °C`],
              ['Expiry',     new Date(form.expiryDate).toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' })],
            ].map(([k, v]) => (
              <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'4px 0' }}>
                <span style={{ color: 'var(--cc-muted)', fontWeight: 500 }}>{k}</span>
                <span style={{ fontWeight: 600, color: 'var(--cc-text)' }}>{v}</span>
              </div>
            ))}
          </div>

          {/* Tx hash */}
          {txHash && (
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--cc-muted)', marginBottom: 4 }}>Transaction Hash</p>
              <a
                href={`https://sepolia.etherscan.io/tx/${txHash}`}
                target="_blank" rel="noopener noreferrer"
                style={{
                  fontFamily: 'monospace', fontSize: '0.75rem',
                  color: 'var(--cc-indigo)', wordBreak: 'break-all',
                  display: 'inline-flex', alignItems: 'center', gap: 4
                }}
              >
                {txHash} <ExternalLink size={11} />
              </a>
            </div>
          )}

          <button onClick={reset} className="cc-btn cc-btn-primary">
            + Register Another Batch
          </button>
        </div>
      </div>
    )
  }

  // ── Form view ────────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 620, margin: '0 auto' }}>
      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--cc-text)' }}>
          Register a New Batch
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--cc-muted)', marginTop: 4 }}>
          Creates an on-chain record with your wallet address as manufacturer. A QR code will be generated on success.
        </p>
      </div>

      {!account && (
        <div style={{
          background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 10,
          padding: '12px 16px', marginBottom: 20, fontSize: '0.83rem', color: '#92400e',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <Lock size={14} style={{ flexShrink:0 }} />
          Connect your MetaMask wallet to register batches.
        </div>
      )}

      <div className="cc-card" style={{ padding: 28 }}>
        <form onSubmit={handleSubmit}>

          {/* Row 1 */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
            <div>
              <label className="cc-label" htmlFor="reg-batchId">Batch ID *</label>
              <input id="reg-batchId" className="cc-input" placeholder="e.g. BATCH-001"
                value={form.batchId} onChange={set('batchId')} required />
            </div>
            <div>
              <label className="cc-label" htmlFor="reg-productName">Product Name *</label>
              <input id="reg-productName" className="cc-input" placeholder="e.g. Polio Vaccine"
                value={form.productName} onChange={set('productName')} required />
            </div>
          </div>

          {/* Product type */}
          <div style={{ marginBottom: 16 }}>
            <label className="cc-label" htmlFor="reg-productType">Product Type</label>
            <select id="reg-productType" className="cc-input"
              value={form.productType} onChange={handleTypeChange}
              style={{ cursor: 'pointer' }}>
              {PRODUCT_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>

            {/* Info card */}
            {info && (
              <div className="animate-fadeIn" style={{
                marginTop: 12,
                background: info.bg,
                borderLeft: `4px solid ${info.borderColor}`,
                borderRadius: '0 10px 10px 0',
                border: `1px solid ${info.borderColor}30`,
                borderLeft: `4px solid ${info.borderColor}`,
                padding: '14px 16px',
              }}>
                {/* Header row */}
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                  <TypeDot type={form.productType} />
                  <div>
                    <div style={{ fontWeight:700, fontSize:'0.88rem', color:'var(--cc-text)' }}>{info.label}</div>
                    <div style={{ fontSize:'0.75rem', color:'var(--cc-muted)', marginTop:1 }}>Safe Range: <strong style={{ color:'var(--cc-text)' }}>{info.range}</strong></div>
                  </div>
                </div>

                {/* Description */}
                <p style={{ fontSize:'0.78rem', color:'var(--cc-muted)', margin:'6px 0 8px' }}>{info.description}</p>

                {/* Example chips */}
                <div style={{ marginBottom: info.disclaimer ? 8 : 0 }}>
                  <span style={{ fontSize:'0.7rem', fontWeight:600, color:'var(--cc-muted)', textTransform:'uppercase', letterSpacing:'.04em' }}>Examples: </span>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginTop:5 }}>
                    {info.examples.map(ex => (
                      <span key={ex} style={{
                        background: info.badgeBg, color: info.badgeText,
                        borderRadius: 99, padding: '2px 10px',
                        fontSize: '0.74rem', fontWeight: 600,
                      }}>{ex}</span>
                    ))}
                  </div>
                </div>

                {/* QC disclaimer */}
                {info.disclaimer && (
                  <p style={{
                    marginTop: 8, fontSize:'0.73rem', color: '#c2410c',
                    background:'#ffedd5', borderRadius:6, padding:'6px 10px',
                    fontStyle:'italic', display:'flex', alignItems:'flex-start', gap:5
                  }}>
                    <AlertTriangle size={12} style={{ flexShrink:0, marginTop:1 }} /> {info.disclaimer}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Temp row */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:16, marginBottom:16 }}>
            <div>
              <label className="cc-label" htmlFor="reg-minTemp">Min Temp (°C)</label>
              <input id="reg-minTemp" className="cc-input" type="number"
                value={form.minTemp} onChange={set('minTemp')} step="1" required />
            </div>
            <div>
              <label className="cc-label" htmlFor="reg-maxTemp">Max Temp (°C)</label>
              <input id="reg-maxTemp" className="cc-input" type="number"
                value={form.maxTemp} onChange={set('maxTemp')} step="1" required />
            </div>
            <div>
              <label className="cc-label" htmlFor="reg-expiry">Expiry Date</label>
              <input id="reg-expiry" className="cc-input" type="date"
                value={form.expiryDate} onChange={set('expiryDate')} required
                min={new Date().toISOString().split('T')[0]} />
            </div>
          </div>

          {/* Error */}
          {errorMsg && (
            <div style={{
              background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 8,
              padding: '10px 14px', marginBottom: 16, fontSize: '0.83rem', color: '#b91c1c',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <AlertTriangle size={13} style={{ flexShrink:0 }} /> {errorMsg}
            </div>
          )}

          <button
            id="register-batch-submit"
            type="submit"
            className="cc-btn cc-btn-primary"
            disabled={status === 'loading' || !account}
            style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}
          >
            {status === 'loading'
              ? <><div className="cc-spinner" />Sending transaction…</>
              : <><PackagePlus size={15} />Register Batch on Blockchain</>
            }
          </button>

          {status === 'loading' && (
            <p style={{ textAlign:'center', fontSize:'0.78rem', color:'var(--cc-muted)', marginTop:10 }}>
              Please confirm the transaction in MetaMask and wait for block confirmation…
            </p>
          )}
        </form>
      </div>
    </div>
  )
}
