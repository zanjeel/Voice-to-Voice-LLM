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

def process_audio(audio_data, mime_type=None):
    try:
        logger.debug(f"Starting audio processing with MIME type: {mime_type}")
        # Convert base64 audio to binary
        audio_bytes = base64.b64decode(audio_data)
        
        # Create temporary directory for audio files
        temp_dir = tempfile.mkdtemp()
        logger.debug(f"Created temporary directory: {temp_dir}")
        
        # Determine input format and filename based on MIME type
        if mime_type:
            logger.debug(f"Processing MIME type: {mime_type}")
            if 'mp4' in mime_type or 'x-m4a' in mime_type:
                input_path = os.path.join(temp_dir, 'input.mp4')
                input_format = 'mp4'
            elif 'webm' in mime_type:
                input_path = os.path.join(temp_dir, 'input.webm')
                input_format = 'webm'
            else:
                input_path = os.path.join(temp_dir, 'input.wav')
                input_format = 'wav'
        else:
            input_path = os.path.join(temp_dir, 'input.wav')
            input_format = 'wav'
            
        wav_path = os.path.join(temp_dir, 'output.wav')
        response_path = os.path.join(temp_dir, 'response.mp3')
        
        logger.debug(f"Input format: {input_format}")
        logger.debug(f"Input path: {input_path}")
        logger.debug(f"Output WAV path: {wav_path}")
        
        try:
            # Save input audio
            with open(input_path, 'wb') as f:
                f.write(audio_bytes)
            logger.debug(f"Saved input audio to {input_path}")
            
            # First, check if the input file exists and has content
            if not os.path.exists(input_path) or os.path.getsize(input_path) == 0:
                raise ValueError("Input audio file is empty or does not exist")
            
            # Direct FFmpeg conversion with detailed logging
            import subprocess
            try:
                logger.debug("Starting FFmpeg conversion")
                
                # Try simpler conversion first
                convert_cmd = [
                    'ffmpeg',
                    '-y',  # Overwrite output file
                    '-i', input_path,  # Input file
                    '-vn',  # No video
                    '-acodec', 'pcm_s16le',  # Output codec
                    '-ac', '1',  # Mono
                    '-ar', '16000',  # 16kHz sample rate
                    wav_path  # Output file
                ]
                
                logger.debug(f"Running FFmpeg command: {' '.join(convert_cmd)}")
                result = subprocess.run(convert_cmd, capture_output=True, text=True)
                
                if result.returncode != 0:
                    logger.error(f"First conversion attempt failed: {result.stderr}")
                    
                    # Try alternative approach with format forcing
                    logger.debug("Attempting alternative conversion approach")
                    alt_convert_cmd = [
                        'ffmpeg',
                        '-y',
                        '-f', input_format,
                        '-i', input_path,
                        '-vn',
                        '-acodec', 'pcm_s16le',
                        '-ac', '1',
                        '-ar', '16000',
                        wav_path
                    ]
                    
                    logger.debug(f"Running alternative FFmpeg command: {' '.join(alt_convert_cmd)}")
                    alt_result = subprocess.run(alt_convert_cmd, capture_output=True, text=True)
                    
                    if alt_result.returncode != 0:
                        logger.error(f"Alternative conversion failed: {alt_result.stderr}")
                        raise ValueError(f"Audio conversion failed with both approaches")
                
                logger.debug("FFmpeg conversion successful")
                
                # Verify the output file exists and has content
                if not os.path.exists(wav_path) or os.path.getsize(wav_path) == 0:
                    raise ValueError("FFmpeg produced empty or missing output file")
                
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
                    
            except subprocess.CalledProcessError as e:
                logger.error(f"FFmpeg process error: {str(e)}")
                logger.error(f"FFmpeg stderr: {e.stderr}")
                return {"error": f"Audio conversion failed: {e.stderr}"}
            except Exception as e:
                logger.error(f"Unexpected error during conversion: {str(e)}")
                return {"error": f"Unexpected error during conversion: {str(e)}"}
                
        finally:
            # Clean up temporary files
            try:
                import shutil
                shutil.rmtree(temp_dir)
                logger.debug(f"Cleaned up temporary directory: {temp_dir}")
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
            
        mime_type = data.get('mimeType')
        result = process_audio(data['audio'], mime_type)
        logger.debug("Processing completed")
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error in endpoint: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port) 