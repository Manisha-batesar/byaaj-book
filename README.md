# ByajBook - Loan Management App with AI Integration

A comprehensive loan management application built with Next.js, featuring Gemini AI integration and voice capabilities for enhanced user interaction.

## Features

### Core Features
- **Loan Management**: Create, edit, and track personal loans
- **Interest Calculations**: Support for multiple interest calculation methods:
  - Monthly Interest
  - Yearly Interest (Simple)
  - Sankda Method (12% yearly)
- **Payment Tracking**: Record and monitor loan payments
- **Due Date Reminders**: Get notified about upcoming due dates
- **Multi-language Support**: English and Hindi interface
- **Offline-first**: All data stored locally on device

### AI Features (NEW!)
- **Gemini AI Assistant**: Get intelligent responses about loan management
- **Voice Input**: Speech-to-text for hands-free interaction
- **Text-to-Speech**: AI responses can be spoken aloud
- **Context-aware Responses**: AI understands your loan portfolio
- **Financial Advice**: Get suggestions based on your lending patterns

## Setup Instructions

### Prerequisites
- Node.js 18+ installed
- A Gemini AI API key (free from Google AI Studio)

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd byaj_Book-App
   ```

2. **Install dependencies**
   ```bash
   npm install --legacy-peer-deps
   ```

3. **Configure Gemini AI**
   
   a. Get your free API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
   
   b. Create a `.env.local` file in the project root:
   ```bash
   NEXT_PUBLIC_GEMINI_API_KEY=your_actual_api_key_here
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Production Deployment

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Start the production server**
   ```bash
   npm start
   ```

## AI Assistant Configuration

### Getting Gemini API Key

1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated key
5. Add it to your `.env.local` file

### Environment Variables

Create a `.env.local` file with the following variables:

```env
# Gemini AI Configuration
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key_here

# App Configuration
NEXT_PUBLIC_APP_NAME=ByajBook
NEXT_PUBLIC_APP_VERSION=1.0.0
```

### Voice Features

The app automatically detects browser support for:
- **Speech Recognition**: Converts voice to text
- **Text-to-Speech**: Reads AI responses aloud

Supported browsers:
- Chrome/Chromium-based browsers (recommended)
- Safari (limited support)
- Firefox (limited support)

## Using the AI Assistant

### Accessing the AI Assistant

1. **From Dashboard**: Click the Bot icon in the header
2. **From Loan Details**: Click the Bot icon to get context-aware help
3. **Settings**: Configure AI features in Settings > AI Setup

### Voice Interaction

1. **Voice Input**: 
   - Click the microphone button
   - Speak your question clearly
   - AI will process and respond

2. **Voice Output**:
   - AI responses can be read aloud
   - Automatic for voice-initiated conversations
   - Manual control available

### Example Questions

**General Loan Management:**
- "How do I calculate simple interest?"
- "What's the difference between monthly and yearly interest?"
- "Explain the Sankda interest method"

**Portfolio Analysis:**
- "Analyze my loan portfolio"
- "Which loans should I prioritize for collection?"
- "How can I improve my recovery rate?"

**Hindi Support:**
- "साधारण ब्याज की गणना कैसे करें?"
- "मेरे ऋण पोर्टफोलियो का विश्लेषण करें"
- "संकड़ा ब्याज विधि समझाएं"

## Project Structure

```
src/
├── app/                    # Next.js app router pages
├── components/             # React components
│   ├── ui/                # Shadcn UI components
│   ├── ai-assistant.tsx   # AI chat interface
│   └── ai-setup.tsx       # AI configuration
├── lib/                   # Utility libraries
│   ├── gemini.ts         # Gemini AI integration
│   ├── voice.ts          # Voice recognition/synthesis
│   ├── storage.ts        # Local storage utilities
│   └── language.ts       # Internationalization
└── styles/               # Global styles
```

## Technologies Used

### Core Stack
- **Next.js 15**: React framework with app router
- **TypeScript**: Type-safe JavaScript
- **Tailwind CSS**: Utility-first CSS framework
- **Shadcn/ui**: Beautiful UI components

### AI Integration
- **@google/generative-ai**: Official Gemini AI SDK
- **Web Speech API**: Browser-native voice features
- **Local Storage**: Offline-first data persistence

## Privacy & Security

- **Local Storage**: All loan data stored on device
- **No External Servers**: Data never leaves your device
- **API Key Security**: Gemini API key stored locally
- **Optional PIN Protection**: Secure app access
- **Offline Capable**: Works without internet connection

## Troubleshooting

### Common Issues

1. **AI Assistant Not Working**
   - Check if API key is configured in `.env.local`
   - Verify API key is valid in Google AI Studio
   - Use the "Test Connection" feature in AI Setup

2. **Voice Features Not Available**
   - Use Chrome/Chromium-based browsers
   - Ensure microphone permissions are granted
   - Check browser compatibility

3. **Build Errors**
   - Use `--legacy-peer-deps` flag with npm install
   - Check Node.js version (18+ required)

### Performance Tips

- **Voice Recognition**: Works best in quiet environments
- **API Responses**: May take 2-3 seconds for complex queries
- **Local Storage**: No limits on offline usage

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -m 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For issues and questions:
1. Check the troubleshooting section above
2. Use the AI Setup page for configuration help
3. Create an issue in the repository

---

**Note**: This app is designed for personal use and small-scale money lending. Always follow local laws and regulations when lending money.
