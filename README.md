# Conversational AI Assistant with Speech Recognition

A Python-based conversational AI assistant that uses speech recognition and text-to-speech capabilities to create an interactive voice interface. The assistant uses Google's Gemini AI for natural language processing and Google's Speech Recognition for voice input.

## Demo

[Watch Demo Video](https://github.com/zanjeel/Voice-to-Voice-LLM/blob/master/media/demo.mp4)

## Features

- Real-time speech recognition using Google Speech Recognition
- Natural language processing using Google's Gemini AI
- Text-to-speech conversion with adjustable speed
- Interactive voice interface
- Environment variable configuration for API keys

## Technologies Used

- **Speech Recognition**: `speech_recognition` library for converting speech to text
- **AI Model**: Google's Gemini AI (`google-generativeai`) for natural language processing
- **Text-to-Speech**: Google Text-to-Speech (`gTTS`) for converting text to speech
- **Audio Processing**: `pydub` for audio manipulation and playback
- **Environment Variables**: `python-dotenv` for secure API key management
- **Audio Input**: `PyAudio` for microphone input

## Prerequisites

- Python 3.11 or 3.12 (recommended)
- FFmpeg installed on your system
- Google API key for Gemini AI
- Microphone connected to your system

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd Conversational-Chatbot-with-Speech-to-Text-and-Text-to-Speech-main
```

2. Create and activate a virtual environment:
```bash
python -m venv myenv
myenv\Scripts\activate  # On Windows
```

3. Install the required packages:
```bash
pip install -r requirements.txt
```

4. Set up environment variables:
   - Copy `.env.example` to `.env`:
     ```bash
     cp .env.example .env
     ```
   - Edit `.env` and add your Google API key:
     ```
     GOOGLE_API_KEY=your-actual-api-key
     ```
   - Never commit your `.env` file to version control

## Usage

1. Run the script:
```bash
python sr_llama3_gtts.py
```

2. The assistant will:
   - Adjust for ambient noise
   - Listen for your voice input (up to 10 seconds)
   - Convert your speech to text
   - Generate a response using Gemini AI
   - Convert the response to speech and play it back

3. To exit the program, say "exit" when the assistant is listening.

## Configuration

- The speech recognition timeout is set to 10 seconds
- The text-to-speech speed factor is set to 1.2x
- The Gemini AI model used is 'gemini-pro'

## Requirements

```
SpeechRecognition==3.10.0
google-generativeai==0.3.2
gTTS==2.3.2
pydub==0.25.1
python-dotenv==1.0.1
PyAudio==0.2.14
```

## Security Notes.

- Never commit your `.env` file or any files containing API keys to version control
- Keep your API keys secure and don't share them publicly
- The `.env` file is already included in `.gitignore` to prevent accidental commits

## Note

Make sure your microphone is properly connected and set as the default input device on your system. Also, ensure you have a stable internet connection as the application uses Google's services for speech recognition and AI processing.

