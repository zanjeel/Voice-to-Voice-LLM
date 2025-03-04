from flask import Flask, request, jsonify
from flask_cors import CORS
import speech_recognition as sr
import google.generativeai as genai
import gtts
import os
from pydub import AudioSegment
from pydub.playback import play
from dotenv import load_dotenv
import base64
import io
import logging
import tempfile

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

app = Flask(__name__)
# Configure CORS with more permissive settings
CORS(app, resources={
    r"/*": {
        "origins": [
            "http://localhost:3000",
            "http://localhost:3001",
            "https://*.vercel.app",
            "https://*.now.sh",
            "https://*.netlify.app",
            "https://*.netlify.com"
        ],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

# Configure Gemini AI
api_key = os.getenv('GOOGLE_API_KEY')
if not api_key:
    raise ValueError("GOOGLE_API_KEY not found in environment variables")
genai.configure(api_key=api_key)
model = genai.GenerativeModel('gemini-1.5-flash')

@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response

def process_audio(audio_data):
    try:
        logger.debug("Starting audio processing")
        # Convert base64 audio to WebM
        audio_bytes = base64.b64decode(audio_data)
        
        # Create temporary files for audio conversion
        with tempfile.NamedTemporaryFile(suffix='.webm', delete=False) as webm_file:
            # Save WebM audio to temporary file
            webm_file.write(audio_bytes)
            webm_file.flush()
            webm_path = webm_file.name
            
        try:
            # Convert WebM to WAV using pydub
            logger.debug("Converting WebM to WAV")
            audio = AudioSegment.from_file(webm_path, format="webm")
            
            # Save as WAV temporarily
            wav_path = webm_path.replace('.webm', '.wav')
            audio.export(wav_path, format="wav")
            
            # Initialize recognizer
            recognizer = sr.Recognizer()
            
            # Process the WAV file
            with sr.AudioFile(wav_path) as source:
                logger.debug("Recording audio from source")
                audio = recognizer.record(source)
                
                try:
                    # Convert speech to text
                    logger.debug("Attempting to recognize speech")
                    transcript = recognizer.recognize_google(audio)
                    logger.debug(f"Transcribed text: {transcript}")
                    
                    # Generate AI response with length limit
                    prompt = f"""You are a witty, humorous AI assistant who loves clever wordplay and fun responses. Keep your responses natural and conversational, like a funny friend chatting. Respond to this in exactly 2-3 short sentences, using only plain text without any quotes, asterisks, or special characters: {transcript}"""
                    logger.debug("Generating AI response")
                    response = model.generate_content(prompt)
                    ai_response = response.text.replace('"', '').replace('*', '').strip()
                    logger.debug(f"AI response: {ai_response}")
                    
                    # Convert response to speech
                    logger.debug("Converting response to speech")
                    tts = gtts.gTTS(ai_response)
                    
                    # Save response audio to a temporary file
                    response_path = webm_path.replace('.webm', '_response.mp3')
                    tts.save(response_path)
                    
                    # Read the response audio and convert to base64
                    with open(response_path, 'rb') as audio_file:
                        audio_base64 = base64.b64encode(audio_file.read()).decode('utf-8')
                    
                    logger.debug("Audio processing completed successfully")
                    
                    return {
                        "transcript": transcript,
                        "response": ai_response,
                        "audio": audio_base64
                    }
                    
                except sr.UnknownValueError:
                    logger.error("Could not understand audio")
                    return {"error": "Could not understand audio"}
                except sr.RequestError as e:
                    logger.error(f"Could not request results: {str(e)}")
                    return {"error": f"Could not request results: {str(e)}"}
                except Exception as e:
                    logger.error(f"Error processing audio: {str(e)}")
                    return {"error": f"Error processing audio: {str(e)}"}
                
        finally:
            # Clean up temporary files
            try:
                os.unlink(webm_path)
                if os.path.exists(wav_path):
                    os.unlink(wav_path)
                if os.path.exists(response_path):
                    os.unlink(response_path)
            except Exception as e:
                logger.error(f"Error cleaning up temporary files: {str(e)}")
                
    except Exception as e:
        logger.error(f"Error decoding audio: {str(e)}")
        return {"error": f"Error decoding audio: {str(e)}"}

@app.route('/api/process-audio', methods=['POST', 'OPTIONS'])
def process_audio_endpoint():
    if request.method == 'OPTIONS':
        return '', 204
        
    try:
        logger.debug("Received audio processing request")
        data = request.json
        if not data or 'audio' not in data:
            logger.error("No audio data provided")
            return jsonify({"error": "No audio data provided"}), 400
        
        result = process_audio(data['audio'])
        logger.debug(f"Returning result: {result}")
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error in endpoint: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port) 