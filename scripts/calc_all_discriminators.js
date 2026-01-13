const crypto = require('crypto');

function getDiscriminator(name) {
    const preimage = `global:${name}`;
    const hash = crypto.createHash('sha256').update(preimage).digest();
    const discriminator = Array.from(hash.subarray(0, 8));
    console.log(`"${name}": [${discriminator.join(', ')}]`);
}

getDiscriminator('create_market');
getDiscriminator('place_bet');
getDiscriminator('resolve_market');
getDiscriminator('claim_reward');
getDiscriminator('claim_creator_fees');
