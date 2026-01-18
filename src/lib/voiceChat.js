/**
 * Voice Chat Library for Gemini Live API
 * Provides real-time voice conversation with AI using WebSockets
 */

// Voice chat state
let audioContext = null; // For playback (24kHz)
let captureContext = null; // For microphone capture (16kHz)
let mediaStream = null;
let mediaRecorder = null;
let scriptProcessor = null;
let webSocket = null;
let audioQueue = []; // Queue of Float32Array buffers
let isPlaying = false;
let isStreamComplete = false;
let scheduledTime = 0;
let checkInterval = null;
let endOfQueueAudioSource = null;
let currentModel = 'gemini-2.5-flash-native-audio-preview-12-2025'; // Native audio model for Live API

// Audio format constants (per Gemini Live API spec)
// eslint-disable-next-line no-unused-vars
const SEND_SAMPLE_RATE = 16000; // 16kHz for input
// eslint-disable-next-line no-unused-vars
const RECEIVE_SAMPLE_RATE = 24000; // 24kHz for output

// Audio streaming constants (from official reference implementation)
const AUDIO_BUFFER_SIZE = 7680; // 160ms at 24kHz (3840 samples = 160ms)
const INITIAL_BUFFER_TIME = 0.1; // 100ms initial buffer
const SCHEDULE_AHEAD_TIME = 0.2; // 200ms ahead scheduling

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

/**
 * Convert ArrayBuffer to base64
 */
const arrayBufferToBase64 = (buffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

/**
 * Convert PCM16 Uint8Array to Float32Array
 */
const processPCM16Chunk = (chunk) => {
  const float32Array = new Float32Array(chunk.length / 2);
  const dataView = new DataView(chunk.buffer);

  for (let i = 0; i < chunk.length / 2; i++) {
    try {
      const int16 = dataView.getInt16(i * 2, true);
      float32Array[i] = int16 / 32768;
    } catch (e) {
      console.error('Error processing PCM chunk:', e);
    }
  }
  return float32Array;
};

/**
 * Create AudioBuffer from Float32Array
 */
const createAudioBuffer = (audioData) => {
  const ctx = initAudioContext();
  const audioBuffer = ctx.createBuffer(1, audioData.length, 24000);
  audioBuffer.getChannelData(0).set(audioData);
  return audioBuffer;
};

/**
 * Schedule next audio buffer for playback
 */
const scheduleNextBuffer = () => {
  const ctx = initAudioContext();

  while (
    audioQueue.length > 0 &&
    scheduledTime < ctx.currentTime + SCHEDULE_AHEAD_TIME
  ) {
    const audioData = audioQueue.shift();
    const audioBuffer = createAudioBuffer(audioData);
    const source = ctx.createBufferSource();
    
    // Capture queue length and end source reference for closure
    const isLastInQueue = audioQueue.length === 0;
    const currentSource = source;

    // Track last source to detect when queue is empty
    if (isLastInQueue) {
      if (endOfQueueAudioSource) {
        endOfQueueAudioSource.onended = null;
      }
      endOfQueueAudioSource = source;
      // eslint-disable-next-line no-loop-func
      source.onended = () => {
        const queueLength = audioQueue.length;
        const currentEndSource = endOfQueueAudioSource;
        if (queueLength === 0 && currentEndSource === currentSource) {
          endOfQueueAudioSource = null;
        }
      };
    }

    source.buffer = audioBuffer;
    source.connect(ctx.destination);

    // Ensure we never schedule in the past
    const startTime = Math.max(scheduledTime, ctx.currentTime);
    source.start(startTime);
    scheduledTime = startTime + audioBuffer.duration;
  }

  // Schedule next buffer check
  if (audioQueue.length === 0) {
    if (isStreamComplete) {
      isPlaying = false;
      if (checkInterval) {
        clearInterval(checkInterval);
        checkInterval = null;
      }
    } else {
      // Check periodically for new chunks
      if (!checkInterval) {
        checkInterval = setInterval(() => {
          if (audioQueue.length > 0) {
            scheduleNextBuffer();
          }
        }, 100);
      }
    }
  } else {
    // Schedule next buffer based on when current buffer will finish
    const nextCheckTime = (scheduledTime - ctx.currentTime) * 1000;
    setTimeout(() => scheduleNextBuffer(), Math.max(0, nextCheckTime - 50));
  }
};

/**
 * Add PCM16 audio chunk to playback queue (buffered streaming approach)
 */
const addPCM16Chunk = (chunk) => {
  // Reset stream complete flag when new chunk is added
  isStreamComplete = false;

  // Convert PCM16 to Float32Array
  let processingBuffer = processPCM16Chunk(chunk);

  // Split into buffers of AUDIO_BUFFER_SIZE if larger
  while (processingBuffer.length >= AUDIO_BUFFER_SIZE) {
    const buffer = processingBuffer.slice(0, AUDIO_BUFFER_SIZE);
    audioQueue.push(buffer);
    processingBuffer = processingBuffer.slice(AUDIO_BUFFER_SIZE);
  }

  // Add remaining buffer if not empty
  if (processingBuffer.length > 0) {
    audioQueue.push(processingBuffer);
  }

  // Start playing if not already playing
  if (!isPlaying) {
    isPlaying = true;
    const ctx = initAudioContext();
    // Initialize scheduledTime with initial buffer time
    scheduledTime = ctx.currentTime + INITIAL_BUFFER_TIME;
    scheduleNextBuffer();
  }
};

// processAudioQueue is no longer used - audio is now handled by addPCM16Chunk and scheduleNextBuffer
// Removed to avoid unused variable warning

/**
 * Validation functions
 */
const validateAPIKey = (apiKey) => {
  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length < 10) {
    throw new Error('Invalid API key format. API key must be at least 10 characters.');
  }
  return apiKey.trim();
};

