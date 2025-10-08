// Solana Payment Integration for Pump Dex Mini App
const { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const axios = require('axios');

class SolanaPayment {
    constructor() {
        this.connection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com');
        this.MERCHANT_WALLET = process.env.MERCHANT_WALLET || 'G1baEgxW9rFLbPr8M6SmAxEbpeLw5Z5j4xyYwt8emTha';
        this.KOLSCAN_TOKEN_ADDRESS = process.env.KOLSCAN_TOKEN_ADDRESS || 'Db8vz7nh1jbjxVBatBRgQWafqB5iDaW7A1VNh6DmraxP';
    }

    // Check SOL balance of a wallet
    async checkSolBalance(walletAddress) {
        try {
            const publicKey = new PublicKey(walletAddress);
            const balance = await this.connection.getBalance(publicKey);
            return {
                success: true,
                balance: balance / LAMPORTS_PER_SOL,
                lamports: balance
            };
        } catch (error) {
            console.error('Error checking SOL balance:', error);
            return {
                success: false,
                balance: 0,
                error: error.message
            };
        }
    }

    // Check KOLScan token balance
    async checkKolscanBalance(walletAddress) {
        try {
            const publicKey = new PublicKey(walletAddress);
            const tokenAddress = new PublicKey(this.KOLSCAN_TOKEN_ADDRESS);
            
            // Get token accounts for this wallet
            const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(
                publicKey,
                { mint: tokenAddress }
            );

            let balance = 0;
            if (tokenAccounts.value.length > 0) {
                balance = tokenAccounts.value[0].account.data.parsed.info.tokenAmount.uiAmount;
            }

            return {
                success: true,
                balance: balance,
                hasMinimumHold: balance >= 1000,
                tokenAddress: this.KOLSCAN_TOKEN_ADDRESS
            };
        } catch (error) {
            console.error('Error checking KOLScan balance:', error);
            return {
                success: false,
                balance: 0,
                hasMinimumHold: false,
                error: error.message
            };
        }
    }

    // Create payment transaction
    async createPaymentTransaction(fromWallet, amount, subscriptionType) {
        try {
            const fromPublicKey = new PublicKey(fromWallet);
            const toPublicKey = new PublicKey(this.MERCHANT_WALLET);
            
            const transaction = new Transaction();
            
            // Add transfer instruction
            transaction.add(
                SystemProgram.transfer({
                    fromPubkey: fromPublicKey,
                    toPubkey: toPublicKey,
                    lamports: Math.floor(amount * LAMPORTS_PER_SOL)
                })
            );

            // Get recent blockhash
            const { blockhash } = await this.connection.getLatestBlockhash();
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = fromPublicKey;

            return {
                success: true,
                transaction: transaction,
                amount: amount,
                subscriptionType: subscriptionType
            };
        } catch (error) {
            console.error('Error creating payment transaction:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Verify transaction
    async verifyTransaction(signature, expectedAmount) {
        try {
            const transaction = await this.connection.getTransaction(signature, {
                commitment: 'confirmed'
            });

            if (!transaction) {
                return {
                    success: false,
                    error: 'Transaction not found'
                };
            }

            // Check if transaction was successful
            if (transaction.meta.err) {
                return {
                    success: false,
                    error: 'Transaction failed: ' + transaction.meta.err
                };
            }

            // Check if payment was made to our wallet
            const merchantWallet = new PublicKey(this.MERCHANT_WALLET);
            let paymentFound = false;
            let actualAmount = 0;

            for (const instruction of transaction.transaction.message.instructions) {
                if (instruction.programId.equals(SystemProgram.programId)) {
                    const decoded = SystemProgram.decodeTransferInstruction(instruction);
                    if (decoded.keys.to.pubkey.equals(merchantWallet)) {
                        paymentFound = true;
                        actualAmount = decoded.data.lamports / LAMPORTS_PER_SOL;
                        break;
                    }
                }
            }

            if (!paymentFound) {
                return {
                    success: false,
                    error: 'Payment not found in transaction'
                };
            }

            // Verify amount (allow small tolerance for fees)
            const tolerance = 0.001; // 0.001 SOL tolerance
            if (Math.abs(actualAmount - expectedAmount) > tolerance) {
                return {
                    success: false,
                    error: `Amount mismatch. Expected: ${expectedAmount} SOL, Got: ${actualAmount} SOL`
                };
            }

            return {
                success: true,
                amount: actualAmount,
                signature: signature,
                blockTime: transaction.blockTime
            };
        } catch (error) {
            console.error('Error verifying transaction:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Get subscription pricing with KOLScan discount
    async getSubscriptionPricing(subscriptionType, walletAddress = null) {
        try {
            // Testing prices (reduced for testing)
            const basePrices = {
                basic: 0.01,  // 0.01 SOL for testing (normally 0.1 SOL)
                pro: 0.02     // 0.02 SOL for testing (normally 0.25 SOL)
            };

            const basePrice = basePrices[subscriptionType] || basePrices.pro;
            
            let discount = 0;
            let hasKolscanDiscount = false;

            // Check for KOLScan discount if wallet provided
            if (walletAddress) {
                const kolscanBalance = await this.checkKolscanBalance(walletAddress);
                if (kolscanBalance.success && kolscanBalance.hasMinimumHold) {
                    discount = 25; // 25% discount
                    hasKolscanDiscount = true;
                }
            }

            const finalPrice = basePrice * (1 - discount / 100);

            return {
                success: true,
                basePrice: basePrice,
                discount: discount,
                finalPrice: finalPrice,
                hasKolscanDiscount: hasKolscanDiscount,
                currency: 'SOL',
                subscriptionType: subscriptionType
            };
        } catch (error) {
            console.error('Error getting subscription pricing:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Create payment URL for Solana Pay
    async createSolanaPayUrl(amount, subscriptionType, label = 'Pump Dex Subscription') {
        try {
            const recipient = this.MERCHANT_WALLET;
            const reference = this.generateReference(subscriptionType);
            
            // Create Solana Pay URL
            const url = new URL(`solana:${recipient}`);
            url.searchParams.set('amount', amount.toString());
            url.searchParams.set('reference', reference);
            url.searchParams.set('label', label);
            url.searchParams.set('message', `Pump Dex ${subscriptionType} subscription`);

            return {
                success: true,
                url: url.toString(),
                reference: reference,
                amount: amount
            };
        } catch (error) {
            console.error('Error creating Solana Pay URL:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Generate unique reference for transaction
    generateReference(subscriptionType) {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        return `${subscriptionType}_${timestamp}_${random}`;
    }

    // Get transaction history for a wallet
    async getTransactionHistory(walletAddress, limit = 10) {
        try {
            const publicKey = new PublicKey(walletAddress);
            const signatures = await this.connection.getSignaturesForAddress(publicKey, {
                limit: limit
            });

            const transactions = [];
            for (const sig of signatures) {
                const transaction = await this.connection.getTransaction(sig.signature, {
                    commitment: 'confirmed'
                });

                if (transaction) {
                    transactions.push({
                        signature: sig.signature,
                        blockTime: sig.blockTime,
                        confirmationStatus: sig.confirmationStatus,
                        slot: sig.slot,
                        err: sig.err,
                        memo: sig.memo
                    });
                }
            }

            return {
                success: true,
                transactions: transactions
            };
        } catch (error) {
            console.error('Error getting transaction history:', error);
            return {
                success: false,
                error: error.message,
                transactions: []
            };
        }
    }

    // Check if wallet is connected (for frontend integration)
    isWalletConnected() {
        // This would be implemented with Solana wallet adapter
        // For now, return mock data
        return {
            connected: false,
            publicKey: null,
            walletName: null
        };
    }

    // Connect wallet (for frontend integration)
    async connectWallet() {
        // This would be implemented with Solana wallet adapter
        // For now, return mock data
        return {
            success: false,
            error: 'Wallet connection not implemented yet'
        };
    }

    // Get current SOL price in USD
    async getSolPrice() {
        try {
            const response = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
            
            if (response.data && response.data.solana) {
                return {
                    success: true,
                    price: response.data.solana.usd,
                    currency: 'USD'
                };
            } else {
                throw new Error('Failed to fetch SOL price');
            }
        } catch (error) {
            console.error('Error getting SOL price:', error);
            return {
                success: false,
                error: error.message,
                price: 0
            };
        }
    }
}

module.exports = SolanaPayment;
