import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'

const PRODUCT_TYPES = [
  { value: 'pharma',        label: '💊 Pharma / Vaccines' },
  { value: 'food',          label: '🥛 Food & Dairy' },
  { value: 'quickcommerce', label: '⚡ Quick Commerce' },
]

const TEMP_PRESETS = {
  pharma:        { min: '2',  max: '8',   hint: 'Standard vaccine range (2–8 °C)' },
  food:          { min: '-2', max: '4',   hint: 'Fresh food & dairy (−2 to 4 °C)' },
  quickcommerce: { min: '0',  max: '10',  hint: 'Quick commerce cold goods (0–10 °C)' },
}

export default function RegisterBatch({ contract, account }) {
  const [form, setForm] = useState({
    batchId: '', productName: '', productType: 'pharma',
    minTemp: '2', maxTemp: '8', expiryDate: ''
  })
  const [status, setStatus]   = useState('idle')  // idle | loading | success | error
  const [txHash, setTxHash]   = useState('')
  const [errorMsg, setError]  = useState('')

  const preset = TEMP_PRESETS[form.productType] || {}

  function handleTypeChange(e) {
    const t = e.target.value
    setForm(f => ({ ...f, productType: t, ...TEMP_PRESETS[t] }))
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
    setForm({ batchId:'', productName:'', productType:'pharma', minTemp:'2', maxTemp:'8', expiryDate:'' })
    setStatus('idle'); setTxHash(''); setError('')
  }

  // ── Success view ────────────────────────────────────────────────────────────
  if (status === 'success') {
    return (
      <div className="animate-fadeIn" style={{ maxWidth: 620, margin: '0 auto' }}>
        <div className="cc-card" style={{ padding: 36, textAlign: 'center' }}>
          <div style={{ fontSize: 52, marginBottom: 12 }}>🎉</div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--cc-text)', marginBottom: 6 }}>
            Batch Registered!
          </h2>
          <p style={{ color: 'var(--cc-muted)', marginBottom: 24, fontSize: '0.9rem' }}>
            <strong>{form.productName}</strong> has been permanently recorded on the Ethereum Sepolia blockchain.
          </p>

          {/* QR Code */}
          <div style={{
            display: 'inline-flex', flexDirection: 'column', alignItems: 'center',
            background: 'white', border: '1px solid var(--cc-border)',
            borderRadius: 12, padding: 20, marginBottom: 24,
            boxShadow: 'var(--shadow-sm)'
          }}>
            <QRCodeSVG
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

          {/* Batch summary */}
          <div style={{
            background: 'var(--cc-slate-2)', borderRadius: 10, padding: '14px 20px',
            textAlign: 'left', marginBottom: 20, fontSize: '0.84rem'
          }}>
            {[
              ['Product',  form.productName],
              ['Type',     PRODUCT_TYPES.find(t => t.value === form.productType)?.label || form.productType],
              ['Safe range', `${form.minTemp} °C to ${form.maxTemp} °C`],
              ['Expiry',   new Date(form.expiryDate).toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' })],
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
                  color: 'var(--cc-indigo)', wordBreak: 'break-all'
                }}
              >
                {txHash} ↗
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
          padding: '12px 16px', marginBottom: 20, fontSize: '0.83rem', color: '#92400e'
        }}>
          🔒 Connect your MetaMask wallet to register batches.
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
            {preset.hint && (
              <p style={{ fontSize:'0.75rem', color:'var(--cc-muted)', marginTop:5 }}>
                💡 {preset.hint}
              </p>
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
              padding: '10px 14px', marginBottom: 16,
              fontSize: '0.83rem', color: '#b91c1c'
            }}>
              ⚠ {errorMsg}
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
              : <>⊞ Register Batch on Blockchain</>
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