// Fallback model list (try these in order if primary fails)
const FALLBACK_MODELS = [
  'gemini-2.5-flash-native-audio-preview-12-2025',
  'gemini-2.0-flash-live-001'
];

const validateModel = (model) => {
  if (!model || typeof model !== 'string') {
    return 'gemini-2.5-flash-native-audio-preview-12-2025'; // Valid Live API model
  }
  // Check if it's a valid live model
  const validLiveModels = [
    'gemini-2.5-flash-native-audio-preview-12-2025',
    'gemini-2.0-flash-exp',
    'gemini-1.5-pro'
  ];
  if (validLiveModels.includes(model)) {
    return model;
  }
  // Default to valid Live API model if unknown
  console.warn(`Model "${model}" not in known valid list, using "gemini-2.5-flash-native-audio-preview-12-2025"`);
  return 'gemini-2.5-flash-native-audio-preview-12-2025';
};

/**
 * Get fallback models for error messages
 */
const getFallbackModelSuggestions = (currentModel) => {
  return FALLBACK_MODELS.filter(m => m !== currentModel);
};

const validateVoice = (voice) => {
  const validVoices = VOICE_OPTIONS.map(v => v.id);
  if (validVoices.includes(voice)) {
    return voice;
  }
  console.warn(`Voice "${voice}" not in valid list, using "Puck"`);
  return 'Puck';
};

const validateSystemInstruction = (instruction) => {
  if (!instruction || typeof instruction !== 'string') {
    throw new Error('System instruction must be a non-empty string');
  }
  // Max length check (conservative limit)
  const MAX_LENGTH = 10000;
  if (instruction.length > MAX_LENGTH) {
    throw new Error(`System instruction too long (max ${MAX_LENGTH} characters)`);
  }
  // Check for valid UTF-8 encoding
  try {
    const encoder = new TextEncoder();
    encoder.encode(instruction);
  } catch (error) {
    throw new Error('System instruction contains invalid characters');
  }
  return instruction;
};

