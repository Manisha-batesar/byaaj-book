// Test the improved amount parsing function
const extractAmountFromText = (text) => {
  const amountPatterns = [
    // Match amounts like ₹200000, 200000, 2,00,000, etc.
    /₹?\s*(\d{1,10}(?:,\d{3})*(?:\.\d{2})?)/g,
    // Match simple numbers like 200000, 50000, etc.
    /(?:^|\s)(\d{2,10})(?:\s|$)/g,
    // Match specific amount keywords
    /(\d+)\s*(?:rs|rupees|rupaiya|₹)/gi,
  ]
  
  let foundAmounts = []
  
  for (const pattern of amountPatterns) {
    let match
    while ((match = pattern.exec(text)) !== null) {
      const numberStr = match[1].replace(/[₹,\s]/g, '')
      const amount = parseFloat(numberStr)
      if (!isNaN(amount) && amount > 0 && amount >= 100) { // Minimum loan amount 100
        foundAmounts.push(amount)
      }
    }
  }
  
  // Return the largest valid amount found (most likely to be the loan amount)
  return foundAmounts.length > 0 ? Math.max(...foundAmounts) : null
}

// Test cases
console.log('Testing amount extraction:')
console.log('200000 →', extractAmountFromText('200000')) // Should return 200000, not 200
console.log('₹200000 →', extractAmountFromText('₹200000')) // Should return 200000
console.log('2,00,000 →', extractAmountFromText('2,00,000')) // Should return 200000
console.log('create loan for raj 200000 rupees →', extractAmountFromText('create loan for raj 200000 rupees')) // Should return 200000
console.log('50000 rs →', extractAmountFromText('50000 rs')) // Should return 50000
console.log('add loan 1000000 for priya →', extractAmountFromText('add loan 1000000 for priya')) // Should return 1000000
console.log('just 200 →', extractAmountFromText('just 200')) // Should return 200 (still valid)
console.log('no amount →', extractAmountFromText('no amount here')) // Should return null
