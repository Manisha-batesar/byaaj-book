# Gemini AI Integration - Quick Start Guide

## Overview

Your ByajBook app now includes powerful AI features powered by Google's Gemini AI, along with voice interaction capabilities. This guide will help you get started quickly.

## Step 1: Configure Gemini AI

### Option A: Environment File (Recommended)
1. Create or edit `.env.local` in your project root:
   ```
   NEXT_PUBLIC_GEMINI_API_KEY=your_api_key_here
   ```

2. Get your free API key from [Google AI Studio](https://aistudio.google.com/app/apikey)

3. Restart your development server:
   ```bash
   npm run dev
   ```

### Option B: In-App Setup
1. Open your app and go to Settings
2. Click "AI Setup" in the header
3. Follow the setup instructions
4. Test your connection

## Step 2: Using the AI Assistant

### Accessing the Assistant
- **Dashboard**: Click the bot icon in the top header
- **Loan Details**: Bot icon provides context-aware help
- **Anywhere**: The assistant understands your loan portfolio

### Text Interaction
1. Click the bot icon to open the AI Assistant
2. Type your question in English or Hindi
3. Get intelligent responses about loan management

### Voice Interaction (Chrome/Edge recommended)
1. Click the bot icon to open the AI Assistant
2. Click the microphone button
3. Speak your question clearly
4. AI will process your speech and respond
5. Responses can be read aloud automatically

## Step 3: Example Conversations

### Getting Started
**User**: "How do I calculate simple interest?"

**AI**: "Simple interest is calculated using the formula: Interest = (Principal × Rate × Time) / 100. In ByajBook, when you select 'yearly' interest method with simple interest type, this formula is applied automatically..."

### Portfolio Analysis
**User**: "Analyze my loan portfolio"

**AI**: "Based on your current loans, you have ₹50,000 total lent across 3 active loans. Your collection rate is 80%, with ₹10,000 still outstanding. I recommend focusing on the overdue loan from John Doe..."

### Hindi Support
**User**: "संकड़ा ब्याज विधि समझाएं"

**AI**: "संकड़ा विधि एक पारंपरिक ब्याज गणना तरीका है जो 12% वार्षिक ब्याज दर का उपयोग करता है। यह आमतौर पर मासिक आधार पर गणना की जाती है..."

## Features Included

### AI Capabilities
- ✅ Loan management advice
- ✅ Interest calculation explanations
- ✅ Portfolio analysis
- ✅ Financial recommendations
- ✅ Context-aware responses
- ✅ Bilingual support (English/Hindi)

### Voice Features
- ✅ Speech-to-text input
- ✅ Text-to-speech output
- ✅ Hands-free interaction
- ✅ Multi-language voice support

### Smart Features
- ✅ Remembers conversation context
- ✅ Understands your loan data
- ✅ Provides personalized advice
- ✅ Suggested prompts
- ✅ Conversation history

## Browser Compatibility

### Best Experience
- **Chrome/Chromium**: Full voice features
- **Microsoft Edge**: Full voice features

### Limited Support
- **Safari**: Basic voice features
- **Firefox**: Basic voice features
- **Mobile browsers**: Voice features may vary

## Privacy & Security

### Data Protection
- 🔒 All conversations stored locally
- 🔒 API key stored in environment variables
- 🔒 No data sent to third-party servers
- 🔒 Works completely offline (except AI responses)

### API Usage
- 🆓 Gemini API has generous free tier
- 📊 Monitor usage in Google AI Studio
- 🔄 Rate limits handled automatically

## Troubleshooting

### AI Not Working
1. **Check API Key**: Verify it's correctly set in `.env.local`
2. **Test Connection**: Use the AI Setup page
3. **Restart Server**: After changing environment variables
4. **Check Console**: Look for error messages in browser dev tools

### Voice Not Working
1. **Browser Support**: Use Chrome or Edge
2. **Microphone Permission**: Allow when prompted
3. **Secure Context**: Use HTTPS in production
4. **Quiet Environment**: Reduce background noise

### Common Issues
- **"API key not configured"**: Add key to `.env.local`
- **Voice recognition errors**: Check microphone permissions
- **Slow responses**: Normal for AI processing (2-3 seconds)
- **Network errors**: Check internet connection

## Next Steps

### Explore More Features
1. Try voice commands on different pages
2. Ask for loan management advice
3. Request portfolio analysis
4. Use Hindi voice commands
5. Explore conversation history

### Advanced Usage
- Ask specific questions about your loans
- Request calculations for different scenarios
- Get advice on overdue payments
- Learn about interest methods
- Analyze borrower patterns

## Support

If you encounter any issues:
1. Check this guide first
2. Use the AI Setup page for diagnostics
3. Review browser console for errors
4. Ensure API key is valid and has quota

---

**Enjoy your enhanced ByajBook experience with AI!** 🤖💰
