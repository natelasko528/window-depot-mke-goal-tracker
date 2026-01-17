/**
 * Voice Chat Library for Gemini Live API
 * Provides real-time voice conversation with AI using WebSockets
 */

// Voice chat state
let audioContext = null;
let mediaStream = null;
let mediaRecorder = null;
let webSocket = null;
let audioQueue = [];
let isPlaying = false;
let currentModel = 'gemini-2.0-flash-live-001';

// Note: Live models are now fetched dynamically via fetchAvailableModels() in ai.js
// The models that support bidiGenerateContent will be listed there

// Voice options for Gemini Live
export const VOICE_OPTIONS = [
  { id: 'Puck', name: 'Puck', description: 'Friendly and approachable' },
  { id: 'Charon', name: 'Charon', description: 'Calm and professional' },
  { id: 'Kore', name: 'Kore', description: 'Warm and supportive' },
  { id: 'Fenrir', name: 'Fenrir', description: 'Confident and energetic' },
  { id: 'Aoede', name: 'Aoede', description: 'Clear and articulate' },
];

// System instruction for voice coaching
const VOICE_SYSTEM_INSTRUCTION = `You are a helpful AI voice coach for Window Depot Milwaukee's goal tracking app.
Your role is to:
- Provide motivation and coaching through natural conversation
- Help with role-playing exercises for sales calls and customer interactions
- Give feedback on communication skills
- Answer questions about goals and performance
- Be encouraging, professional, and supportive

Keep responses conversational and concise for voice interaction.
Speak naturally as if having a real conversation.`;

/**
 * Initialize audio context for playback
 */
const initAudioContext = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)({
      sampleRate: 24000, // Gemini Live uses 24kHz
    });
  }
  return audioContext;
};

/**
 * Convert base64 to ArrayBuffer
 */
const base64ToArrayBuffer = (base64) => {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
};

// Note: arrayBufferToBase64 would be used for sending raw PCM audio
// Currently audio is sent as base64-encoded webm chunks via MediaRecorder

/**
 * Play audio from PCM data
 */
const playAudio = async (pcmData) => {
  const ctx = initAudioContext();

  // Resume if suspended
  if (ctx.state === 'suspended') {
    await ctx.resume();
  }

  // Convert PCM to AudioBuffer (16-bit PCM, 24kHz, mono)
  const samples = new Int16Array(pcmData);
  const floatSamples = new Float32Array(samples.length);

  for (let i = 0; i < samples.length; i++) {
    floatSamples[i] = samples[i] / 32768;
  }

  const audioBuffer = ctx.createBuffer(1, floatSamples.length, 24000);
  audioBuffer.copyToChannel(floatSamples, 0);

  const source = ctx.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(ctx.destination);

  return new Promise((resolve) => {
    source.onended = resolve;
    source.start();
  });
};

/**
 * Process audio queue for playback
 */
