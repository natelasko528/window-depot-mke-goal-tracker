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
    
    // Text transcript
    if (part.text) {
      console.log('AI said:', part.text);
    }
  }
}
```

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

## Best Practices

1. **Validate setup message** before sending
2. **Wait for setupComplete** before sending content
3. **Handle WebSocket close events** with proper error messages
4. **Use camelCase** for WebSocket JSON field names (different from REST API which uses snake_case)
5. **Clean up WebSocket** connections on unmount

## References

- [Gemini Live API Guide](https://ai.google.dev/gemini-api/docs/live-guide)
- [Live API Reference](https://ai.google.dev/api/live)
