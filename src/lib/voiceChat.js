import { GoogleGenAI, Modality } from '@google/genai';

// Audio configuration matching Gemini Live API requirements
const SEND_SAMPLE_RATE = 16000; // 16kHz input
const RECEIVE_SAMPLE_RATE = 24000; // 24kHz output
const CHANNELS = 1; // Mono
const BIT_DEPTH = 16;

let liveSession = null;
let audioContext = null;
let mediaStream = null;
let audioWorkletNode = null;
let audioSource = null;
let audioQueue = [];
let isRecording = false;
let isPlaying = false;

/**
 * Initialize voice chat with Gemini Live API
 * @param {string} apiKey - Gemini API key
 * @param {string} model - Model name (default: gemini-2.5-flash-native-audio-preview-12-2025)
 * @param {Object} config - Additional configuration
 * @returns {Promise<Object>} Session object
 */
export const initializeVoiceChat = async (apiKey, model = 'gemini-2.5-flash-native-audio-preview-12-2025', config = {}) => {
  if (!apiKey) {
    throw new Error('API key is required for voice chat');
  }

  const ai = new GoogleGenAI({ apiKey });

  const liveConfig = {
    responseModalities: [Modality.AUDIO],
    systemInstruction: config.systemInstruction || "You are a helpful and friendly AI assistant.",
    ...config
  };

  try {
    // Create AudioContext for audio processing
    audioContext = new (window.AudioContext || window.webkitAudioContext)({
      sampleRate: SEND_SAMPLE_RATE
    });

    liveSession = await ai.live.connect({
      model: model,
      config: liveConfig,
      callbacks: {
        onopen: () => {
          console.log('✅ Voice chat WebSocket connected');
          if (config.onOpen) config.onOpen();
        },
        onmessage: async (message) => {
          try {
            // Handle different message types - message can be a Blob, string, or object
            let messageData = message;
            
            // If message is a Blob, convert to text first
            if (message instanceof Blob) {
              const text = await message.text();
              try {
                messageData = JSON.parse(text);
              } catch (e) {
                // If not JSON, treat as raw audio data
                await handleAudioResponse(message);
                return;
              }
            } else if (typeof message === 'string') {
              try {
                messageData = JSON.parse(message);
              } catch (e) {
                // Not JSON, might be base64 audio
                await handleAudioResponse(message);
                return;
              }
            }

            // Process structured message data
            if (messageData.serverContent) {
              // Handle interruptions
              if (messageData.serverContent.interrupted) {
                // Clear audio queue on interruption
                audioQueue = [];
                if (config.onInterrupted) config.onInterrupted();
                return;
              }

              // Handle model turn with audio parts
              if (messageData.serverContent.modelTurn && messageData.serverContent.modelTurn.parts) {
                for (const part of messageData.serverContent.modelTurn.parts) {
                  if (part.inlineData && part.inlineData.data) {
                    // Audio data - decode and queue for playback
                    await handleAudioResponse(part.inlineData.data);
                  } else if (part.text) {
                    // Text transcript (if available)
                    if (config.onTranscript) config.onTranscript(part.text);
                  }
                }
              }
            }

            if (config.onMessage) config.onMessage(messageData);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
            console.error('Message type:', typeof message, 'Instance:', message instanceof Blob ? 'Blob' : 'Other');
            if (config.onError) config.onError(error);
          }
        },
        onerror: (error) => {
          console.error('Voice chat WebSocket error:', error);
          if (config.onError) config.onError(error);
        },
        onclose: (event) => {
          console.log('Voice chat WebSocket closed:', event.reason);
          if (config.onClose) config.onClose(event);
        }
      }
    });

    return liveSession;
  } catch (error) {
    console.error('Failed to initialize voice chat:', error);
    throw error;
  }
};

/**
 * Handle audio response from Gemini Live API
 * @param {string|Blob|ArrayBuffer} audioData - Audio data (base64 string, Blob, or ArrayBuffer)
 */
const handleAudioResponse = async (audioData) => {
  try {
    let audioBuffer;
    
    // Convert different input types to ArrayBuffer
    if (typeof audioData === 'string') {
      // Base64 string - decode to ArrayBuffer
      const binaryString = atob(audioData);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      audioBuffer = bytes.buffer;
    } else if (audioData instanceof Blob) {
      audioBuffer = await audioData.arrayBuffer();
    } else if (audioData instanceof ArrayBuffer) {
      audioBuffer = audioData;
    } else {
      console.warn('Unknown audio data type:', typeof audioData);
      return;
    }

    // Queue audio for playback
    audioQueue.push(audioBuffer);
    
    // Start playback if not already playing
    if (!isPlaying) {
      playAudioQueue();
    }
  } catch (error) {
    console.error('Error handling audio response:', error);
  }
};

