# ChainChill Comprehensive User Guide

Welcome to the definitive manual for operating the ChainChill Decentralized Application. This guide is built to assist users regardless of their technical familiarity with Web3 architecture.

---

## 👥 Understanding Roles

ChainChill does not rely on a centralized user-database with email logins. Instead, your **MetaMask Wallet Address** acts as your immutable identity.
The UI dynamically adapts to you based on your historic usage:

1. **Manufacturer (Creator)**: The origin point. You register the initial batch on the blockchain, set standard temperature limits, and attach physical QR codes to pallets.
2. **Handlers (Warehouse / Transporter / Receiver)**: The middle-men. You take custody of goods, physically scan their QR code, measure the current physical temperature, and log a checkpoint to legally maintain the chain of custody.
3. **Consumer (Auditor / Public)**: The final verifier. You do not explicitly need a wallet. You simply scan the QR code to see if the medicine or food you are receiving is safe.

---

## 🏭 Core Operations: Step-by-Step

### 1. Registering a New Batch (Manufacturer Phase)

**Navigate To:** `Register Batch` Tab

1. **Connect Wallet:** Click "Connect MetaMask" (Top Right). Ensure your network is set strictly to **Sepolia**.
2. **Enter Batch ID:** Provide a globally unique string (e.g., `PFIZER-VAC-00129`).
3. **Product Information:** Select the product name and its designated category (`Pharma`, `Frozen Food`, `Fresh / Dairy`, `Quick Commerce`).
4. **Temperature Bounds:** 
   - The app will automatically generate mathematical bounds based on your category (e.g., `2°C to 8°C` for Pharma).
   - *Advanced Usage:* You can manually override these bounds on the form if your specific batch requires distinct parameters (e.g., extremely sensitive chemicals).
5. **Set Expiry:** Choose a future date. The ledger permanently records this.
6. **Execute:** Click **Register Batch on Blockchain**. 
   - *MetaMask Action:* A popup will emerge. Review the estimated Gas fee.
   - Click **Confirm**.
   - Do not close the window. Allow ~10-15 seconds for network block confirmation.
7. **Success & Export:** A massive green banner will appear revealing a newly generated QR Code.
   - **CRITICAL:** Use the "Download QR Code" button. Print this image. It must be physically attached to the cargo box/pallet.

---

### 2. Logging a Temperature Checkpoint (Handler Phase)

**Navigate To:** `Log Checkpoint` Tab

When receiving goods, every handler along the line must execute this process to prove they upheld environmental safety standards.

**The Workflow:**
1. **Initialize the Batch ID:** Do not type the batch ID by hand. Use the scanner options:
   - **Upload QR Image:** Click this to open your native OS file picker. Select a photo you just took of the cargo's QR code.
   - **Scan with Camera:** Click this to open an active WebRTC stream. Point your device camera (Mobile rear-facing preferred) at the physical box. It will snap instantly.
   - *Success indicator:* A brief green flash will confirm `Batch ID scanned: XXX`.
2. **Identify Yourself:** Fill in your organization's physical name (e.g., "BlueDart Logistics"). 
3. **Designate Role:** Select `Warehouse/Storage`, `Transporter`, or `Receiver/Retailer`.
4. **Record Environment:** 
   - Enter the current internal temperature reading of the cold-storage unit or cargo bay. 
   - Enter your geographic location (e.g., "Mumbai Cold Storage, Dock 4").
5. **Execute On-Chain:** Click **Log Checkpoint**. 
   - Sign the MetaMask transaction.
6. **Immediate System Feedback:** 
   - If your reading was safe: Green Banner. `Recorded 4°C — within safe range.`
   - If your reading breached the limits: Red Banner. `Recorded 12°C! Product flagged as COMPROMISED.` 
   - *Note:* The system enforces this immutably. You cannot "undo" a breach.

---

### 3. Monitoring Fleet Health (The Dashboard)

**Navigate To:** `Dashboard` Tab

The Dashboard is an automated analysis tool. It cross-references your current wallet address against all thousands of batches on the blockchain to only show what matters to *you*.

**If you are a Manufacturer:**
- You will see the **Manufacturer Overview**.
- It lists all batches *you originally created*.
- **Journey Progress Mechanism:** Features a visual pipeline (`Factory → Warehouse → Truck → Store`). It interrogates the blockchain to see exactly who downstream has handled your items, illuminating the pips dynamically.

**If you are a Handler:**
- You will see the **My Contributions** section.
- It lists batches where you engaged mathematically (scanned/logged) but did not create.
- It isolates *your specific* temperature logs, giving you a legal overview of your compliance history.

**Universal Actions:**
- **Show QR Code:** Click the QR icon on any batch card to display an instant, high-res canvas. This acts as a backup incase physical cargo labels are destroyed mid-transit.

---

### 4. Consumer Auditing (Verify Batch Phase)

**Navigate To:** `Verify Batch` Tab

This is the public-facing feature. It operates using standard Ethereum RPC read-calls. Connecting a wallet is completely optional.

1. **Scan QR:** Click "Open Camera to Scan QR" pointing it at the vial or food packaging.
2. **Instant Status:** The engine halts the UI to present a massive header: **SAFE** (Green checkmark) or **COMPROMISED** (Red X).
3. **The Timeline View:** Scroll down to view the chronological, permanent history:
   - What time it was registered.
   - What time it entered transit.
   - Who touched it.
   - What the exact temperature was at every step.
4. **Verifying Identity:** 
   - Click the small `<External Link>` icons next to Handler addresses. This routes you instantly to Etherscan, proving the cryptographic signature matches the entity claiming they held it.

---

## 🛠️ Edge Cases & Troubleshooting

### Camera Fails to Open
**Issue:** You click "Scan with Camera" and receive an error: `Camera access denied`.
**Resolution:** 
1. Check your browser's URL bar. Ensure you have granted Camera Permissions for `localhost` (or the domain).
2. If using iOS Safari, ensure WebRTC permissions aren't globally restricted.
3. **Fallback:** If all else fails, use your native phone camera app to take a picture of the QR code, then use the **Upload QR Image** button instead.

### MetaMask Rejects Transaction
**Issue:** You click submit, but MetaMask shows a high red warning or instant reject.
**Resolution:**
1. Check your **Network**. You *must* be on `Sepolia`. 
2. Check your **Gas**. You must have Sepolia Testnet ETH (Acquire via `faucet.sepolia.dev`).
3. Check **ID Validity:** The smart contract actively reverts if you attempt to log a checkpoint for a batch that does not exist. Verify the ID via the dashboard first.

### Missing Dashboard Data
**Issue:** Connecting wallet results in 0 batches showing up.
**Resolution:** The dashboard strictly filters events linked directly to your wallet signature. If you just created a fresh MetaMask account, there is zero history attached to it. Register a new batch to spawn data.
