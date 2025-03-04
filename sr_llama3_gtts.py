import speech_recognition as sr
import google.generativeai as genai
import gtts
import os
from pydub import AudioSegment
from pydub.playback import play
from dotenv import load_dotenv
import wave

# Load environment variables from .env file
load_dotenv()

class AIAssistant:
    def __init__(self):
        # Configure Gemini AI
        api_key = os.getenv('GOOGLE_API_KEY')
        if not api_key:
            raise ValueError("GOOGLE_API_KEY not found in environment variables. Please check your .env file.")
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-1.5-pro')

    def live_audio_transcription(self):
        recognizer = sr.Recognizer()
        mic = sr.Microphone()

        print("Adjusting for ambient noise...")

        with mic as source:
            recognizer.adjust_for_ambient_noise(source)
            print("Listening...")

            # Set phrase_time_limit to 10 seconds
            audio = recognizer.listen(source, phrase_time_limit=10)
            print("Audio captured, processing...")

        try:
            transcript = recognizer.recognize_google(audio)
            print("Transcription: " + transcript)
            return transcript
        except sr.UnknownValueError:
            print("Google Speech Recognition could not understand the audio")
            return None
        except sr.RequestError as e:
            print(f"Could not request results from Google Speech Recognition service; {e}")
            return None

    def generate_ai_response(self, transcript):
        if not transcript:
            print("No transcript available to process.")
            return

        print("Generating AI response...")

        try:
            # Generate response using Gemini
            response = self.model.generate_content(transcript)
            complete_response = response.text
            
            if complete_response:
                print("AI Response: " + complete_response)
                return complete_response
            return ""
        except Exception as e:
            print(f"Error generating response: {e}")
            return ""

    def text_to_speech(self, text, speed_factor=1):
        # Save as MP3
        tts = gtts.gTTS(text)
        audio_file = "response.mp3"
        tts.save(audio_file)

        # Load the audio file and adjust speed
        audio = AudioSegment.from_mp3(audio_file)
        new_sample_rate = int(audio.frame_rate * speed_factor)
        adjusted_audio = audio._spawn(audio.raw_data, overrides={'frame_rate': new_sample_rate})
        adjusted_audio = adjusted_audio.set_frame_rate(audio.frame_rate)

        # Save the adjusted audio to a new file
        adjusted_file = "response_adjusted.mp3"
        adjusted_audio.export(adjusted_file, format="mp3")

        # Play the adjusted audio file
        adjusted_audio = AudioSegment.from_mp3(adjusted_file)
        play(adjusted_audio)
        
        # Clean up the audio files
        os.remove(audio_file)
        os.remove(adjusted_file)

    def run(self):
        while True:
            # Get live transcription
            transcribed_text = self.live_audio_transcription()

            # Check if the user wants to exit
            if transcribed_text and "exit" in transcribed_text.lower():
                print("Exiting...")
                break

            # Generate AI response
            response_text = self.generate_ai_response(transcribed_text)

            # Convert response to speech and play it
            if response_text:
                self.text_to_speech(response_text, speed_factor=1.2)
                
# Create an instance of AIAssistant
assistant = AIAssistant()

# Run the assistant
assistant.run()
