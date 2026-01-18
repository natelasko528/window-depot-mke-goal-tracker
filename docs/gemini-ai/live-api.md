# Gemini Live API - WebSocket Voice Chat

The Gemini Live API (`BidiGenerateContent`) is a stateful WebSocket-based API designed for bi-directional streaming and real-time conversational use cases, including voice chat.

## WebSocket Connection

### Connection URL

```
wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key={API_KEY}
```

## Setup Message

The first message sent after WebSocket connection must be a setup message:

```javascript
const setupMessage = {
  setup: {
    model: `models/gemini-2.5-flash-native-audio-preview-12-2025`,
    generationConfig: {
      responseModalities: ['AUDIO'], // Use camelCase for WebSocket JSON
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: 'Puck', // Or: Charon, Kore, Fenrir, Aoede
          },
        },
      },
    },
    systemInstruction: {
      parts: [{ text: 'Your system instruction here' }],
    },
  },
};

webSocket.send(JSON.stringify(setupMessage));
```

### Important Notes

- Field names use **camelCase** for WebSocket JSON messages (`responseModalities`, not `response_modalities`)
- Model must be prefixed with `models/`
- Wait for `setupComplete` response before sending other messages
- Setup message is required first

## Setup Complete Response

After sending setup, wait for confirmation:

```javascript
webSocket.onmessage = (event) => {
  const response = JSON.parse(event.data);
  
  if (response.setupComplete) {
    console.log('Setup complete - ready to send messages');
    // Now you can send clientContent or realtimeInput
  }
};
```

## Sending Audio

### Audio Format

- Input: 16kHz, mono, 16-bit PCM or WebM
- Output: 24kHz, mono, 16-bit PCM

### Send Audio Chunk

```javascript
const message = {
  realtimeInput: {
    audio: {
      data: base64AudioData,
      mimeType: 'audio/webm;codecs=opus',
    },
  },
};

webSocket.send(JSON.stringify(message));
```

## Receiving Audio

Audio responses come in `serverContent.modelTurn.parts`:

```javascript
if (response.serverContent?.modelTurn) {
  const parts = response.serverContent.modelTurn.parts || [];
  
  for (const part of parts) {
    // Audio data
    if (part.inlineData && part.inlineData.mimeType === 'audio/pcm') {
      const audioData = base64ToArrayBuffer(part.inlineData.data);
      // Play audio
    }
    
    // Text transcript (may also appear in part.text when using AUDIO modality)
    if (part.text) {
      console.log('AI said:', part.text);
    }
  }
}
```

## Audio Transcriptions

The Live API supports transcription of both audio input (user speech) and audio output (model speech). This is separate from the `part.text` that may appear in `modelTurn.parts`.

### Output Audio Transcription

To enable transcription of the model's audio output, add `outputAudioTranscription: {}` to the setup config:

```javascript
const setupMessage = {
  setup: {
    model: `models/gemini-2.5-flash-native-audio-preview-12-2025`,
    generationConfig: {
      responseModalities: ['AUDIO'],
      outputAudioTranscription: {}, // Enable output transcription
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: 'Puck',
          },
        },
      },
    },
    // ...
  },
};
```

Access transcripts in responses via `response.serverContent.outputTranscription.text`:

```javascript
if (response.serverContent?.outputTranscription) {
  const transcript = response.serverContent.outputTranscription.text;
  console.log('AI speech transcript:', transcript);
  // Display transcript in chat UI
}
```

### Input Audio Transcription

To enable transcription of user audio input, add `inputAudioTranscription: {}` to the setup config:

```javascript
const setupMessage = {
  setup: {
    model: `models/gemini-2.5-flash-native-audio-preview-12-2025`,
    generationConfig: {
      responseModalities: ['AUDIO'],
      inputAudioTranscription: {}, // Enable input transcription
      // ...
    },
    // ...
  },
};
```

Access transcripts in responses via `response.serverContent.inputTranscription.text`:

```javascript
if (response.serverContent?.inputTranscription) {
  const transcript = response.serverContent.inputTranscription.text;
  console.log('User speech transcript:', transcript);
  // Display transcript in chat UI
}
```

**Important Notes:**
- Transcription language is automatically inferred from the audio
- Both `inputAudioTranscription` and `outputAudioTranscription` can be enabled simultaneously
- Transcription is separate from `part.text` in `modelTurn.parts` (which may contain other text)

## Sending Text

