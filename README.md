# Witty AI Voice Assistant

A conversational AI assistant that uses speech-to-text and text-to-speech capabilities, powered by Google's Gemini AI. The assistant is designed to be witty and engaging, providing humorous responses in a natural, conversational style.

## Live Demo

- 🌐 Try it live: [Witty AI Voice Assistant](https://voice-to-voice-llm.vercel.app/)
- 🎥 Watch demo video: [View Demo](./media/demo.mp4)

## Features

- 🎤 Real-time voice recording and processing
- 🤖 Powered by Google's Gemini AI for intelligent responses
- 🗣️ Text-to-speech conversion for natural dialogue
- 💬 Witty and humorous responses
- 🎨 Modern, responsive UI with visual feedback
- ⚡ Fast processing and response times

## Tech Stack

### Frontend
- React
- styled-components for styling
- axios for API calls
- Web Audio API for voice recording
- Deployed on Vercel

### Backend
- Flask (Python)
- Google's Gemini AI for natural language processing
- SpeechRecognition for speech-to-text
- gTTS (Google Text-to-Speech)
- pydub for audio processing
- Deployed on Railway

## Local Development

### Backend Setup

1. Clone the repository
2. Create a `.env` file in the root directory and add your Google API key:
   ```
   GOOGLE_API_KEY=your_api_key_here
   ```
3. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Run the Flask server:
   ```bash
   python api.py
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the frontend directory:
   ```
   REACT_APP_API_URL=http://localhost:5000
   ```
4. Start the development server:
   ```bash
   npm start
   ```

## Usage

1. Click the blue button to start recording
2. Speak your message
3. Click the button again (now red) to stop recording
4. Wait for the AI to process and respond
5. Listen to the AI's witty response

## Environment Variables

### Backend
- `GOOGLE_API_KEY`: Your Google API key for Gemini AI

### Frontend
- `REACT_APP_API_URL`: Backend API URL (local or deployed)

## Deployment

The application is deployed using:
- Frontend: [Vercel](https://voice-to-voice-llm.vercel.app/)
- Backend: Railway

## Requirements

- Python 3.12+
- Node.js 14+
- FFmpeg (for audio processing)
- Google API key for Gemini AI

## License

MIT License

