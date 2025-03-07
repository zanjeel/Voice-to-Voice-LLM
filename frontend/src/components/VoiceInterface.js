import React, { useState, useRef, useEffect } from 'react';
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
  const recordingIntervalRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const MOBILE_MAX_DURATION = 10000; // Reduced to 10 seconds for mobile
  const startTimeRef = useRef(null);

  const forceStopRecording = () => {
    console.log('Force stopping recording...');
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        // Clear all timers first
        if (recordingIntervalRef.current) {
          clearTimeout(recordingIntervalRef.current);
          recordingIntervalRef.current = null;
        }
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }

        // Update UI state
        setIsRecording(false);
        setStatus('Processing your message...');
        setIsProcessing(true);

        // Stop the MediaRecorder and tracks
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      } catch (error) {
        console.error('Error in force stop:', error);
        setStatus('Error stopping recording. Please try again.');
        setIsProcessing(false);
        setIsRecording(false);
      }
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: isMobileDevice ? 22050 : 44100,
          sampleSize: isMobileDevice ? 8 : 16
        } 
      });
      
      // Try simpler MIME types first, especially for mobile
      const mimeTypes = isMobileDevice ? 
        ['audio/webm', 'audio/mp4'] :
        ['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/wav'];
      
      let selectedMimeType = null;
      
      // First try to find a supported type
      for (const type of mimeTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          selectedMimeType = type;
          console.log('Found supported MIME type:', type);
          break;
        }
      }
      
      if (!selectedMimeType) {
        throw new Error('No supported audio format found for your device');
      }

      console.log('Final selected MIME type:', selectedMimeType);
      
      const options = {
        mimeType: selectedMimeType,
        audioBitsPerSecond: isMobileDevice ? 16000 : 128000
      };
      
      mediaRecorderRef.current = new MediaRecorder(stream, options);
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
          const audioBlob = new Blob(audioChunksRef.current, { type: selectedMimeType });
          console.log('Audio blob created:', audioBlob.size, 'bytes');
          
          // Check file size for mobile devices
          if (isMobileDevice && audioBlob.size > 500000) { // Reduced to 500KB for mobile
            throw new Error('Recording too long. Please keep it shorter.');
          }
          
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            try {
              const base64Audio = reader.result.split(',')[1];
              console.log('Audio converted to base64, length:', base64Audio.length);
              await processAudio(base64Audio, selectedMimeType);
            } catch (error) {
              console.error('Error processing base64 audio:', error);
              setStatus('Error processing audio: ' + error.message);
              setIsProcessing(false);
            }
          };
        } catch (error) {
          console.error('Error handling audio data:', error);
          setStatus('Error handling audio: ' + error.message);
          setIsProcessing(false);
        }
      };

      const timeslice = isMobileDevice ? 1000 : 60000; // 1 second chunks for mobile
      mediaRecorderRef.current.start(timeslice);
      
      // Set up countdown and warning for mobile devices
      if (isMobileDevice) {
        startTimeRef.current = Date.now();
        
        // Update countdown every second
        countdownIntervalRef.current = setInterval(() => {
          const elapsedTime = Date.now() - startTimeRef.current;
          const timeLeft = MOBILE_MAX_DURATION - elapsedTime;
          const secondsLeft = Math.ceil(timeLeft / 1000);
          
          if (secondsLeft <= 0) {
            forceStopRecording();
            return;
          }
          
          if (secondsLeft <= 5) {
            setStatus(`⚠️ Recording will stop in ${secondsLeft} seconds...`);
          } else if (secondsLeft <= 10) {
            setStatus(`Recording... ${secondsLeft} seconds remaining`);
          }
        }, 1000);

        // Set up auto-stop
        recordingIntervalRef.current = setTimeout(() => {
          if (isRecording) {
            forceStopRecording();
          }
        }, MOBILE_MAX_DURATION);
      }

      setIsRecording(true);
      setStatus(isMobileDevice ? 
        'Recording... (Max 10 seconds on mobile)' : 
        'Recording... Speak now'
      );
    } catch (error) {
      console.error('Error accessing microphone:', error);
      setStatus('Error accessing microphone: ' + error.message);
      setIsRecording(false);
      setIsProcessing(false);
    }
  };

  const stopRecording = () => {
    forceStopRecording();
  };

  // Clean up intervals on component unmount
  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearTimeout(recordingIntervalRef.current);
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, []);

  const processAudio = async (audioData, mimeType) => {
    setIsProcessing(true);
    let audioContext = null;

    try {
      console.log('Sending audio to server with MIME type:', mimeType);
      const response = await axios.post(`${API_URL}/api/process-audio`, {
        audio: audioData,
        mimeType: mimeType
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 60000
      });

      console.log('Server response received:', response.status);

      if (!response.data || !response.data.audio) {
        throw new Error('Invalid response from server');
      }

      // Set transcript if available
      if (response.data.transcript) {
        setTranscript(response.data.transcript);
      }

      // Simple audio playback for mobile
      if (isMobileDevice) {
        console.log('Using simple audio playback for mobile...');
        const audio = new Audio(`data:audio/mp3;base64,${response.data.audio}`);
        
        return new Promise((resolve, reject) => {
          audio.onerror = (e) => {
            console.error('Audio error:', e);
            reject(new Error('Error playing audio'));
          };

          audio.oncanplay = async () => {
            console.log('Audio ready to play');
            setStatus('Playing response...');
            try {
              await audio.play();
              console.log('Playback started');
            } catch (playError) {
              console.error('Play failed:', playError);
              reject(playError);
            }
          };

          audio.onended = () => {
            console.log('Audio playback ended');
            setStatus('Click the button to start speaking and Click again when you are done');
            setIsProcessing(false);
            resolve();
          };

          // Set timeout for loading
          const loadTimeout = setTimeout(() => {
            reject(new Error('Audio loading timeout'));
          }, 5000);

          // Clear timeout if loaded
          audio.onloadeddata = () => {
            clearTimeout(loadTimeout);
          };
        });
      }

      // Desktop playback with Web Audio API
      console.log('Using Web Audio API for desktop...');
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioContext = new AudioContext();
      
      const base64 = response.data.audio;
      const binaryString = window.atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const audioBuffer = await audioContext.decodeAudioData(bytes.buffer);
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      
      return new Promise((resolve) => {
        source.onended = () => {
          console.log('Audio playback ended');
          setStatus('Click the button to start speaking and Click again when you are done');
          setIsProcessing(false);
          resolve();
        };

        console.log('Starting audio playback...');
        setStatus('Playing response...');
        source.start(0);
        console.log('Audio playback started');
      });

    } catch (error) {
      console.error('Error processing audio:', error);
      setStatus(error.message || 'Error processing audio. Please try again.');
      setIsProcessing(false);
      
      // Cleanup audio context if it was created
      if (audioContext) {
        try {
          await audioContext.close();
        } catch (closeError) {
          console.error('Error closing audio context:', closeError);
        }
      }
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