```javascript
const message = {
  clientContent: {
    turns: [
      {
        role: 'user',
        parts: [{ text: 'Hello' }],
      },
    ],
    turnComplete: true,
  },
};

webSocket.send(JSON.stringify(message));
```

## Project Usage

In `src/lib/voiceChat.js`, the Live API is fully implemented:

1. **Connection**: WebSocket connection with API key
2. **Setup**: Send setup message with model and voice config
3. **Audio Streaming**: Send audio chunks from microphone
4. **Response Handling**: Process audio and text responses

## Available Voices

- `Puck` - Friendly and approachable
- `Charon` - Calm and professional
- `Kore` - Warm and supportive
- `Fenrir` - Confident and energetic
- `Aoede` - Clear and articulate

## Error Codes

- **1007** - Invalid argument (check setup message format)
- **1008** - Policy violation (model not supported or permission denied)
- **1006** - Abnormal closure (connection lost)

## Voice Activity Detection (VAD)

The Live API includes automatic Voice Activity Detection (VAD) to detect when users start and stop speaking. This is configured via `realtimeInputConfig.automaticActivityDetection`:

### Automatic VAD (Default)

By default, automatic VAD is enabled. You can customize sensitivity settings:

```javascript
const setupMessage = {
  setup: {
    // ...
    realtimeInputConfig: {
      automaticActivityDetection: {
        disabled: false, // Default: automatic VAD enabled
        startOfSpeechSensitivity: 'START_SENSITIVITY_HIGH', // or 'START_SENSITIVITY_LOW', 'START_SENSITIVITY_UNSPECIFIED'
        endOfSpeechSensitivity: 'END_SENSITIVITY_HIGH', // or 'END_SENSITIVITY_LOW', 'END_SENSITIVITY_UNSPECIFIED'
        prefixPaddingMs: 100, // Padding before speech start (ms)
        silenceDurationMs: 500, // Silence duration before ending speech (ms)
      },
    },
  },
};
```

**Sensitivity Options:**
- `START_SENSITIVITY_HIGH`: Detects start of speech more often (default if unspecified)
- `START_SENSITIVITY_LOW`: Detects start of speech less often
- `END_SENSITIVITY_HIGH`: Ends speech detection more often (default if unspecified)
- `END_SENSITIVITY_LOW`: Ends speech detection less often

### Manual VAD (Disable Automatic)

To disable automatic VAD and manually control activity detection:

```javascript
const setupMessage = {
  setup: {
    // ...
    realtimeInputConfig: {
      automaticActivityDetection: {
        disabled: true, // Client must send activityStart/activityEnd messages
      },
    },
  },
};
```

When disabled, you must send `activityStart` and `activityEnd` messages:

```javascript
// Mark start of speech
ws.send(JSON.stringify({
  realtimeInput: {
    activityStart: {},
  },
}));

// Send audio chunks
ws.send(JSON.stringify({
  realtimeInput: {
    audio: { data: base64Audio, mimeType: 'audio/pcm;rate=16000' },
  },
}));

// Mark end of speech
ws.send(JSON.stringify({
  realtimeInput: {
    activityEnd: {},
  },
}));
```

**Note:** When automatic VAD is enabled, use `audioStreamEnd` instead of `activityEnd` to indicate the audio stream has ended (e.g., microphone turned off).

## Important Limitations

### Response Modalities

**CRITICAL:** You can only set **one** response modality (`TEXT` or `AUDIO`) per session. Setting both `['AUDIO', 'TEXT']` results in a `1007: Invalid argument` error.

```javascript
// ✅ CORRECT: Single modality
responseModalities: ['AUDIO']

// ❌ WRONG: Multiple modalities cause error
responseModalities: ['AUDIO', 'TEXT']
```

To get transcripts with AUDIO modality, use `outputAudioTranscription: {}` and `inputAudioTranscription: {}` instead.

## Best Practices

1. **Validate setup message** before sending - ensure only ONE responseModality is set
2. **Wait for setupComplete** before sending content
3. **Handle WebSocket close events** with proper error messages
4. **Use camelCase** for WebSocket JSON field names (different from REST API which uses snake_case)
5. **Enable transcriptions** via `outputAudioTranscription` and `inputAudioTranscription` if you need transcripts
6. **Clean up WebSocket** connections on unmount

## References

- [Gemini Live API Guide](https://ai.google.dev/gemini-api/docs/live-guide)
- [Live API Reference](https://ai.google.dev/api/live)
- [Live API Capabilities Guide](https://ai.google.dev/gemini-api/docs/live-guide#python) - Comprehensive guide covering transcriptions, VAD, and all configuration options