const processAudioQueue = async () => {
  if (isPlaying || audioQueue.length === 0) return;

  isPlaying = true;

  while (audioQueue.length > 0) {
    const audioData = audioQueue.shift();
    try {
      await playAudio(audioData);
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  }

  isPlaying = false;
};

/**
 * Voice chat session class
 */
class VoiceChatSession {
  constructor(apiKey, options = {}) {
    this.apiKey = apiKey;
    this.model = options.model || currentModel;
    this.voice = options.voice || 'Puck';
    this.systemInstruction = options.systemInstruction || VOICE_SYSTEM_INSTRUCTION;
    this.onStatusChange = options.onStatusChange || (() => {});
    this.onTranscript = options.onTranscript || (() => {});
    this.onError = options.onError || (() => {});
    this.onAudioLevel = options.onAudioLevel || (() => {});
    this.isConnected = false;
    this.isListening = false;
    this.analyser = null;
    this.audioLevelInterval = null;
  }

  /**
   * Connect to Gemini Live WebSocket
   */
  async connect() {
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${this.apiKey}`;

        webSocket = new WebSocket(wsUrl);

        webSocket.onopen = () => {
          console.log('WebSocket connected');
          this.isConnected = true;
          this.onStatusChange('connected');

          // Send setup message
          const setupMessage = {
            setup: {
              model: `models/${this.model}`,
              generationConfig: {
                responseModalities: ['AUDIO'],
                speechConfig: {
                  voiceConfig: {
                    prebuiltVoiceConfig: {
                      voiceName: this.voice,
                    },
                  },
                },
              },
              systemInstruction: {
                parts: [{ text: this.systemInstruction }],
              },
            },
          };

          webSocket.send(JSON.stringify(setupMessage));
          resolve();
        };

        webSocket.onmessage = (event) => {
          try {
            const response = JSON.parse(event.data);
            this.handleResponse(response);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        webSocket.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.onError('Connection error. Please check your API key and try again.');
          reject(error);
        };

        webSocket.onclose = (event) => {
          console.log('WebSocket closed:', event.code, event.reason);
          this.isConnected = false;
          this.onStatusChange('disconnected');

          if (event.code !== 1000) {
            this.onError(`Connection closed: ${event.reason || 'Unknown reason'}`);
          }
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Handle incoming WebSocket responses
   */
  handleResponse(response) {
    // Handle setup complete
    if (response.setupComplete) {
      this.onStatusChange('ready');
      return;
    }

    // Handle server content (audio response)
    if (response.serverContent) {
      const content = response.serverContent;

      // Check for model turn
      if (content.modelTurn) {
        const parts = content.modelTurn.parts || [];

        for (const part of parts) {
          // Handle audio data
          if (part.inlineData && part.inlineData.mimeType === 'audio/pcm') {
            const audioData = base64ToArrayBuffer(part.inlineData.data);
            audioQueue.push(audioData);
            processAudioQueue();
          }

          // Handle text transcript
          if (part.text) {
            this.onTranscript(part.text, 'assistant');
          }
        }
      }

      // Check if turn is complete
      if (content.turnComplete) {
        this.onStatusChange('ready');
      }
    }

    // Handle tool calls (future expansion)
    if (response.toolCall) {
      console.log('Tool call received:', response.toolCall);
    }
  }

  /**
   * Start listening to microphone
   */
  async startListening() {
    if (!this.isConnected) {
      throw new Error('Not connected to voice chat');
    }

    try {
      // Get microphone access
      mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      // Create audio context for analysis
      const ctx = initAudioContext();
      const source = ctx.createMediaStreamSource(mediaStream);
      this.analyser = ctx.createAnalyser();
      this.analyser.fftSize = 256;
      source.connect(this.analyser);

      // Start audio level monitoring
      this.startAudioLevelMonitoring();

      // Create MediaRecorder for capturing audio
      const options = { mimeType: 'audio/webm;codecs=opus' };

      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        // Fallback for browsers that don't support opus
        mediaRecorder = new MediaRecorder(mediaStream);
      } else {
        mediaRecorder = new MediaRecorder(mediaStream, options);
      }

      // Handle audio data chunks
      mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0 && this.isListening && this.isConnected) {
          // Convert blob to base64 and send
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = reader.result.split(',')[1];
            this.sendAudio(base64);
          };
          reader.readAsDataURL(event.data);
        }
      };

      // Start recording in chunks
      mediaRecorder.start(250); // Send audio every 250ms
      this.isListening = true;
      this.onStatusChange('listening');

    } catch (error) {
      console.error('Error starting microphone:', error);
      if (error.name === 'NotAllowedError') {
        this.onError('Microphone access denied. Please allow microphone access to use voice chat.');
      } else {
        this.onError(`Microphone error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Monitor audio levels for visual feedback
   */
  startAudioLevelMonitoring() {
    if (!this.analyser) return;

    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);

    this.audioLevelInterval = setInterval(() => {
      this.analyser.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      const normalizedLevel = Math.min(average / 128, 1);
      this.onAudioLevel(normalizedLevel);
    }, 50);
  }

  /**
   * Stop audio level monitoring
   */
  stopAudioLevelMonitoring() {
    if (this.audioLevelInterval) {
      clearInterval(this.audioLevelInterval);
      this.audioLevelInterval = null;
    }
    this.onAudioLevel(0);
  }

  /**
   * Send audio data to the server
   */
  sendAudio(base64Audio) {
    if (!webSocket || webSocket.readyState !== WebSocket.OPEN) {
      return;
    }

    const message = {
      realtimeInput: {
        mediaChunks: [
          {
            mimeType: 'audio/webm;codecs=opus',
            data: base64Audio,
          },
        ],
      },
    };

    webSocket.send(JSON.stringify(message));
  }

  /**
   * Send text message
   */
  sendText(text) {
    if (!webSocket || webSocket.readyState !== WebSocket.OPEN) {
      throw new Error('Not connected');
    }

    this.onTranscript(text, 'user');
    this.onStatusChange('processing');

    const message = {
      clientContent: {
        turns: [
          {
            role: 'user',
            parts: [{ text }],
          },
        ],
        turnComplete: true,
      },
    };

    webSocket.send(JSON.stringify(message));
  }

  /**
   * Stop listening
   */
  stopListening() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }

    this.stopAudioLevelMonitoring();
    this.isListening = false;

    if (this.isConnected) {
      this.onStatusChange('ready');
    }
  }

  /**
   * Disconnect from voice chat
   */
  disconnect() {
    this.stopListening();

    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
      mediaStream = null;
    }

    if (webSocket) {
      webSocket.close(1000, 'User disconnected');
      webSocket = null;
    }

    audioQueue = [];
    isPlaying = false;
    this.isConnected = false;
    this.onStatusChange('disconnected');
  }

  /**
   * Interrupt AI speech
   */
  interrupt() {
    // Clear audio queue
    audioQueue = [];

    // Send interrupt signal if needed
    if (webSocket && webSocket.readyState === WebSocket.OPEN) {
      // The API handles interruption automatically when new input is received
      console.log('Interrupt requested');
    }
  }
}

/**
 * Check if voice chat is supported in this browser
 */
export const isVoiceChatSupported = () => {
  return !!(
    navigator.mediaDevices &&
    navigator.mediaDevices.getUserMedia &&
    window.WebSocket &&
    (window.AudioContext || window.webkitAudioContext) &&
    window.MediaRecorder
  );
};

/**
 * Create a new voice chat session
 */
export const createVoiceChatSession = (apiKey, options = {}) => {
  if (!isVoiceChatSupported()) {
    throw new Error('Voice chat is not supported in this browser');
  }

  if (!apiKey) {
    throw new Error('API key is required for voice chat');
  }

  return new VoiceChatSession(apiKey, options);
};

/**
 * Set the default model for voice chat
 */
export const setVoiceChatModel = (modelId) => {
  currentModel = modelId;
};

/**
 * Get the current voice chat model
 */
export const getVoiceChatModel = () => currentModel;

const voiceChatModule = {
  createVoiceChatSession,
  isVoiceChatSupported,
  setVoiceChatModel,
  getVoiceChatModel,
  VOICE_OPTIONS,
};

export default voiceChatModule;
