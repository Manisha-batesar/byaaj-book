// Test file to verify goodbye patterns work correctly
console.log('🧪 Testing Goodbye Patterns...\n');

// Simulate the detectGoodbyeIntent function
function detectGoodbyeIntent(message) {
  const lowerMessage = message.toLowerCase().trim();
  
  const goodbyePatterns = [
    // Basic goodbyes
    /^(bye|goodbye|alvida)$/i,
    // Thank you + bye combinations
    /^(thank you|thanks|thanku|dhanyawad|shukriya)\s+(bye|goodbye)$/i,
    /^(bye|goodbye)\s+(thanks|thank you|thanku|dhanyawad)$/i,
    // OK + bye combinations
    /^(ok|okay|oky|okhy|thik|theek)\s+(bye|goodbye)$/i,
    /^(bye|goodbye)\s+(ok|okay|oky|thik|theek)$/i,
    // Common variations
    /^(ok bye|okay bye|oky bye|okhy bye)$/i,
    /^(thank you bye|thanks bye|thanku bye)$/i,
    /^(bye thank you|bye thanks|bye thanku)$/i,
    // Hindi variations
    /^(dhanyawad bye|shukriya bye|theek bye|thik bye)$/i,
    /^(bye dhanyawad|bye shukriya|bye theek)$/i,
    // Single word variations that sound like bye
    /^(byr|bai|bhy|byee|byeee)$/i,
    // Exit commands
    /^(exit|close|quit|band|khatam|gaya|done|finish|over)$/i,
    // Polite closures
    /^(that'?s all|bas|enough|khatam|ho gaya|done hai)$/i
  ];
  
  return goodbyePatterns.some(pattern => pattern.test(lowerMessage));
}

// Test cases
const testCases = [
  // Basic cases
  'bye', 'goodbye', 'byr', 
  
  // Thank you + bye combinations
  'thank you bye', 'thanks bye', 'thanku bye',
  'bye thank you', 'bye thanks', 'bye thanku',
  
  // OK + bye combinations  
  'ok bye', 'okay bye', 'oky bye', 'okhy bye',
  'bye ok', 'bye okay',
  
  // Hindi variations
  'dhanyawad bye', 'shukriya bye', 'theek bye',
  'bye dhanyawad', 'bye shukriya',
  
  // Exit commands
  'exit', 'close', 'quit', 'done', 'finish',
  'band', 'khatam', 'gaya',
  
  // Edge cases
  'byee', 'byeee', 'bhy', 'bai',
  
  // Should NOT match (false positives)
  'thank you', 'thanks', 'ok', 'okay', 'hello bye friend'
];

console.log('✅ SHOULD MATCH (goodbye patterns):');
testCases.forEach(testCase => {
  const result = detectGoodbyeIntent(testCase);
  const status = result ? '✅' : '❌';
  
  // Only show the ones that should match based on our patterns
  if (['bye', 'goodbye', 'byr', 'thank you bye', 'thanks bye', 'thanku bye', 
       'bye thank you', 'bye thanks', 'bye thanku', 'ok bye', 'okay bye', 
       'oky bye', 'okhy bye', 'bye ok', 'bye okay', 'dhanyawad bye', 
       'shukriya bye', 'theek bye', 'bye dhanyawad', 'bye shukriya', 
       'exit', 'close', 'quit', 'done', 'finish', 'band', 'khatam', 
       'gaya', 'byee', 'byeee', 'bhy', 'bai'].includes(testCase)) {
    console.log(`${status} "${testCase}" -> ${result}`);
  }
});

console.log('\n❌ SHOULD NOT MATCH (false positives):');
const shouldNotMatch = ['thank you', 'thanks', 'ok', 'okay', 'hello bye friend', 'goodbye my friend'];
shouldNotMatch.forEach(testCase => {
  const result = detectGoodbyeIntent(testCase);
  const status = result ? '❌ WRONG!' : '✅ CORRECT';
  console.log(`${status} "${testCase}" -> ${result}`);
});

console.log('\n🎯 Summary: Updated AI Assistant to handle these goodbye variations:');
console.log('• Basic: bye, goodbye, byr, byee');
console.log('• Thank you + bye: thank you bye, thanks bye, bye thanks');
console.log('• OK + bye: ok bye, okay bye, oky bye, okhy bye'); 
console.log('• Hindi: dhanyawad bye, shukriya bye, theek bye');
console.log('• Exit commands: exit, close, quit, done, finish');
console.log('• Single variations: byr, bai, bhy, byee, byeee');
console.log('\n✨ The AI will now close automatically after 2 seconds when these patterns are detected!');
