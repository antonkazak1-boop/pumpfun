// Minimal wallet metadata resolver extracted from n8n "wallet map" node
// Keep keys in lowercase for case-insensitive lookup

function toLower(value) {
    return (value || '').toString().trim().toLowerCase();
}

// TODO: Replace this sample with the full 312-entry map from n8n
const WALLET_MAP = {
    "dymsqudnqjyydvq86xmzavru9t7xwfqewh6gpqw9tpnf": { name: "unprofitable", telegram: null, twitter: "https://x.com/exitliquid1ty" },
    "5rkpdk4jnvaumgzev2zu8vjggmtthddtrsd5o9dhgzhd": { name: "Dave Portnoy", telegram: null, twitter: "https://x.com/stoolpresidente" },
};

function resolveWalletMeta(walletAddress) {
    const key = toLower(walletAddress);
    const meta = WALLET_MAP[key] || null;
    return {
        wallet_name: meta ? meta.name : null,
        wallet_telegram: meta ? meta.telegram : null,
        wallet_twitter: meta ? meta.twitter : null,
    };
}

module.exports = { resolveWalletMeta };


