# 💎 Solana Payment Integration Guide

## Overview
This guide explains how to use and configure Solana payments for Pump Dex Mini App subscriptions.

## Features
- ✅ Solana Pay protocol integration
- ✅ QR code payment modal
- ✅ KOLScan token holder discount (25% off)
- ✅ Transaction verification
- ✅ Automatic subscription activation
- ✅ Mobile-friendly payment flow

## Configuration

### Required Environment Variables
```env
# Solana RPC URL (Mainnet)
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
# OR use Helius for better performance:
# SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_HELIUS_KEY

# Merchant wallet address (where payments go)
MERCHANT_WALLET=YOUR_SOLANA_WALLET_ADDRESS_HERE

# KOLScan token mint address (for discount verification)
KOLSCAN_TOKEN_ADDRESS=YOUR_KOLSCAN_TOKEN_MINT_ADDRESS
```

### Package Dependencies
```json
{
  "@solana/web3.js": "^1.87.0",
  "axios": "^1.6.0"
}
```

## Payment Flow

### 1. User Clicks "Pay with SOL"
```javascript
// In public/script.js
payWithSol('basic'); // or 'pro'
```

### 2. Optional: KOLScan Discount Check
- User can optionally enter their Solana wallet address
- System checks if wallet holds ≥ 1000 $KOLScan tokens
- If yes, 25% discount is automatically applied

### 3. Payment Modal Display
The system shows a modal with:
- **Payment amount** (in SOL)
- **QR code** (for mobile wallets)
- **Payment URL** (copy/paste option)
- **Two action buttons:**
  - "Open in Wallet" - deep link to Phantom/Solflare
  - "I've Paid - Verify" - manual transaction verification

### 4. Payment Methods

#### A. QR Code (Mobile)
1. User scans QR with Phantom, Solflare, or any Solana wallet app
2. Wallet app opens with pre-filled payment details
3. User confirms transaction
4. User clicks "I've Paid - Verify" and enters transaction signature

#### B. Deep Link (Mobile/Desktop)
1. User clicks "Open in Wallet"
2. Wallet app opens automatically
3. User confirms transaction
4. Returns to app and verifies

#### C. Manual Copy/Paste
1. User copies payment URL
2. Opens wallet manually
3. Pastes URL and confirms
4. Returns to app and verifies

### 5. Transaction Verification
```javascript
// System verifies:
- Transaction exists on blockchain
- Payment was sent to correct merchant wallet
- Amount matches subscription price (with tolerance)
- Transaction is confirmed
```

### 6. Subscription Activation
- If verification succeeds:
  - Subscription is created in database
  - User gets immediate access to pro features
  - Confirmation notification shown
  - Page reloads to update UI

## API Endpoints

### Create Payment URL
```http
POST /api/payment/solana
Content-Type: application/json

{
  "userId": "123456789",
  "subscriptionType": "basic",
  "walletAddress": "OPTIONAL_FOR_DISCOUNT"
}
```

**Response:**
```json
{
  "success": true,
  "payment_url": "solana:MERCHANT_WALLET?amount=0.1&reference=basic_1234567890_abc123",
  "amount": 0.1,
  "discount": 0,
  "hasKolscanDiscount": false
}
```

**With KOLScan Discount:**
```json
{
  "success": true,
  "payment_url": "solana:MERCHANT_WALLET?amount=0.075&reference=basic_1234567890_abc123",
  "amount": 0.075,
  "discount": 25,
  "hasKolscanDiscount": true
}
```

### Verify Transaction
```http
POST /api/payment/verify-solana
Content-Type: application/json

{
  "signature": "TRANSACTION_SIGNATURE_HERE",
  "expectedAmount": 0.1,
  "userId": "123456789",
  "subscriptionType": "basic"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Payment verified and subscription created"
}
```

**Response (Failure):**
```json
{
  "success": false,
  "error": "Amount mismatch. Expected: 0.1 SOL, Got: 0.09 SOL"
}
```

### Check KOLScan Balance
```http
GET /api/kolscan/balance/:walletAddress
```

