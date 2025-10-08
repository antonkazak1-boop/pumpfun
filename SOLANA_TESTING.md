# 🧪 Solana Payment Testing Guide

## ✅ Configuration Applied

### Test Wallet Configuration
```
Merchant Wallet: G1baEgxW9rFLbPr8M6SmAxEbpeLw5Z5j4xyYwt8emTha
KOLScan Token: Db8vz7nh1jbjxVBatBRgQWafqB5iDaW7A1VNh6DmraxP
```

### Test Pricing (Reduced for Testing)
```
Basic: 0.01 SOL (~$1 at $100/SOL)
Pro:   0.02 SOL (~$2 at $100/SOL)

With 25% KOLScan Discount:
Basic: 0.0075 SOL
Pro:   0.015 SOL
```

## 🧪 Testing Steps

### 1. Test Without KOLScan Discount

#### Step 1: Open Mini App
1. Open Telegram Bot
2. Click "Subscribe" button
3. Choose "Basic" or "Pro"
4. Click "☀️ Pay with SOL"

#### Step 2: Make Payment
1. Modal opens with payment details
2. **Option A (Mobile)**: Click "Open in Wallet"
   - Phantom/Solflare opens automatically
   - Confirm transaction
   
   **Option B (Desktop/Manual)**:
   - Copy payment URL
   - Paste in your wallet
   - Confirm transaction

#### Step 3: Verify Transaction
1. Wait 30-60 seconds for confirmation
2. Copy transaction signature from wallet
3. Click "I've Paid - Verify"
4. Paste signature
5. System verifies on-chain
6. ✅ Subscription activated!

### 2. Test With KOLScan Discount (25% off)

#### Prerequisites
Your wallet must hold ≥ 1000 KOLScan tokens
Token Address: `Db8vz7nh1jbjxVBatBRgQWafqB5iDaW7A1VNh6DmraxP`

#### Step 1: Enter Wallet for Discount
1. Click "Pay with SOL"
2. When prompted, enter your wallet address
3. System checks KOLScan balance
4. If ≥ 1000 tokens → 25% discount applied!

#### Step 2: Verify Discount
```
Without discount: 0.01 SOL → With discount: 0.0075 SOL
Without discount: 0.02 SOL → With discount: 0.015 SOL
```

#### Step 3: Complete Payment
Same as above - pay discounted amount

### 3. Verify in Database

Check `payments` table:
```sql
SELECT * FROM payments 
WHERE user_id = YOUR_TELEGRAM_ID 
ORDER BY created_at DESC 
LIMIT 5;
```

Check `subscriptions` table:
```sql
SELECT * FROM subscriptions 
WHERE user_id = YOUR_TELEGRAM_ID 
ORDER BY created_at DESC 
LIMIT 5;
```

Should see:
- ✅ `payment_method = 'solana'`
- ✅ `amount_sol = 0.01` or `0.02` (or discounted)
- ✅ `transaction_signature = YOUR_TX_SIGNATURE`
- ✅ `confirmed_at IS NOT NULL`
- ✅ Subscription `tier_name = 'basic'` or `'pro'`
- ✅ Subscription `status = 'active'`

## 🔍 Verification on Blockchain

### Solscan.io
1. Go to https://solscan.io/
2. Paste transaction signature
3. Verify:
   - ✅ Status: Success
   - ✅ To: G1baEgxW9rFLbPr8M6SmAxEbpeLw5Z5j4xyYwt8emTha
   - ✅ Amount: 0.01 or 0.02 SOL
   - ✅ Recent timestamp

### Solana Explorer
1. Go to https://explorer.solana.com/
2. Paste transaction signature
3. Check same details

## 🐛 Troubleshooting

### Issue: "Payment setup failed"
**Cause:** Backend can't connect to Solana RPC
**Solution:**
- Check server logs
- Verify `SOLANA_RPC_URL` is accessible
- Try alternative RPC (e.g., Helius)

### Issue: "Transaction not found"
**Cause:** Transaction not confirmed yet or wrong signature
**Solution:**
- Wait 30-60 seconds
- Check transaction on Solscan
- Copy signature correctly (no spaces)

### Issue: "Amount mismatch"
**Cause:** Sent wrong amount or network fees
**Solution:**
- Check expected amount in modal
- Verify KOLScan discount applied correctly
- Current tolerance: 0.001 SOL

### Issue: "KOLScan discount not applied"
**Cause:** Wallet doesn't hold enough tokens
**Solution:**
- Verify wallet holds ≥ 1000 KOLScan
- Check correct token address
- Try entering wallet again

### Issue: "Subscription not activated"
**Cause:** Verification failed or database error
**Solution:**
- Check server logs for errors
- Manually check database
- Contact support with transaction signature

## 📊 Test Scenarios

### Scenario 1: Basic Payment (Happy Path)
1. ✅ User clicks "Pay with SOL (Basic)"
2. ✅ Doesn't enter wallet (no discount)
3. ✅ Modal shows 0.01 SOL
4. ✅ User pays 0.01 SOL
5. ✅ User enters signature
6. ✅ System verifies on-chain
7. ✅ Subscription activated

### Scenario 2: Pro Payment with Discount
1. ✅ User clicks "Pay with SOL (Pro)"
2. ✅ Enters wallet with ≥ 1000 KOLScan
3. ✅ Modal shows discount badge
4. ✅ Modal shows 0.015 SOL (25% off 0.02)
5. ✅ User pays 0.015 SOL
6. ✅ System verifies
7. ✅ Subscription activated

### Scenario 3: Wrong Amount
1. ✅ User clicks "Pay with SOL"
2. ✅ Modal shows 0.01 SOL
3. ❌ User pays 0.005 SOL (wrong amount)
4. ❌ Verification fails: "Amount mismatch"
5. ✅ User notified to pay correct amount

### Scenario 4: Invalid Signature
1. ✅ User clicks "Pay with SOL"
2. ✅ User pays correctly
3. ❌ User enters wrong signature
4. ❌ Verification fails: "Transaction not found"
5. ✅ User can retry with correct signature

## 🔒 Security Checklist

- [x] Transaction signature verified on-chain
- [x] Amount verified (with 0.001 SOL tolerance)
- [x] Recipient wallet verified
- [x] Confirmation status checked
- [x] Database error handling
- [x] Pool error handling (prevents crash)

## 📝 Next Steps After Testing

### If Tests Pass:
1. ✅ Update prices to production values
2. ✅ Update `MERCHANT_WALLET` to production wallet
3. ✅ Update `KOLSCAN_TOKEN_ADDRESS` if needed
4. ✅ Enable real QR code generation
5. ✅ Test on mainnet with real funds

### Production Prices:
```javascript
basic: {
    sol: 0.1,   // $10 at $100/SOL
    stars: 100
},
pro: {
    sol: 0.25,  // $25 at $100/SOL
    stars: 250
}
```

## 💡 Tips

1. **Test with Devnet first**
   - Use devnet RPC
   - Get free test SOL
   - No risk

2. **Test with small amounts**
   - Current: 0.01-0.02 SOL
   - Safe for testing
   - Easy to verify

3. **Keep transaction signatures**
   - For debugging
   - For support tickets
   - For database verification

4. **Monitor server logs**
   - Watch for errors
   - Check verification process
   - Debug payment flow

5. **Check database after each test**
   - Verify records created
   - Check amounts correct
   - Confirm status updates

## 📞 Support

If you encounter any issues:
1. Check server logs
2. Verify transaction on Solscan
3. Check database records
4. Review error messages
5. Contact with transaction signature

---

**Happy Testing! 🚀**