/**
 * Play audio from the queue
 */
const playAudioQueue = async () => {
  if (isPlaying || audioQueue.length === 0) return;
  
  isPlaying = true;
  
  try {
    while (audioQueue.length > 0) {
      const audioBuffer = audioQueue.shift();
      
      // Create AudioBuffer for playback
      const audioBufferSource = audioContext.createBufferSource();
      const decodedAudio = await audioContext.decodeAudioData(audioBuffer.slice(0)); // Clone buffer
      
      audioBufferSource.buffer = decodedAudio;
      audioBufferSource.connect(audioContext.destination);
      
      await new Promise((resolve, reject) => {
        audioBufferSource.onended = resolve;
        audioBufferSource.onerror = reject;
        audioBufferSource.start(0);
      });
    }
  } catch (error) {
    console.error('Error playing audio:', error);
  } finally {
    isPlaying = false;
  }
};

/**
 * Start recording from microphone
 * @returns {Promise<void>}
 */
export const startRecording = async () => {
  if (isRecording) {
    console.warn('Recording already in progress');
    return;
  }

  if (!liveSession) {
    throw new Error('Voice chat session not initialized. Call initializeVoiceChat first.');
  }

  try {
    // Request microphone access
    mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate: SEND_SAMPLE_RATE,
        channelCount: CHANNELS,
        echoCancellation: true,
        noiseSuppression: true,
      }
    });

    // Create audio source from microphone
    audioSource = audioContext.createMediaStreamSource(mediaStream);

    // Create ScriptProcessorNode for PCM conversion (fallback for older browsers)
    // For modern browsers, we should use AudioWorklet, but ScriptProcessorNode is more compatible
    const bufferSize = 4096;
    const processor = audioContext.createScriptProcessor(bufferSize, CHANNELS, CHANNELS);

    processor.onaudioprocess = (event) => {
      if (!isRecording || !liveSession) return;

      const inputBuffer = event.inputBuffer;
      const inputData = inputBuffer.getChannelData(0); // Mono channel

      // Convert Float32Array to 16-bit PCM
      const pcm16 = new Int16Array(inputData.length);
      for (let i = 0; i < inputData.length; i++) {
        // Clamp to [-1, 1] and convert to 16-bit integer
        const s = Math.max(-1, Math.min(1, inputData[i]));
        pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }

      // Convert to base64 for transmission
      const base64 = btoa(
        String.fromCharCode.apply(null, new Uint8Array(pcm16.buffer))
      );

      // Send to Gemini Live API
      try {
        liveSession.sendRealtimeInput({
          audio: {
            data: base64,
            mimeType: `audio/pcm;rate=${SEND_SAMPLE_RATE}`
          }
        });
      } catch (error) {
        console.error('Error sending audio chunk:', error);
      }
    };

    // Connect processor to audio source
    audioSource.connect(processor);
    processor.connect(audioContext.destination); // Need to connect to destination for ScriptProcessorNode to work

    isRecording = true;
    console.log('✅ Recording started');
  } catch (error) {
    console.error('Failed to start recording:', error);
    throw error;
  }
};

/**
 * Stop recording from microphone
 */
export const stopRecording = () => {
  if (!isRecording) return;

  isRecording = false;

  // Stop media stream tracks
  if (mediaStream) {
    mediaStream.getTracks().forEach(track => track.stop());
    mediaStream = null;
  }

  // Disconnect audio nodes
  if (audioSource) {
    audioSource.disconnect();
    audioSource = null;
  }

  console.log('✅ Recording stopped');
};

/**
 * Close voice chat session
 */
export const closeVoiceChat = async () => {
  stopRecording();

  // Clear audio queue
  audioQueue = [];
  isPlaying = false;

  // Close WebSocket connection
  if (liveSession) {
    try {
      liveSession.close();
    } catch (error) {
      console.error('Error closing voice chat session:', error);
    }
    liveSession = null;
  }

  // Close AudioContext
  if (audioContext && audioContext.state !== 'closed') {
    await audioContext.close();
    audioContext = null;
  }

  console.log('✅ Voice chat closed');
};

/**
 * Check if recording is active
 * @returns {boolean}
 */
export const isRecordingActive = () => isRecording;

/**
 * Check if voice chat session is initialized
 * @returns {boolean}
 */
export const isVoiceChatInitialized = () => liveSession !== null;