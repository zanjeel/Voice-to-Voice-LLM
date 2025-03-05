import React, { useState, useRef } from 'react';
import styled from 'styled-components';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const Wrapper = styled.div`
  min-height: 100vh;
  height: 100vh;
  max-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;

  padding: 1rem;
  overflow: hidden;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
`;

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1.5rem;
  width: 100%;
  max-width: 600px;
  max-height: calc(100vh - 2rem);
  background: white;
  border-radius: 20px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  overflow-y: auto;
  -ms-overflow-style: none;
  scrollbar-width: none;
  
  &::-webkit-scrollbar {
    display: none;
  }
`;

const Title = styled.h1`
  color: #2c3e50;
  font-size: 2.5rem;
  margin-bottom: 1.5rem;
  text-align: center;
  font-weight: 600;

  @media (max-width: 640px) {
    font-size: 1.75rem;
    margin-bottom: 1rem;
  }
`;

const Button = styled.button`
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background-color: ${({ $isRecording }) => $isRecording ? '#ff4444' : '#3498db'};
  border: none;
  cursor: pointer;
  margin: 1rem 0;
  transition: all 0.3s ease;
  position: relative;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  
  &:hover {
    transform: scale(1.05);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
  }

  &:disabled {
    background-color: #bdc3c7;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

  &::before {
    content: '';
    position: absolute;
    top: -5px;
    left: -5px;
    right: -5px;
    bottom: -5px;
    border-radius: 50%;
    border: 2px solid ${({ $isRecording }) => $isRecording ? '#ff4444' : '#3498db'};
    animation: ${({ $isRecording }) => $isRecording ? 'pulse 1.5s infinite' : 'none'};
  }

  @keyframes pulse {
    0% {
      transform: scale(1);
      opacity: 1;
    }
    100% {
      transform: scale(1.2);
      opacity: 0;
    }
  }
`;

const Status = styled.div`
  margin: 1.5rem 0;
  font-size: 1.2rem;
  color: #7f8c8d;
  text-align: center;
  min-height: 2rem;
`;

const Transcript = styled.div`
  margin: 1rem 0;
  padding: 1rem;
  background-color: #f8f9fa;
  border-radius: 12px;
  width: 100%;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  border: 1px solid #e9ecef;
`;

const TranscriptTitle = styled.div`
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 0.5rem;
`;

const TranscriptText = styled.div`
  color: #34495e;
  line-height: 1.6;
`;

const LoadingDots = styled.div`
  display: flex;
  gap: 0.5rem;
  margin: 1rem 0;
  justify-content: center;
  
  span {
    width: 8px;
    height: 8px;
    background-color: #3498db;
    border-radius: 50%;
    animation: bounce 1.4s infinite ease-in-out;
    
    &:nth-child(1) { animation-delay: -0.32s; }
    &:nth-child(2) { animation-delay: -0.16s; }
  }
  
  @keyframes bounce {
    0%, 80%, 100% { transform: scale(0); }
    40% { transform: scale(1); }
  }
`;

const VoiceInterface = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState('Click the button to start speaking and Click again when you are done');
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        } 
      });
      
      // Try simpler MIME types first, especially for mobile
      const mimeTypes = [
        'audio/webm',
        'audio/mp4',
        'audio/ogg',
        'audio/webm;codecs=opus',
        'audio/webm;codecs=pcm',
        'audio/wav'
      ];
      
      let selectedMimeType = null;
      
      // First try to find a supported type
      for (const type of mimeTypes) {
        try {
          if (MediaRecorder.isTypeSupported(type)) {
            selectedMimeType = type;
            console.log('Found supported MIME type:', type);
            break;
          }
        } catch (e) {
          console.log('Error checking MIME type:', type, e);
        }
      }
      
      // If no supported type found, try to create a MediaRecorder without specifying type
      if (!selectedMimeType) {
        console.log('No explicit MIME type supported, trying default...');
        try {
          const recorder = new MediaRecorder(stream);
          selectedMimeType = recorder.mimeType;
          recorder.stop();
          stream.getTracks().forEach(track => track.stop());
        } catch (e) {
          console.error('Error creating default MediaRecorder:', e);
          throw new Error('Your browser does not support any compatible audio recording format');
        }
      }

      console.log('Final selected MIME type:', selectedMimeType);

      // Create the MediaRecorder with minimal options
      mediaRecorderRef.current = new MediaRecorder(stream);
      
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          console.log('Data available:', event.data.size, 'bytes');
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        try {
          console.log('Recording stopped, processing audio...');
          const audioBlob = new Blob(audioChunksRef.current);
          console.log('Audio blob created:', audioBlob.size, 'bytes');
          
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            try {
              const base64Audio = reader.result.split(',')[1];
              console.log('Audio converted to base64, length:', base64Audio.length);
              await processAudio(base64Audio, mediaRecorderRef.current.mimeType);
            } catch (error) {
              console.error('Error processing base64 audio:', error);
              setStatus('Error processing audio: ' + error.message);
            }
          };
        } catch (error) {
          console.error('Error handling audio data:', error);
          setStatus('Error handling audio: ' + error.message);
        }
      };

      mediaRecorderRef.current.start(250);
      setIsRecording(true);
      setStatus('Recording... Speak now');
    } catch (error) {
      console.error('Error accessing microphone:', error);
      setStatus('Error accessing microphone: ' + error.message);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      console.log('Stopping recording...');
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      setStatus('Processing your message...');
    }
  };

  const processAudio = async (audioData, mimeType) => {
    setIsProcessing(true);
    try {
      console.log('Sending audio to server with MIME type:', mimeType);
      const response = await axios.post(`${API_URL}/api/process-audio`, {
        audio: audioData,
        mimeType: mimeType
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000
      });

      console.log('Server response received');

      if (response.data.error) {
        console.error('Server returned error:', response.data.error);
        setStatus(response.data.error);
        return;
      }

      setTranscript(response.data.transcript);
      setStatus('Playing response...');

      const audio = new Audio(`data:audio/mp3;base64,${response.data.audio}`);
      audio.onerror = (e) => {
        console.error('Error playing audio:', e);
        setStatus('Error playing audio response: ' + e.message);
      };
      audio.onended = () => {
        setStatus('Click the button to start speaking and Click again when you are done');
      };
      await audio.play();
    } catch (error) {
      console.error('Error processing audio:', error);
      setStatus(error.response?.data?.error || 'Error processing audio: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Wrapper>
      <Container>
        <Title>Witty AI Voice Assistant</Title>
        <Button
          $isRecording={isRecording}
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isProcessing}
        />
        <Status>
          {isProcessing ? (
            <LoadingDots>
              <span></span>
              <span></span>
              <span></span>
            </LoadingDots>
          ) : (
            status
          )}
        </Status>
        {transcript && (
          <Transcript>
            <TranscriptTitle>Your message:</TranscriptTitle>
            <TranscriptText>{transcript}</TranscriptText>
          </Transcript>
        )}
      </Container>
    </Wrapper>
  );
};

export default VoiceInterface; 