import { useState, useRef, useEffect } from 'react'
import { ImageUp, Camera, Thermometer, CheckCircle2, AlertTriangle, ExternalLink, Lock } from 'lucide-react'

const HANDLER_ROLES = [
  { value: 'manufacturer', label: 'Manufacturer',           color: '#ede9fe', textColor: '#6d28d9' },
  { value: 'warehouse',    label: 'Warehouse / Storage',    color: '#dbeafe', textColor: '#1d4ed8' },
  { value: 'transporter',  label: 'Transporter / Logistics', color: '#fef3c7', textColor: '#d97706' },
  { value: 'receiver',     label: 'Receiver / Retailer',    color: '#dcfce7', textColor: '#15803d' },
]

const PRODUCT_TYPE_DOT = {
  pharma:        '#3b82f6',
  frozen:        '#6366f1',
  fresh:         '#22c55e',
  quickcommerce: '#f97316',
}
const PRODUCT_TYPE_LABELS = {
  pharma:        'Pharma / Vaccines',
  frozen:        'Frozen Food',
  fresh:         'Fresh / Dairy',
  quickcommerce: 'Quick Commerce',
}

export default function LogCheckpoint({ contract, account }) {
  const [form, setForm] = useState({
    batchId: '', handlerName: '', handlerRole: 'warehouse',
    temperature: '', location: '',
  })
  const [status,      setStatus]   = useState('idle')
  const [result,      setResult]   = useState(null)
  const [errorMsg,    setError]    = useState('')
  const [scanning,    setScanning] = useState(false)
  const [scanSuccess, setScanSuccess] = useState('')
  const scannerRef  = useRef(null)
  const fileInputRef = useRef(null)

  function set(field) { return e => setForm(f => ({ ...f, [field]: e.target.value })) }

  // ── QR: Camera scan ──────────────────────────────────────────────────────────
  async function startScan() {
    try {
      const { Html5Qrcode } = await import('html5-qrcode')
      setScanning(true)
      await new Promise(r => setTimeout(r, 100))
      const scanner = new Html5Qrcode('lc-qr-reader-camera')
      scannerRef.current = scanner
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 200, height: 200 } },
        (decodedText) => {
          const id = decodedText.trim()
          setForm(f => ({ ...f, batchId: id }))
          stopScan()
          setScanSuccess(`Batch ID scanned: ${id}`)
          setTimeout(() => setScanSuccess(''), 3000)
        },
        () => { /* ignore per-frame errors */ }
      )
    } catch (err) {
      setScanning(false)
      if (err.name === 'NotAllowedError' || err.message?.toLowerCase().includes('permission')) {
        setError('Camera access denied. Please allow camera permission or upload a QR image instead.')
      } else {
        setError('Could not start camera. Try uploading a QR image instead.')
      }
    }
  }

  function stopScan() {
    if (scannerRef.current) {
      scannerRef.current.stop()
        .then(() => scannerRef.current?.clear())
        .catch(() => {})
      scannerRef.current = null
    }
    setScanning(false)
  }

  useEffect(() => () => { stopScan() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── QR: File upload decode ───────────────────────────────────────────────────
  async function handleFileUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const { Html5Qrcode } = await import('html5-qrcode')
      const reader = new Html5Qrcode('lc-qr-reader-upload')
      const decodedText = await reader.scanFile(file, true)
      const id = decodedText.trim()
      setForm(f => ({ ...f, batchId: id }))
      setScanSuccess(`Batch ID scanned: ${id}`)
      setTimeout(() => setScanSuccess(''), 3000)
    } catch {
      alert('Could not read QR code from image. Please try again or type the Batch ID manually.')
    }
    // Reset input so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ── Submit ───────────────────────────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault()
    if (!contract || !account) return

    const { batchId, handlerName, handlerRole, temperature, location } = form
    if (!batchId.trim() || !handlerName.trim() || temperature === '' || !location.trim()) {
      setError('Please fill in all fields.')
      return
    }

    setStatus('loading'); setError('')

    try {
      const exists = await contract.batchExists(batchId.trim())
      if (!exists) {
        setError(`Batch "${batchId.trim()}" does not exist on-chain. Register it first.`)
        setStatus('error'); return
      }

      const batch = await contract.getBatch(batchId.trim())
      const minT = Number(batch.minTemp ?? batch[2] ?? 0)
      const maxT = Number(batch.maxTemp ?? batch[3] ?? 0)
      const temp = Number(temperature)
      const willBreach = temp < minT || temp > maxT

      const tx = await contract.logCheckpoint(
        batchId.trim(), handlerName.trim(), handlerRole,
        BigInt(Math.round(temp)), location.trim()
      )
      await tx.wait()

      const rawType = (batch.productType ?? batch[1] ?? '').toString()
      setResult({ txHash: tx.hash, isBreach: willBreach, temp, minT, maxT, productType: rawType })
      setStatus('success')
    } catch (err) {
      console.error(err)
      if (err.code === 4001) setError('Transaction cancelled by user.')
      else if (err.reason)   setError(`Contract error: ${err.reason}`)
      else                   setError('Transaction failed. Check batch ID and network.')
      setStatus('error')
    }
  }

  function reset() {
    setForm({ batchId: '', handlerName: '', handlerRole: 'warehouse', temperature: '', location: '' })
    setStatus('idle'); setResult(null); setError('')
  }

  const selectedRole = HANDLER_ROLES.find(r => r.value === form.handlerRole)

  // ── Success screen ───────────────────────────────────────────────────────────
  if (status === 'success' && result) {
    const dotColor = PRODUCT_TYPE_DOT[result.productType] || '#94a3b8'
    const ptLabel  = PRODUCT_TYPE_LABELS[result.productType] || result.productType
    return (
      <div className="animate-fadeIn" style={{ maxWidth: 580, margin: '0 auto' }}>
        <div className="cc-card" style={{ padding: 36, textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
            {result.isBreach
              ? <AlertTriangle size={48} style={{ color: '#b91c1c' }} />
              : <CheckCircle2  size={48} style={{ color: '#16a34a' }} />}
          </div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: 8,
            color: result.isBreach ? '#b91c1c' : '#15803d' }}>
            {result.isBreach ? 'Checkpoint Logged — Temperature Breach!' : 'Checkpoint Logged Successfully'}
          </h2>

          <div style={{
            background: result.isBreach ? '#fee2e2' : '#dcfce7',
            border: `1.5px solid ${result.isBreach ? '#fca5a5' : '#86efac'}`,
            borderRadius: 10, padding: '14px 20px', margin: '16px 0',
            fontSize: '0.88rem', color: result.isBreach ? '#991b1b' : '#14532d',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <Thermometer size={16} style={{ flexShrink: 0 }} />
            {result.isBreach ? (
              <span>Recorded <strong>{result.temp} °C</strong> — outside safe range of <strong>{result.minT} °C – {result.maxT} °C</strong>.{' '}
              The batch has been automatically flagged as <strong>COMPROMISED</strong> on-chain.</span>
            ) : (
              <span><strong>{result.temp} °C</strong> is within the safe range of <strong>{result.minT} °C – {result.maxT} °C</strong>. All good!</span>
            )}
          </div>

          <div style={{ background: 'var(--cc-slate-2)', borderRadius: 10,
            padding: '12px 20px', textAlign: 'left', marginBottom: 20, fontSize: '0.84rem' }}>
            {result.productType && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0',
                borderBottom: '1px solid var(--cc-border)', alignItems: 'center' }}>
                <span style={{ color: 'var(--cc-muted)', fontWeight: 500 }}>Product Type</span>
                <span className="cc-badge" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ display:'inline-block', width:8, height:8, borderRadius:'50%', background: dotColor }} />
                  {ptLabel}
                </span>
              </div>
            )}
            {[
              ['Batch ID',    form.batchId],
              ['Handler',     form.handlerName],
              ['Role',        selectedRole?.label || form.handlerRole],
              ['Temperature', `${result.temp} °C`],
              ['Location',    form.location],
              ['Logged by',   `${account.slice(0,6)}...${account.slice(-4)}`],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between',
                padding: '4px 0', borderBottom: '1px solid var(--cc-border)' }}>
                <span style={{ color: 'var(--cc-muted)', fontWeight: 500 }}>{k}</span>
                <span style={{ fontWeight: 600, color: 'var(--cc-text)',
                  fontFamily: k === 'Logged by' ? 'monospace' : 'inherit' }}>{v}</span>
              </div>
            ))}
          </div>

          {result.txHash && (
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--cc-muted)', marginBottom: 4 }}>Transaction Hash</p>
              <a href={`https://sepolia.etherscan.io/tx/${result.txHash}`}
                target="_blank" rel="noopener noreferrer"
                style={{ fontFamily: 'monospace', fontSize: '0.73rem', color: 'var(--cc-indigo)',
                  wordBreak: 'break-all', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                {result.txHash} <ExternalLink size={11} />
              </a>
            </div>
          )}

          <button onClick={reset} className="cc-btn cc-btn-primary">
            Log Another Checkpoint
          </button>
        </div>
      </div>
    )
  }

  // ── Form view ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 580, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--cc-text)',
          display: 'flex', alignItems: 'center', gap: 8 }}>
          <Thermometer size={20} /> Log Temperature Checkpoint
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--cc-muted)', marginTop: 4 }}>
          Any authorised handler can log a checkpoint. Your wallet address is auto-recorded as proof.
        </p>
      </div>

      {!account && (
        <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 10,
          padding: '12px 16px', marginBottom: 20, fontSize: '0.83rem', color: '#92400e',
          display: 'flex', alignItems: 'center', gap: 8 }}>
          <Lock size={14} style={{ flexShrink: 0 }} />
          Connect your MetaMask wallet to log checkpoints.
        </div>
      )}

      <div className="cc-card" style={{ padding: 28 }}>
        <form onSubmit={handleSubmit}>

          {/* Batch ID + QR scan */}
          <div style={{ marginBottom: 16 }}>
            <label className="cc-label" htmlFor="cp-batchId">Batch ID *</label>
            <input id="cp-batchId" className="cc-input" placeholder="e.g. BATCH-001"
              value={form.batchId} onChange={set('batchId')} required />
            <p style={{ fontSize: '0.72rem', color: 'var(--cc-muted)', margin: '6px 0 6px' }}>
              or auto-fill by scanning a QR code
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={() => fileInputRef.current?.click()}
                className="cc-btn cc-btn-ghost"
                style={{ fontSize: '0.78rem', padding: '5px 12px', gap: 5 }}>
                <ImageUp size={14} /> Upload QR Image
              </button>
              <button type="button"
                onClick={scanning ? stopScan : startScan}
                className="cc-btn cc-btn-ghost"
                style={{ fontSize: '0.78rem', padding: '5px 12px', gap: 5,
                  borderColor: scanning ? '#f43f5e' : undefined,
                  color:       scanning ? '#f43f5e' : undefined }}>
                <Camera size={14} /> {scanning ? 'Stop Scanning' : 'Scan with Camera'}
              </button>
            </div>

            {/* Hidden file input for QR upload */}
            <input ref={fileInputRef} type="file" accept="image/*"
              style={{ display: 'none' }} onChange={handleFileUpload} />

            {/* Hidden div required by html5-qrcode for file scanning */}
            <div id="lc-qr-reader-upload" style={{ display: 'none' }} />

            {/* Camera scanner */}
            {scanning && (
              <div style={{ marginTop: 12, borderRadius: 10, overflow: 'hidden',
                border: '1px solid var(--cc-border)' }}>
                <div id="lc-qr-reader-camera" style={{ width: '100%', minHeight: 250 }} />
              </div>
            )}

            {/* Scan success message */}
            {scanSuccess && (
              <div style={{ marginTop: 8, background: '#dcfce7', border: '1px solid #86efac',
                borderRadius: 8, padding: '7px 12px', fontSize: '0.8rem', color: '#15803d',
                display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle2 size={13} /> {scanSuccess}
              </div>
            )}
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
                value={form.handlerRole} onChange={set('handlerRole')} style={{ cursor: 'pointer' }}>
                {HANDLER_ROLES.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
          </div>

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
                placeholder="e.g. 4" value={form.temperature} onChange={set('temperature')} required />
            </div>
            <div>
              <label className="cc-label" htmlFor="cp-location">Location / Checkpoint *</label>
              <input id="cp-location" className="cc-input"
                placeholder="e.g. Mumbai Cold Storage, Gate 3"
                value={form.location} onChange={set('location')} required />
            </div>
          </div>

          {/* Wallet display */}
          {account && (
            <div style={{ background: 'var(--cc-slate-2)', borderRadius: 8,
              padding: '10px 14px', marginBottom: 16,
              fontSize: '0.8rem', color: 'var(--cc-muted)',
              display: 'flex', alignItems: 'center', gap: 8 }}>
              <Lock size={13} style={{ flexShrink: 0 }} />
              Logging as: <span style={{ fontFamily: 'monospace', color: 'var(--cc-indigo)', fontWeight: 600 }}>
                {account}
              </span>
            </div>
          )}

          {errorMsg && (
            <div style={{ background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 8,
              padding: '10px 14px', marginBottom: 16, fontSize: '0.83rem', color: '#b91c1c',
              display: 'flex', alignItems: 'center', gap: 6 }}>
              <AlertTriangle size={13} style={{ flexShrink: 0 }} /> {errorMsg}
            </div>
          )}

          <button id="log-checkpoint-submit" type="submit" className="cc-btn cc-btn-primary"
            disabled={status === 'loading' || !account}
            style={{ width: '100%', justifyContent: 'center', marginTop: 4, gap: 6 }}>
            {status === 'loading'
              ? <><div className="cc-spinner" />Sending transaction…</>
              : <><Thermometer size={15} />Log Checkpoint on Blockchain</>}
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
