// pricingService.js - Phase 1 stub for pricing logic
module.exports = {
  computeMultiplier: function(totalPool, optionTotal) {
    // simple inverse-proportion multiplier (placeholder for LMSR/CPMM)
    if (!totalPool || totalPool <= 0) return 2;
    const share = Number(optionTotal) / Number(totalPool);
    const odds = Math.max(share * 100, 1);
    return 100 / odds; // e.g., if odds 50 -> multiplier 2
  },

  computeOdds: function(totalPool, optionTotal) {
    if (!totalPool || totalPool <= 0) return 50;
    return (Number(optionTotal) / Number(totalPool)) * 100;
  }
};
