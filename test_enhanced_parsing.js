// Test the enhanced amount parsing
function extractAmountFromText(text) {
  const lowerText = text.toLowerCase()
  let foundAmounts = []
  
  // Enhanced Indian number word patterns
  const indianNumberPatterns = [
    // Lakh variations: 2 lakh, 2 lac, 2 lack, 2 लाख
    { pattern: /(\d+(?:\.\d+)?)\s*(?:lakh|lac|lack|लाख)/gi, multiplier: 100000 },
    // Thousand variations: 5 thousand, 5 hajar, 5 हजार
    { pattern: /(\d+(?:\.\d+)?)\s*(?:thousand|hajar|hazar|हजार|k)/gi, multiplier: 1000 },
    // Crore variations: 1 crore, 1 करोड़
    { pattern: /(\d+(?:\.\d+)?)\s*(?:crore|करोड़)/gi, multiplier: 10000000 },
  ]
  
  // Check for Indian number words first
  for (const { pattern, multiplier } of indianNumberPatterns) {
    let match
    while ((match = pattern.exec(text)) !== null) {
      const baseNumber = parseFloat(match[1])
      if (!isNaN(baseNumber) && baseNumber > 0) {
        const amount = baseNumber * multiplier
        if (amount >= 100) {
          foundAmounts.push(amount)
        }
      }
    }
  }
  
  // Regular amount patterns
  const amountPatterns = [
    // Match amounts like ₹200000, 200000, 2,00,000, etc.
    /₹?\s*(\d{1,10}(?:,\d{3})*(?:\.\d{2})?)/g,
    // Match simple numbers like 200000, 50000, etc.
    /(?:^|\s)(\d{2,10})(?:\s|$)/g,
    // Match specific amount keywords
    /(\d+)\s*(?:rs|rupees|rupaiya|₹)/gi,
  ]
  
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
console.log('🧪 Enhanced Amount Parsing Test:')
console.log('2 lakh → ' + extractAmountFromText('2 lakh'))
console.log('5 hajar → ' + extractAmountFromText('5 hajar'))  
console.log('3 thousand → ' + extractAmountFromText('3 thousand'))
console.log('1 crore → ' + extractAmountFromText('1 crore'))
console.log('200000 → ' + extractAmountFromText('200000'))
console.log('create loan for raj 2 lakh rupees → ' + extractAmountFromText('create loan for raj 2 lakh rupees'))
console.log('give 5 hajar to priya → ' + extractAmountFromText('give 5 hajar to priya'))
