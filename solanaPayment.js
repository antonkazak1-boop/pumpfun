// Solana Payment Integration for Sol Fun
const { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const axios = require('axios');

class SolanaPayment {
    constructor() {
        // Use better RPC endpoints (Helius recommended, fallback to public)
        const rpcUrl = process.env.SOLANA_RPC_URL || 
                       process.env.HELIUS_RPC_URL ||
                       'https://api.mainnet-beta.solana.com'; // FREE public RPC (no auth required)
        
        this.connection = new Connection(rpcUrl, {
            commitment: 'confirmed',
            confirmTransactionInitialTimeout: 60000 // 60 seconds timeout
        });
        
        this.MERCHANT_WALLET = process.env.MERCHANT_WALLET || 'G1baEgxW9rFLbPr8M6SmAxEbpeLw5Z5j4xyYwt8emTha';
        this.KOLSCAN_TOKEN_ADDRESS = process.env.KOLSCAN_TOKEN_ADDRESS || 'Db8vz7nh1jbjxVBatBRgQWafqB5iDaW7A1VNh6DmraxP';
        
        console.log('🔗 Solana RPC:', rpcUrl.includes('api-key') ? rpcUrl.split('?')[0] + '?api-key=***' : rpcUrl);
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
    async verifyTransaction(signature, expectedAmount, expectedFromWallet = null) {
        try {
            console.log('🔍 Verifying transaction:', signature);
            console.log('💰 Expected amount:', expectedAmount, 'SOL');
            console.log('🔗 RPC URL:', this.connection.rpcEndpoint);
            
            // Try multiple RPC endpoints for reliability
            let transaction = null;
            const rpcEndpoints = [
                this.connection.rpcEndpoint, // Primary
                'https://api.mainnet-beta.solana.com', // Public fallback
                'https://solana-api.projectserum.com' // Serum fallback
            ];
            
            for (const rpc of rpcEndpoints) {
                try {
                    console.log(`Trying RPC: ${rpc}`);
                    const conn = new Connection(rpc, { commitment: 'confirmed' });
                    transaction = await conn.getTransaction(signature, {
                        commitment: 'confirmed',
                        maxSupportedTransactionVersion: 0
                    });
                    
                    if (transaction) {
                        console.log(`✅ Transaction found on: ${rpc}`);
                        break;
                    }
                } catch (rpcError) {
                    console.log(`❌ RPC ${rpc} failed:`, rpcError.message);
                    continue;
                }
            }

            if (!transaction) {
                console.log('❌ Transaction not found on any RPC');
                return {
                    success: false,
                    error: 'Transaction not found on Solana. Please wait 30-60 seconds for confirmation and try again.'
                };
            }
            
            console.log('✅ Transaction found at slot:', transaction.slot);

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
            let actualFromWallet = null;

            // Parse transaction to find SOL transfer
            const accountKeys = transaction.transaction.message.accountKeys;
            const instructions = transaction.transaction.message.instructions;

            for (const instruction of instructions) {
                try {
                    // Get program ID from accountKeys
                    const programId = accountKeys[instruction.programIdIndex];
                    
                    if (!programId) continue;
                    
                    // Check if it's a System Program transfer
                    if (programId.equals(SystemProgram.programId)) {
                        // Manual decode of transfer instruction
                        const data = instruction.data;
                        
                        // Check if it's a transfer (instruction type 2)
                        if (data && data.length >= 12 && data[0] === 2) {
                            // Get accounts involved in transfer
                            const fromIndex = instruction.accounts[0];
                            const toIndex = instruction.accounts[1];
                            
                            if (fromIndex === undefined || toIndex === undefined) continue;
                            
                            const fromAddress = accountKeys[fromIndex];
                            const toAddress = accountKeys[toIndex];
                            
                            if (!fromAddress || !toAddress) continue;
                            
                            // Check if transfer is to our merchant wallet
                            if (toAddress.equals(merchantWallet)) {
                                // Extract amount (8 bytes after instruction type, starting at byte 4)
                                try {
                                    const amountBuffer = Buffer.from(data.slice(4, 12));
                                    const lamports = amountBuffer.readBigUInt64LE(0);
                                    actualAmount = Number(lamports) / LAMPORTS_PER_SOL;
                                    actualFromWallet = fromAddress.toBase58();
                                    paymentFound = true;
                                    break;
                                } catch (bufferError) {
                                    console.log('Error reading amount from buffer:', bufferError.message);
                                    continue;
                                }
                            }
                        }
                    }
                } catch (err) {
                    console.log('Error parsing instruction:', err.message);
                    continue;
                }
            }

            if (!paymentFound) {
                return {
                    success: false,
                    error: 'Payment not found in transaction'
                };
            }

            // If expectedFromWallet is provided, verify sender matches
            if (expectedFromWallet) {
                if (!actualFromWallet || actualFromWallet !== expectedFromWallet) {
                    return {
                        success: false,
                        error: `Payment must come from wallet used for discount: ${expectedFromWallet}`
                    };
                }
            }

            // Verify amount (allow small tolerance for fees)
            const tolerance = 0.001; // 0.001 SOL tolerance
            if (Math.abs(actualAmount - expectedAmount) > tolerance) {
                return {
                    success: false,
                    error: `Amount mismatch. Expected: ${expectedAmount} SOL, Got: ${actualAmount} SOL`
                };
            }

            // Check transaction is recent (within last 10 minutes)
            const now = Math.floor(Date.now() / 1000);
            if (transaction.blockTime && (now - transaction.blockTime) > 600) {
                return {
                    success: false,
                    error: 'Transaction is too old. Please make a new payment.'
                };
            }

            return {
                success: true,
                amount: actualAmount,
                signature: signature,
                blockTime: transaction.blockTime,
                fromWallet: actualFromWallet
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
    async createSolanaPayUrl(amount, subscriptionType, label = 'Sol Fun Subscription') {
        try {
            const recipient = this.MERCHANT_WALLET;
            const reference = this.generateReference(subscriptionType);
            
            // Create Solana Pay URL
            const url = new URL(`solana:${recipient}`);
            url.searchParams.set('amount', amount.toString());
            url.searchParams.set('reference', reference);
            url.searchParams.set('label', label);
            url.searchParams.set('message', `Sol Fun ${subscriptionType} subscription`);

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