**Response:**
```json
{
  "success": true,
  "balance": 5000,
  "hasMinimumHold": true,
  "tokenAddress": "KOLSCAN_TOKEN_ADDRESS"
}
```

## Subscription Pricing

### Base Prices (SOL)
```javascript
{
  basic: 0.1 SOL,  // ~$10 at $100/SOL
  pro: 0.25 SOL    // ~$25 at $100/SOL
}
```

### With KOLScan Discount (25% off)
```javascript
{
  basic: 0.075 SOL,  // 25% off
  pro: 0.1875 SOL    // 25% off
}
```

## Testing

### Local Testing (Devnet)
1. Change `SOLANA_RPC_URL` to devnet:
```env
SOLANA_RPC_URL=https://api.devnet.solana.com
```

2. Use devnet wallet and get test SOL:
```bash
solana airdrop 1 YOUR_WALLET_ADDRESS --url devnet
```

3. Test payment flow with devnet tokens

### Production Testing (Mainnet)
1. Start with small amounts (0.001 SOL)
2. Verify transaction appears on Solscan.io
3. Check database for subscription creation
4. Test KOLScan discount with real token holder

## Security Considerations

### ✅ Implemented
- Transaction signature verification
- Amount verification with tolerance
- Recipient wallet verification
- Blockchain confirmation check

### ⚠️ Important Notes
1. **Merchant Wallet Security**
   - Store private keys securely (never in code!)
   - Use hardware wallet for large amounts
   - Regular balance checks

2. **Transaction Verification**
   - Always verify on-chain
   - Don't trust client-side data
   - Check confirmation status

3. **Amount Tolerance**
   - Current tolerance: 0.001 SOL
   - Accounts for network fees
   - Prevents exact amount issues

## Troubleshooting

### Common Issues

#### 1. "Payment setup failed"
**Cause:** Backend API error or Solana RPC connection issue
**Solution:**
- Check `MERCHANT_WALLET` is set correctly
- Verify Solana RPC URL is accessible
- Check server logs for detailed error

#### 2. "Verification failed: Transaction not found"
**Cause:** Transaction not yet confirmed or invalid signature
**Solution:**
- Wait 30-60 seconds for confirmation
- Check transaction on Solscan.io
- Verify signature is copied correctly

#### 3. "Amount mismatch"
**Cause:** User sent wrong amount or network fees deducted
**Solution:**
- Check expected amount in subscription tier
- Verify KOLScan discount was applied correctly
- Increase tolerance if needed (currently 0.001 SOL)

#### 4. "KOLScan discount not applied"
**Cause:** Wallet doesn't hold minimum tokens or check failed
**Solution:**
- Verify wallet holds ≥ 1000 $KOLScan
- Check `KOLSCAN_TOKEN_ADDRESS` is correct
- Try entering wallet address again

## Future Enhancements

### Planned Features
- [ ] Automatic transaction monitoring (no manual verification)
- [ ] Real QR code generation (currently placeholder)
- [ ] Multi-currency support (USDC, USDT)
- [ ] Recurring subscriptions with SEPA
- [ ] Refund system
- [ ] Payment history in user dashboard

### QR Code Library Integration
To add real QR codes, install:
```bash
npm install qrcode
```

Then update `generateSolanaQR()` in `script.js`:
```javascript
import QRCode from 'qrcode';

function generateSolanaQR(url) {
    const qrContainer = document.getElementById('solana-qr-code');
    QRCode.toCanvas(url, { width: 200 }, (error, canvas) => {
        if (error) console.error(error);
        qrContainer.appendChild(canvas);
    });
}
```

## Support

For issues or questions:
1. Check server logs: `tail -f logs/server.log`
2. Check Solana transaction: https://solscan.io/
3. Verify database: Check `payments` and `subscriptions` tables
4. Contact: [Your support channel]

## Resources
- [Solana Pay Documentation](https://docs.solanapay.com/)
- [Solana Web3.js](https://solana-labs.github.io/solana-web3.js/)
- [Phantom Wallet](https://phantom.app/)
- [Solflare Wallet](https://solflare.com/)
- [Solscan Explorer](https://solscan.io/)

