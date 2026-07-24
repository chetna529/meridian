// LMSR (Logarithmic Market Scoring Rule) automated market maker.
// q = array of shares outstanding per option. b = liquidity parameter (bigger b = deeper, less volatile market).
// Each share pays out $1 if its option wins, $0 otherwise, so 0 <= price_i <= 1 and sum(price_i) ~= 1.

function cost(q, b) {
  const maxQ = Math.max(...q);
  // shift by maxQ/b for numerical stability (cost function is translation-invariant under this shift)
  const sumExp = q.reduce((sum, qi) => sum + Math.exp((qi - maxQ) / b), 0);
  return maxQ + b * Math.log(sumExp);
}

function price(q, b) {
  const maxQ = Math.max(...q);
  const exps = q.map((qi) => Math.exp((qi - maxQ) / b));
  const sumExp = exps.reduce((s, v) => s + v, 0);
  return exps.map((e) => e / sumExp);
}

function costToBuyShares(q, optionIndex, shares, b) {
  const qAfter = [...q];
  qAfter[optionIndex] += shares;
  return cost(qAfter, b) - cost(q, b);
}

// Binary-search the number of shares of `optionIndex` that can be bought for `budget` dollars.
function sharesForBudget(q, optionIndex, budget, b, maxIterations = 100) {
  if (budget <= 0) return 0;
  let lo = 0;
  let hi = Math.max(budget * 5, 10); // seed an upper bound, then grow if needed
  while (costToBuyShares(q, optionIndex, hi, b) < budget && hi < 1e9) {
    hi *= 2;
  }
  for (let i = 0; i < maxIterations; i++) {
    const mid = (lo + hi) / 2;
    const c = costToBuyShares(q, optionIndex, mid, b);
    if (Math.abs(c - budget) < 1e-6) return mid;
    if (c > budget) hi = mid;
    else lo = mid;
  }
  return (lo + hi) / 2;
}

module.exports = { cost, price, costToBuyShares, sharesForBudget };