const validateSetupMessage = (setupMessage) => {
  // Required fields validation
  if (!setupMessage.setup) {
    throw new Error('Setup message must contain "setup" field');
  }
  if (!setupMessage.setup.model) {
    throw new Error('Setup message must contain "model" field');
  }
  if (!setupMessage.setup.generationConfig) {
    throw new Error('Setup message must contain "generationConfig" field');
  }
  if (!setupMessage.setup.generationConfig.responseModalities) {
    throw new Error('Setup message must contain "responseModalities" field');
  }
  if (!Array.isArray(setupMessage.setup.generationConfig.responseModalities)) {
    throw new Error('"responseModalities" must be an array');
  }
  if (setupMessage.setup.generationConfig.responseModalities.length === 0) {
    throw new Error('"responseModalities" array cannot be empty');
  }
  // Model format validation (should start with "models/")
  if (!setupMessage.setup.model.startsWith('models/')) {
    throw new Error('Model must be in format "models/{model-name}"');
  }
  return true;
};

/**
 * Voice chat session class
 */
class VoiceChatSession {
  constructor(apiKey, options = {}) {
    this.apiKey = validateAPIKey(apiKey);
    this.model = validateModel(options.model || currentModel);
    this.voice = validateVoice(options.voice || 'Puck');
    this.systemInstruction = validateSystemInstruction(options.systemInstruction || VOICE_SYSTEM_INSTRUCTION);
    this.onStatusChange = options.onStatusChange || (() => {});
    this.onTranscript = options.onTranscript || (() => {});
    this.onError = options.onError || (() => {});
    this.onAudioLevel = options.onAudioLevel || (() => {});
    // Voice chat settings for VAD and transcription
    this.voiceChatSettings = options.voiceChatSettings || {
      startOfSpeechSensitivity: 'START_SENSITIVITY_UNSPECIFIED',
      endOfSpeechSensitivity: 'END_SENSITIVITY_UNSPECIFIED',
      silenceDurationMs: 500,
      prefixPaddingMs: 100,
    };
    // Generation config settings
    this.generationConfig = options.generationConfig || {
      temperature: 1.0,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 8192,
      candidateCount: 1,
      presencePenalty: 0.0,
      frequencyPenalty: 0.0,
    };
    this.isConnected = false;
    this.isListening = false;
    this.analyser = null;
    this.audioLevelInterval = null;
    this.setupPromiseResolve = null;
    this.setupPromiseReject = null;
    this.setupComplete = false;
  }

