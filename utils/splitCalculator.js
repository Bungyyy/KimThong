// Calculate equal split for each participant
export const calculateEqualSplit = (totalAmount, participants) => {
    if (!participants || participants.length === 0) return {};
    
    const splitAmount = totalAmount / participants.length;
    const roundedAmount = Math.round(splitAmount * 100) / 100; // Round to 2 decimal places
    
    const result = {};
    let allocatedTotal = 0;
    
    // Assign the rounded amount to each participant
    participants.forEach((participant, index) => {
      if (index === participants.length - 1) {
        // For the last participant, adjust to make sure the total is exact
        result[participant] = Math.round((totalAmount - allocatedTotal) * 100) / 100;
      } else {
        result[participant] = roundedAmount;
        allocatedTotal += roundedAmount;
      }
    });
    
    return result;
  };
  
  // Calculate custom split based on specified amounts
  export const calculateCustomSplit = (totalAmount, customAmounts) => {
    if (!customAmounts || Object.keys(customAmounts).length === 0) return {};
    
    const customTotal = Object.values(customAmounts).reduce((sum, amount) => sum + amount, 0);
    
    // If there's a discrepancy, adjust the last amount
    if (Math.abs(customTotal - totalAmount) > 0.01) {
      const participants = Object.keys(customAmounts);
      const lastParticipant = participants[participants.length - 1];
      
      if (lastParticipant) {
        const adjustment = totalAmount - (customTotal - customAmounts[lastParticipant]);
        customAmounts[lastParticipant] = Math.round(adjustment * 100) / 100;
      }
    }
    
    return customAmounts;
  };
  
  // Calculate how much each person owes to the bill payer
  export const calculateDebts = (totalAmount, splits, payerId) => {
    const debts = [];
    
    for (const [userId, amount] of Object.entries(splits)) {
      if (userId !== payerId && amount > 0) {
        debts.push({
          from: userId,
          to: payerId,
          amount
        });
      }
    }
    
    return debts;
  };