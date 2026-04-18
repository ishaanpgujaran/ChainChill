import { useState } from 'react'

const HANDLER_ROLES = [
  { value: 'manufacturer', label: 'Manufacturer', color: '#ede9fe', textColor: '#6d28d9' },
  { value: 'warehouse', label: 'Warehouse / Storage', color: '#dbeafe', textColor: '#1d4ed8' },
  { value: 'transporter', label: 'Transporter / Logistics', color: '#fef3c7', textColor: '#d97706' },
  { value: 'receiver', label: 'Receiver / Retailer', color: '#dcfce7', textColor: '#15803d' },
]

// Matches the 4-type system from RegisterBatch
const PRODUCT_TYPE_STYLES = {
  pharma: { icon: '💊', label: 'Pharma / Vaccines', bg: '#dbeafe', text: '#1d4ed8' },
  frozen: { icon: '🧊', label: 'Frozen Food', bg: '#e0e7ff', text: '#4338ca' },
  fresh: { icon: '🥛', label: 'Fresh / Dairy', bg: '#dcfce7', text: '#15803d' },
  quickcommerce: { icon: '⚡', label: 'Quick Commerce', bg: '#ffedd5', text: '#c2410c' },
}

export default function LogCheckpoint({ contract, account }) {
  const [form, setForm] = useState({
    batchId: '', handlerName: '', handlerRole: 'warehouse',
    temperature: '', location: ''
  })
  const [status, setStatus] = useState('idle')
  const [result, setResult] = useState(null)   // { txHash, isBreach, productType }
  const [errorMsg, setError] = useState('')

  function set(field) { return e => setForm(f => ({ ...f, [field]: e.target.value })) }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!contract || !account) return

    const { batchId, handlerName, handlerRole, temperature, location } = form

    if (!batchId.trim() || !handlerName.trim() || temperature === '' || !location.trim()) {
      setError('Please fill in all fields.')
      return
    }

    setStatus('loading')
    setError('')

    try {
      // Check batch exists first (gas-free read)
      const exists = await contract.batchExists(batchId.trim())
      if (!exists) {
        setError(`Batch "${batchId.trim()}" does not exist on-chain. Register it first.`)
        setStatus('error')
        return
      }

      // Fetch current batch info to check safe range
      const batch = await contract.getBatch(batchId.trim())
      const minT = Number(batch.minTemp)
      const maxT = Number(batch.maxTemp)
      const temp = Number(temperature)
      const willBreach = temp < minT || temp > maxT

      const tx = await contract.logCheckpoint(
        batchId.trim(), handlerName.trim(), handlerRole,
        BigInt(Math.round(temp)), location.trim()
      )
      const receipt = await tx.wait()

      setResult({ txHash: tx.hash, isBreach: willBreach, temp, minT, maxT, productType: batch.productType })
      setStatus('success')
    } catch (err) {
      console.error(err)
      if (err.code === 4001) setError('Transaction cancelled by user.')
      else if (err.reason) setError(`Contract error: ${err.reason}`)
      else setError('Transaction failed. Check batch ID and network.')
      setStatus('error')
    }
  }

  function reset() {
    setForm({ batchId: '', handlerName: '', handlerRole: 'warehouse', temperature: '', location: '' })
    setStatus('idle'); setResult(null); setError('')
  }

  const selectedRole = HANDLER_ROLES.find(r => r.value === form.handlerRole)

  // ── Success view ─────────────────────────────────────────────────────────────
  if (status === 'success' && result) {
    return (
      <div className="animate-fadeIn" style={{ maxWidth: 580, margin: '0 auto' }}>
        <div className="cc-card" style={{ padding: 36, textAlign: 'center' }}>
          <div style={{ fontSize: 52, marginBottom: 10 }}>
            {result.isBreach ? '⚠️' : '✅'}
          </div>
          <h2 style={{
            fontSize: '1.3rem', fontWeight: 700,
            color: result.isBreach ? '#b91c1c' : '#15803d',
            marginBottom: 8
          }}>
            {result.isBreach ? 'Checkpoint Logged — Temperature Breach!' : 'Checkpoint Logged Successfully'}
          </h2>

          {result.isBreach ? (
            <div style={{
              background: '#fee2e2', border: '1.5px solid #fca5a5',
              borderRadius: 10, padding: '14px 20px', margin: '16px 0',
              fontSize: '0.88rem', color: '#991b1b'
            }}>
              🌡 Recorded <strong>{result.temp} °C</strong> — outside safe range of&nbsp;
              <strong>{result.minT} °C – {result.maxT} °C</strong>.<br />
              The batch has been automatically flagged as <strong>COMPROMISED</strong> on-chain.
            </div>
          ) : (
            <div style={{
              background: '#dcfce7', border: '1.5px solid #86efac',
              borderRadius: 10, padding: '14px 20px', margin: '16px 0',
              fontSize: '0.88rem', color: '#14532d'
            }}>
              🌡 <strong>{result.temp} °C</strong> is within the safe range of&nbsp;
              <strong>{result.minT} °C – {result.maxT} °C</strong>. All good!
            </div>
          )}

          {/* Summary */}
          <div style={{
            background: 'var(--cc-slate-2)', borderRadius: 10,
            padding: '12px 20px', textAlign: 'left', marginBottom: 20,
            fontSize: '0.84rem'
          }}>
            {/* Product type badge */}
            {result.productType && (() => {
              const pt = PRODUCT_TYPE_STYLES[result.productType] || { icon: '📦', label: result.productType, bg: '#f1f5f9', text: '#475569' }
              return (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--cc-border)', alignItems: 'center' }}>
                  <span style={{ color: 'var(--cc-muted)', fontWeight: 500 }}>Product Type</span>
                  <span className="cc-badge" style={{ background: pt.bg, color: pt.text }}>{pt.icon} {pt.label}</span>
                </div>
              )
            })()}
            {[
              ['Batch ID', form.batchId],
              ['Handler', form.handlerName],
              ['Role', selectedRole?.label || form.handlerRole],
              ['Temperature', `${result.temp} °C`],
              ['Location', form.location],
              ['Logged by', `${account.slice(0, 6)}...${account.slice(-4)}`],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--cc-border)' }}>
                <span style={{ color: 'var(--cc-muted)', fontWeight: 500 }}>{k}</span>
                <span style={{ fontWeight: 600, color: 'var(--cc-text)', fontFamily: k === 'Logged by' ? 'monospace' : 'inherit' }}>{v}</span>
              </div>
            ))}
          </div>

          {result.txHash && (
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--cc-muted)', marginBottom: 4 }}>Transaction Hash</p>
              <a href={`https://sepolia.etherscan.io/tx/${result.txHash}`}
                target="_blank" rel="noopener noreferrer"
                style={{ fontFamily: 'monospace', fontSize: '0.73rem', color: 'var(--cc-indigo)', wordBreak: 'break-all' }}>
                {result.txHash} ↗
              </a>
            </div>
          )}

          <button onClick={reset} className="cc-btn cc-btn-primary">
            + Log Another Checkpoint
          </button>
        </div>
      </div>
    )
  }

  // ── Form view ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 580, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--cc-text)' }}>
          Log Temperature Checkpoint
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--cc-muted)', marginTop: 4 }}>
          Any authorised handler can log a checkpoint. Your wallet address is auto-recorded as proof of who logged it.
        </p>
      </div>

      {!account && (
        <div style={{
          background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 10,
          padding: '12px 16px', marginBottom: 20, fontSize: '0.83rem', color: '#92400e'
        }}>
          🔒 Connect your MetaMask wallet to log checkpoints.
        </div>
      )}

      <div className="cc-card" style={{ padding: 28 }}>
        <form onSubmit={handleSubmit}>

          {/* Batch ID */}
          <div style={{ marginBottom: 16 }}>
            <label className="cc-label" htmlFor="cp-batchId">Batch ID *</label>
            <input id="cp-batchId" className="cc-input" placeholder="e.g. BATCH-001"
              value={form.batchId} onChange={set('batchId')} required />
          </div>

          {/* Handler name + role */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label className="cc-label" htmlFor="cp-handlerName">Handler / Organisation Name *</label>
              <input id="cp-handlerName" className="cc-input" placeholder="e.g. BlueDart Logistics"
                value={form.handlerName} onChange={set('handlerName')} required />
            </div>
            <div>
              <label className="cc-label" htmlFor="cp-handlerRole">Handler Role</label>
              <select id="cp-handlerRole" className="cc-input"
                value={form.handlerRole} onChange={set('handlerRole')}
                style={{ cursor: 'pointer' }}>
                {HANDLER_ROLES.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Role badge */}
          {selectedRole && (
            <div style={{ marginBottom: 16 }}>
              <span className="cc-badge" style={{ background: selectedRole.color, color: selectedRole.textColor }}>
                {selectedRole.label}
              </span>
            </div>
          )}

          {/* Temp + Location */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label className="cc-label" htmlFor="cp-temperature">Temperature (°C) *</label>
              <input id="cp-temperature" className="cc-input" type="number" step="0.1"
                placeholder="e.g. 4"
                value={form.temperature} onChange={set('temperature')} required />
            </div>
            <div>
              <label className="cc-label" htmlFor="cp-location">Location / Checkpoint *</label>
              <input id="cp-location" className="cc-input" placeholder="e.g. Mumbai Cold Storage, Gate 3"
                value={form.location} onChange={set('location')} required />
            </div>
          </div>

          {/* Wallet display */}
          {account && (
            <div style={{
              background: 'var(--cc-slate-2)', borderRadius: 8,
              padding: '10px 14px', marginBottom: 16,
              fontSize: '0.8rem', color: 'var(--cc-muted)',
              display: 'flex', alignItems: 'center', gap: 8
            }}>
              <span>🔐</span>
              <span>Logging as: <span style={{ fontFamily: 'monospace', color: 'var(--cc-indigo)', fontWeight: 600 }}>
                {account}
              </span></span>
            </div>
          )}

          {errorMsg && (
            <div style={{
              background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 8,
              padding: '10px 14px', marginBottom: 16, fontSize: '0.83rem', color: '#b91c1c'
            }}>
              ⚠ {errorMsg}
            </div>
          )}

          <button
            id="log-checkpoint-submit"
            type="submit"
            className="cc-btn cc-btn-primary"
            disabled={status === 'loading' || !account}
            style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}
          >
            {status === 'loading'
              ? <><div className="cc-spinner" />Sending transaction…</>
              : <>⊕ Log Checkpoint on Blockchain</>
            }
          </button>

          {status === 'loading' && (
            <p style={{ textAlign: 'center', fontSize: '0.78rem', color: 'var(--cc-muted)', marginTop: 10 }}>
              Confirm in MetaMask and wait for block confirmation (~15 seconds on Sepolia)…
            </p>
          )}
        </form>
      </div>
    </div>
  )
}