  /**
   * Connect to Gemini Live WebSocket
   */
  async connect() {
    return new Promise((resolve, reject) => {
      try {
        // Store promise handlers for async flow control
        this.setupPromiseResolve = resolve;
        this.setupPromiseReject = reject;
        this.setupComplete = false;

        // Validate model name - ensure we use a valid native audio model
        const validModel = validateModel(this.model);
        if (this.model !== validModel) {
          console.warn(`Invalid voice model "${this.model}", using "${validModel}"`);
          this.model = validModel;
        }

        console.log('Connecting to Gemini Live API with model:', validModel);
        
        const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${this.apiKey}`;

        webSocket = new WebSocket(wsUrl);

        // Set timeout for setup completion (10 seconds)
        const setupTimeout = setTimeout(() => {
          if (!this.setupComplete) {
            const errorMsg = 'Setup timeout: Did not receive setupComplete within 10 seconds';
            console.error(errorMsg);
            if (webSocket && webSocket.readyState === WebSocket.OPEN) {
              webSocket.close();
            }
            if (this.setupPromiseReject) {
              this.setupPromiseReject(new Error(errorMsg));
              this.setupPromiseReject = null;
              this.setupPromiseResolve = null;
            }
          }
        }, 10000);

        webSocket.onopen = () => {
          console.log('WebSocket connected');
          this.isConnected = true;
          this.onStatusChange('connected');

          // Send setup message - using camelCase per Gemini Live API WebSocket spec
          const setupMessage = {
            setup: {
              model: `models/${validModel}`,
              generationConfig: {
                responseModalities: ['AUDIO'], // camelCase for WebSocket JSON messages
                speechConfig: {
                  languageCode: 'en-US', // Required for voice chat sessions
                  voiceConfig: {
                    prebuiltVoiceConfig: {
                      voiceName: this.voice,
                    },
                  },
                },
                // Merge generation config parameters
                // Note: presencePenalty and frequencyPenalty are NOT supported by Gemini Live API
                // They are only available for text chat via REST API
                ...(this.generationConfig.temperature !== undefined && { temperature: this.generationConfig.temperature }),
                ...(this.generationConfig.topP !== undefined && { topP: this.generationConfig.topP }),
                ...(this.generationConfig.topK !== undefined && { topK: this.generationConfig.topK }),
                ...(this.generationConfig.maxOutputTokens !== undefined && { maxOutputTokens: this.generationConfig.maxOutputTokens }),
                ...(this.generationConfig.candidateCount !== undefined && { candidateCount: this.generationConfig.candidateCount }),
              },
              realtimeInputConfig: {
                automaticActivityDetection: {
                  disabled: false,
                  startOfSpeechSensitivity: this.voiceChatSettings.startOfSpeechSensitivity || 'START_SENSITIVITY_UNSPECIFIED',
                  endOfSpeechSensitivity: this.voiceChatSettings.endOfSpeechSensitivity || 'END_SENSITIVITY_UNSPECIFIED',
                  silenceDurationMs: this.voiceChatSettings.silenceDurationMs || 500,
                  prefixPaddingMs: this.voiceChatSettings.prefixPaddingMs || 100,
                },
              },
              inputAudioTranscription: {}, // Empty object enables transcription, language inferred from speechConfig
              systemInstruction: {
                parts: [{ text: this.systemInstruction }],
              },
            },
          };

          // Validate setup message structure before sending
          try {
            validateSetupMessage(setupMessage);
            const jsonString = JSON.stringify(setupMessage);
            console.log('Sending setup message with model:', validModel);
            console.log('Setup message structure:', JSON.stringify(setupMessage, null, 2));
            
            webSocket.send(jsonString);
            // DO NOT resolve here - wait for setupComplete response
          } catch (error) {
            clearTimeout(setupTimeout);
            console.error('Failed to validate or send setup message:', error);
            if (this.setupPromiseReject) {
              this.setupPromiseReject(new Error(`Failed to prepare setup message: ${error.message}`));
              this.setupPromiseReject = null;
              this.setupPromiseResolve = null;
            }
            if (webSocket && webSocket.readyState === WebSocket.OPEN) {
              webSocket.close();
            }
          }
        };

        webSocket.onmessage = async (event) => {
          try {
            let messageData;
            
            // Handle different message types: string, Blob, or ArrayBuffer
            if (typeof event.data === 'string') {
              // Text message - parse directly
              messageData = event.data;
            } else if (event.data instanceof Blob) {
              // Blob message - convert to text first
              messageData = await event.data.text();
            } else if (event.data instanceof ArrayBuffer) {
              // ArrayBuffer - convert to text via TextDecoder
              const decoder = new TextDecoder();
              messageData = decoder.decode(event.data);
            } else {
              // Fallback: try to convert to string
              messageData = String(event.data);
            }
            
            // Parse JSON after ensuring we have a string
            const response = JSON.parse(messageData);
            this.handleResponse(response);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error, {
              dataType: typeof event.data,
              isBlob: event.data instanceof Blob,
              isArrayBuffer: event.data instanceof ArrayBuffer,
              errorMessage: error.message
            });
            // Don't throw - allow connection to continue for other messages
          }
        };

        webSocket.onerror = (error) => {
          clearTimeout(setupTimeout);
          console.error('WebSocket error:', error);
          const errorMessage = 'Connection error. Please check your API key and try again.';
          this.onError(errorMessage);
          if (this.setupPromiseReject && !this.setupComplete) {
            this.setupPromiseReject(new Error(errorMessage));
            this.setupPromiseReject = null;
            this.setupPromiseResolve = null;
          }
        };

        webSocket.onclose = (event) => {
          clearTimeout(setupTimeout);
          console.log('WebSocket closed:', event.code, event.reason, {
            wasClean: event.wasClean,
            code: event.code,
            reason: event.reason,
            setupComplete: this.setupComplete,
          });
          this.isConnected = false;
          this.onStatusChange('disconnected');

          // If setup didn't complete and connection closed, reject the promise
          if (!this.setupComplete && this.setupPromiseReject) {
            let errorMessage = `Connection closed: ${event.reason || `Code ${event.code}`}`;
            
            // Provide helpful error messages for common WebSocket close codes
            // 1007 = Invalid payload data (malformed JSON, wrong encoding)
            if (event.code === 1007) {
              errorMessage = 'Invalid request format. Please check your API key and model configuration in Settings.';
              console.error('1007 Error - Invalid argument. Possible causes:', {
                model: this.model,
                voice: this.voice,
                systemInstructionLength: this.systemInstruction?.length,
                apiKeyPresent: !!this.apiKey,
                apiKeyLength: this.apiKey?.length,
              });
            } 
            // 1008 = Policy violation (model not supported, permission denied)
            else if (event.code === 1008) {
              if (event.reason && event.reason.includes('not found')) {
                const fallbacks = getFallbackModelSuggestions(this.model);
                const fallbackHint = fallbacks.length > 0 
                  ? ` Try using one of these models instead: ${fallbacks.join(', ')}.` 
                  : '';
                errorMessage = `Model "${this.model}" is not found or not supported for voice chat.${fallbackHint} Please check available models in Settings.`;
              } else {
                errorMessage = 'Model not supported or API key lacks permissions. Please verify your API key has access to voice chat features.';
              }
            }
            // 1001 = Going away (server shutdown/restart)
            else if (event.code === 1001) {
              errorMessage = 'Connection closed by server. Please try again.';
            }
            // 1006 = Abnormal closure (no close frame received)
            else if (event.code === 1006) {
              errorMessage = 'Connection lost. Check your internet connection and try again.';
            }
            // Reason-based messages
            else if (event.reason) {
              if (event.reason.includes('is not found') || event.reason.includes('NOT_FOUND')) {
                const fallbacks = getFallbackModelSuggestions(this.model);
                const fallbackHint = fallbacks.length > 0 
                  ? ` Try using one of these models instead: ${fallbacks.join(', ')}.` 
                  : '';
                errorMessage = `Model "${this.model}" is not available for voice chat.${fallbackHint} Please check available models in Settings.`;
              } else if (event.reason.includes('invalid argument') || event.reason.includes('INVALID_ARGUMENT')) {
                errorMessage = 'Invalid request parameters. Please check your Settings configuration (API key, model, and voice settings).';
              } else if (event.reason.includes('permission') || event.reason.includes('PERMISSION_DENIED')) {
                errorMessage = 'API key does not have permission for voice chat. Please verify your API key permissions.';
              } else if (event.reason.includes('quota') || event.reason.includes('RESOURCE_EXHAUSTED')) {
                errorMessage = 'API quota exceeded. Please try again later.';
              }
            }
            
            this.onError(errorMessage);
            this.setupPromiseReject(new Error(errorMessage));
            this.setupPromiseReject = null;
            this.setupPromiseResolve = null;
          } else if (event.code !== 1000 && event.code !== 1001) {
            // Connection closed after setup - this is likely an error
            let errorMessage = `Connection closed: ${event.reason || `Code ${event.code}`}`;
            if (event.reason) {
              errorMessage = event.reason;
            }
            this.onError(errorMessage);
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
    // Log all responses for debugging
    console.log('WebSocket response received:', {
      timestamp: new Date().toISOString(),
      hasSetupComplete: !!response.setupComplete,
      hasServerContent: !!response.serverContent,
      hasInputTranscript: !!response.inputTranscript,
      keys: Object.keys(response)
    });

    // Handle error responses from server
    if (response.error) {
      const error = response.error;
      console.error('Server error response:', JSON.stringify(error, null, 2));
      
      let errorMessage = 'Server error';
      if (error.message) {
        errorMessage = error.message;
      } else if (error.code) {
        errorMessage = `Error ${error.code}: ${error.message || 'Unknown error'}`;
      }
      
      // Provide context-specific error messages based on error details
      if (error.code === 'INVALID_ARGUMENT' || error.message?.includes('invalid argument') || error.message?.includes('INVALID_ARGUMENT')) {
        // Try to extract which field is invalid from error details
        let fieldHint = '';
        if (error.message) {
          // Look for field references in error message
          const fieldMatch = error.message.match(/field\s+["']?(\w+)["']?/i);
          if (fieldMatch) {
            fieldHint = ` (field: ${fieldMatch[1]})`;
          }
        }
        errorMessage = `Invalid request parameters${fieldHint}. Please check your Settings configuration (API key, model, and voice settings).`;
      } else if (error.code === 'NOT_FOUND' || (error.message?.includes('model') && error.message?.includes('not found'))) {
        const fallbacks = getFallbackModelSuggestions(this.model);
        const fallbackHint = fallbacks.length > 0 
          ? ` Try using one of these models instead: ${fallbacks.join(', ')}.` 
          : '';
        errorMessage = `Model "${this.model}" is not available for voice chat.${fallbackHint} Please check available models in Settings.`;
      } else if (error.code === 'PERMISSION_DENIED' || error.message?.includes('permission') || error.message?.includes('PERMISSION_DENIED')) {
        errorMessage = 'API key does not have permission for voice chat. Please verify your API key permissions.';
      } else if (error.code === 'RESOURCE_EXHAUSTED' || error.message?.includes('quota') || error.message?.includes('RESOURCE_EXHAUSTED')) {
        errorMessage = 'API quota exceeded. Please try again later.';
      }
      
      // If setup hasn't completed and we get an error, reject the promise
      if (!this.setupComplete && this.setupPromiseReject) {
        this.setupPromiseReject(new Error(errorMessage));
        this.setupPromiseReject = null;
        this.setupPromiseResolve = null;
      }
      
      this.onError(errorMessage);
      return;
    }

    // Handle setup complete - this is when we resolve the promise
    if (response.setupComplete) {
      console.log('Setup complete - voice chat ready');
      this.setupComplete = true;
      this.onStatusChange('ready');
      
      // Resolve the promise now that setup is complete
      if (this.setupPromiseResolve) {
        this.setupPromiseResolve();
        this.setupPromiseResolve = null;
        this.setupPromiseReject = null;
      }
      return;
    }

    // Check for input transcript at top-level (user speech transcription)
    if (response.inputTranscript?.text) {
      console.log('Input transcription received (top-level):', response.inputTranscript.text);
      this.onTranscript(response.inputTranscript.text, 'user');
    }

    // Handle server content (audio response)
    if (response.serverContent) {
      const content = response.serverContent;

      // Check for input transcript in serverContent (user speech transcription)
      if (content.inputTranscript) {
        const transcript = typeof content.inputTranscript === 'string' 
          ? content.inputTranscript 
          : content.inputTranscript.text;
        if (transcript && typeof transcript === 'string' && transcript.trim()) {
          console.log('Input transcription received (serverContent):', transcript);
          this.onTranscript(transcript, 'user');
        }
      }

      // Check for model turn (AI audio response)
      if (content.modelTurn) {
        const parts = content.modelTurn.parts || [];

        for (const part of parts) {
          // Handle audio data - allow variations of PCM MIME types
          if (part.inlineData && (part.inlineData.mimeType === 'audio/pcm' || 
              part.inlineData.mimeType?.startsWith('audio/pcm'))) {
            console.log('Audio chunk received:', {
              mimeType: part.inlineData.mimeType,
              dataLength: part.inlineData.data?.length,
              queueLength: audioQueue.length
            });
            const audioData = base64ToArrayBuffer(part.inlineData.data);
            // Convert to Uint8Array and use buffered streaming approach
            const uint8Array = new Uint8Array(audioData);
            addPCM16Chunk(uint8Array);
          } else if (part.inlineData?.mimeType?.includes('audio')) {
            // Log any other audio formats for debugging
            console.log('Audio part received (unexpected format):', {
              mimeType: part.inlineData.mimeType,
              dataSize: part.inlineData.data?.length
            });
          }

          // Handle text transcript (AI speech transcription)
          if (part.text) {
            console.log('AI text transcript received:', part.text.substring(0, 100));
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

    // Log unknown response types for debugging
    if (!response.setupComplete && !response.serverContent && !response.toolCall && !response.error) {
      console.warn('Unknown response type received:', Object.keys(response));
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
      console.log('Starting microphone capture...');
      // Get microphone access
      mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      // Create separate audio context for capturing raw PCM (16kHz, mono, 16-bit)
      // This is different from playback context which uses 24kHz
      if (!captureContext) {
        captureContext = new (window.AudioContext || window.webkitAudioContext)({
          sampleRate: 16000, // Must match API requirement
        });
      }
      const ctx = captureContext;
      
      console.log('Audio context sample rate:', ctx.sampleRate);
      console.log('Audio input configuration:', {
        channels: mediaStream.getAudioTracks()[0]?.getSettings(),
        trackLabel: mediaStream.getAudioTracks()[0]?.label
      });
      
      // Create source and analyser for audio level monitoring
      const source = ctx.createMediaStreamSource(mediaStream);
      this.analyser = ctx.createAnalyser();
      this.analyser.fftSize = 256;
      source.connect(this.analyser);

      // Start audio level monitoring
      this.startAudioLevelMonitoring();

      // Create ScriptProcessorNode to capture raw PCM audio
      // Buffer size 2048 samples = ~128ms at 16kHz (more responsive VAD than 4096 samples)
      scriptProcessor = ctx.createScriptProcessor(2048, 1, 1);
      
      scriptProcessor.onaudioprocess = (event) => {
        if (!this.isListening || !this.isConnected) return;

        // Get Float32 audio data from input buffer
        const inputBuffer = event.inputBuffer;
        const inputData = inputBuffer.getChannelData(0); // Mono channel

        // Convert Float32 (-1.0 to 1.0) to Int16 (-32768 to 32767) PCM
        const pcmData = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          // Clamp values to prevent overflow
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }

        // Convert Int16Array to base64 for sending
        const base64 = arrayBufferToBase64(pcmData.buffer);
        this.sendAudio(base64);
      };

      // Connect source to script processor (for PCM capture) and analyser (for level monitoring)
      source.connect(scriptProcessor);
      scriptProcessor.connect(ctx.destination); // Required for ScriptProcessorNode to work
      
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
   * Uses correct realtimeInput.audio format per Gemini Live API spec
   * MIME type must be 'audio/pcm' or 'audio/pcm;rate=16000' - not WebM/Opus
   */
  sendAudio(base64Audio) {
    if (!webSocket || webSocket.readyState !== WebSocket.OPEN) {
      return;
    }

    console.log('Sending audio chunk:', {
      timestamp: new Date().toISOString(),
      base64Length: base64Audio.length,
      mimeType: 'audio/pcm;rate=16000'
    });

    const message = {
      realtimeInput: {
        audio: {
          data: base64Audio,
          mimeType: 'audio/pcm;rate=16000', // API requires PCM, not WebM/Opus
        },
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
    
    if (scriptProcessor) {
      scriptProcessor.disconnect();
      scriptProcessor = null;
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
    
    if (captureContext) {
      captureContext.close().catch(() => {});
      captureContext = null;
    }

    if (webSocket) {
      webSocket.close(1000, 'User disconnected');
      webSocket = null;
    }

    audioQueue = [];
    isPlaying = false;
    isStreamComplete = false;
    scheduledTime = 0;
    if (checkInterval) {
      clearInterval(checkInterval);
      checkInterval = null;
    }
    endOfQueueAudioSource = null;
    this.isConnected = false;
    this.onStatusChange('disconnected');
  }

  /**
   * Interrupt AI speech
   */
  interrupt() {
    // Clear audio queue and reset playback state
    audioQueue = [];
    isPlaying = false;
    isStreamComplete = true;
    scheduledTime = 0;
    if (checkInterval) {
      clearInterval(checkInterval);
      checkInterval = null;
    }
    if (endOfQueueAudioSource) {
      endOfQueueAudioSource.onended = null;
      endOfQueueAudioSource = null;
    }

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
