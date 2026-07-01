---
sidebar_position: 5
title: "Challenge 34: Speech-to-Text"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Challenge 34: Speech-to-Text

:::info Estimated Time
**50 min** | **Cost**: $2-5 (estimated) | **Domain**: Text Analysis Solutions (15-20%)
:::

## Exam skills covered
- Implement speech-to-text transcription
- Configure real-time and batch transcription
- Implement custom speech models for domain-specific vocabulary

## Overview

Azure Speech service provides speech-to-text (STT) capabilities:

| Mode | Description | Use Case |
|------|-------------|----------|
| **Real-time** | Continuous recognition from mic/stream | Live captions, voice commands |
| **Batch** | Async transcription of audio files | Meeting recordings, call centers |
| **Custom Speech** | Models trained on your vocabulary | Medical, legal, technical domains |

Key classes: `SpeechConfig`, `SpeechRecognizer`, `AudioConfig`

## Prerequisites
- Azure subscription
- Azure Speech resource
- Python 3.9+ or .NET 8
- Package: `azure-cognitiveservices-speech` (v1.38+)
- Microphone (for real-time) or audio file (.wav)

## Implementation

### Task 1: Create Speech Resource

```bash
az group create --name rg-ai102-speech --location eastus2

az cognitiveservices account create \
  --name speech-ai102 \
  --resource-group rg-ai102-speech \
  --kind SpeechServices \
  --sku S0 \
  --location eastus2

SPEECH_KEY=$(az cognitiveservices account keys list --name speech-ai102 --resource-group rg-ai102-speech --query key1 -o tsv)
SPEECH_REGION="eastus2"
```

### Task 2: Real-Time Speech Recognition

<Tabs>
<TabItem value="python" label="Python SDK">

```python
import os
import azure.cognitiveservices.speech as speechsdk

speech_config = speechsdk.SpeechConfig(
    subscription=os.environ["AZURE_SPEECH_KEY"],
    region=os.environ["AZURE_SPEECH_REGION"]
)
speech_config.speech_recognition_language = "en-US"

# Option 1: Recognize from audio file
audio_config = speechsdk.audio.AudioConfig(filename="meeting-recording.wav")
recognizer = speechsdk.SpeechRecognizer(speech_config=speech_config, audio_config=audio_config)

# Single utterance recognition
print("Recognizing from file...")
result = recognizer.recognize_once()

if result.reason == speechsdk.ResultReason.RecognizedSpeech:
    print(f"Recognized: {result.text}")
    print(f"Duration: {result.duration / 10_000_000:.2f} seconds")
elif result.reason == speechsdk.ResultReason.NoMatch:
    print(f"No speech recognized: {result.no_match_details}")
elif result.reason == speechsdk.ResultReason.Canceled:
    cancellation = result.cancellation_details
    print(f"Canceled: {cancellation.reason}")
    if cancellation.reason == speechsdk.CancellationReason.Error:
        print(f"Error: {cancellation.error_details}")
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
using Microsoft.CognitiveServices.Speech;
using Microsoft.CognitiveServices.Speech.Audio;

var speechConfig = SpeechConfig.FromSubscription(
    Environment.GetEnvironmentVariable("AZURE_SPEECH_KEY"),
    Environment.GetEnvironmentVariable("AZURE_SPEECH_REGION"));
speechConfig.SpeechRecognitionLanguage = "en-US";

using var audioConfig = AudioConfig.FromWavFileInput("meeting-recording.wav");
using var recognizer = new SpeechRecognizer(speechConfig, audioConfig);

var result = await recognizer.RecognizeOnceAsync();

switch (result.Reason)
{
    case ResultReason.RecognizedSpeech:
        Console.WriteLine($"Recognized: {result.Text}");
        break;
    case ResultReason.NoMatch:
        Console.WriteLine("No speech recognized.");
        break;
    case ResultReason.Canceled:
        var cancellation = CancellationDetails.FromResult(result);
        Console.WriteLine($"Canceled: {cancellation.Reason}, Error: {cancellation.ErrorDetails}");
        break;
}
```

</TabItem>
</Tabs>

### Task 3: Continuous Recognition (Full Meeting Transcription)

<Tabs>
<TabItem value="python" label="Python SDK">

```python
import threading

speech_config = speechsdk.SpeechConfig(
    subscription=os.environ["AZURE_SPEECH_KEY"],
    region=os.environ["AZURE_SPEECH_REGION"]
)
speech_config.speech_recognition_language = "en-US"
speech_config.set_property(
    speechsdk.PropertyId.SpeechServiceResponse_DiarizeIntermediateResults, "true"
)

audio_config = speechsdk.audio.AudioConfig(filename="long-meeting.wav")
recognizer = speechsdk.SpeechRecognizer(speech_config=speech_config, audio_config=audio_config)

transcript = []
done = threading.Event()

def recognized_handler(evt):
    if evt.result.reason == speechsdk.ResultReason.RecognizedSpeech:
        transcript.append(evt.result.text)
        print(f"  [{evt.result.offset / 10_000_000:.1f}s] {evt.result.text}")

def session_stopped_handler(evt):
    done.set()

def canceled_handler(evt):
    print(f"Canceled: {evt.cancellation_details.reason}")
    done.set()

# Connect event handlers
recognizer.recognized.connect(recognized_handler)
recognizer.session_stopped.connect(session_stopped_handler)
recognizer.canceled.connect(canceled_handler)

# Start continuous recognition
print("Starting continuous recognition...")
recognizer.start_continuous_recognition()
done.wait()
recognizer.stop_continuous_recognition()

# Full transcript
print(f"\n{'='*50}")
print(f"Full transcript ({len(transcript)} segments):")
print(" ".join(transcript))
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
using var audioConfig = AudioConfig.FromWavFileInput("long-meeting.wav");
using var recognizer = new SpeechRecognizer(speechConfig, audioConfig);

var transcript = new List<string>();
var stopRecognition = new TaskCompletionSource<int>();

recognizer.Recognized += (s, e) =>
{
    if (e.Result.Reason == ResultReason.RecognizedSpeech)
    {
        transcript.Add(e.Result.Text);
        Console.WriteLine($"  [{e.Result.Offset.TotalSeconds:F1}s] {e.Result.Text}");
    }
};

recognizer.SessionStopped += (s, e) => stopRecognition.TrySetResult(0);
recognizer.Canceled += (s, e) => stopRecognition.TrySetResult(0);

await recognizer.StartContinuousRecognitionAsync();
await stopRecognition.Task;
await recognizer.StopContinuousRecognitionAsync();

Console.WriteLine($"\nFull transcript ({transcript.Count} segments):");
Console.WriteLine(string.Join(" ", transcript));
```

</TabItem>
</Tabs>

### Task 4: Batch Transcription API

<Tabs>
<TabItem value="rest" label="REST API">

```bash
SPEECH_KEY="<your-key>"
REGION="eastus2"

# Create batch transcription job
curl -s "https://${REGION}.api.cognitive.microsoft.com/speechtotext/v3.2/transcriptions" \
  -H "Ocp-Apim-Subscription-Key: ${SPEECH_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "contentUrls": [
      "https://storage.blob.core.windows.net/audio/meeting1.wav?sv=...&sig=..."
    ],
    "locale": "en-US",
    "displayName": "Meeting Transcription",
    "properties": {
      "wordLevelTimestampsEnabled": true,
      "diarizationEnabled": true,
      "maxSpeakerCount": 5,
      "punctuationMode": "DictatedAndAutomatic"
    }
  }' | jq '{id: .self, status: .status}'

# Check status (replace TRANSCRIPTION_URL)
curl -s "https://${REGION}.api.cognitive.microsoft.com/speechtotext/v3.2/transcriptions/<id>" \
  -H "Ocp-Apim-Subscription-Key: ${SPEECH_KEY}" | jq '.status'

# Get results
curl -s "https://${REGION}.api.cognitive.microsoft.com/speechtotext/v3.2/transcriptions/<id>/files" \
  -H "Ocp-Apim-Subscription-Key: ${SPEECH_KEY}" | jq '.values[].links.contentUrl'
```

</TabItem>
</Tabs>

## Expected Output

```text
Recognizing from file...
Recognized: Welcome to the quarterly business review meeting.
Duration: 3.45 seconds

Starting continuous recognition...
  [0.5s] Welcome to the quarterly business review meeting.
  [4.2s] Today we'll discuss our progress on key initiatives.
  [8.1s] Let's start with the revenue numbers from last quarter.
  [12.5s] We exceeded our target by fifteen percent.

==================================================
Full transcript (4 segments):
Welcome to the quarterly business review meeting. Today we'll discuss our progress on key initiatives. Let's start with the revenue numbers from last quarter. We exceeded our target by fifteen percent.
```

## Break & fix

| Scenario | Symptom | Root Cause | Fix |
|----------|---------|------------|-----|
| `NoMatch` result | No speech recognized | Audio is silence, wrong format, or wrong language | Verify WAV format (16kHz, 16-bit, mono PCM); check language setting |
| `Canceled` with auth error | 401 Unauthorized | Wrong key or region | Verify key matches region; check resource is active |
| Truncated recognition | Only first sentence | Used `recognize_once` instead of continuous | Use `start_continuous_recognition` for long audio |
| Missing words | Incomplete transcript | Domain-specific vocabulary | Train Custom Speech model with your terminology |
| High latency | Slow results | Network or large audio chunks | Use streaming/push audio; check network connectivity |

## Knowledge Check

<KnowledgeCheck questions={[
  {
    question: "What is the difference between recognize_once and continuous recognition?",
    options: [
      "recognize_once is faster; continuous is more accurate",
      "recognize_once processes one utterance and stops; continuous recognition processes until explicitly stopped",
      "recognize_once works offline; continuous requires internet",
      "They produce identical results but with different APIs"
    ],
    correctAnswer: 1,
    explanation: "recognize_once listens for a single utterance (until silence) and returns. Continuous recognition processes the entire audio stream, firing 'recognized' events for each utterance until stopped."
  },
  {
    question: "What audio format does the Speech SDK expect for file input?",
    options: [
      "Any audio format — it auto-converts",
      "MP3 only",
      "WAV with PCM encoding (default: 16kHz, 16-bit, mono)",
      "FLAC or OGG Vorbis"
    ],
    correctAnswer: 2,
    explanation: "The SDK expects WAV files with PCM encoding. Default expected format is 16kHz sample rate, 16-bit depth, mono channel. Other formats may need explicit AudioStreamFormat configuration."
  },
  {
    question: "When should you use batch transcription instead of real-time recognition?",
    options: [
      "When you need results in under 1 second",
      "Batch is always preferred over real-time",
      "When you need speaker diarization",
      "When transcribing pre-recorded audio files asynchronously, especially long recordings or multiple files"
    ],
    correctAnswer: 3,
    explanation: "Batch transcription is for pre-recorded files processed asynchronously via REST API. It's ideal for long recordings, multiple files, and when real-time results aren't needed."
  },
  {
    question: "What does diarization provide in speech-to-text?",
    options: [
      "Identification of which speaker said what (speaker separation)",
      "Translation to another language",
      "Punctuation correction",
      "Noise reduction"
    ],
    correctAnswer: 0,
    explanation: "Diarization separates speech by speaker, identifying 'who said what.' It labels transcript segments with speaker IDs, useful for meetings with multiple participants."
  },
  {
    question: "How do you handle the CancellationReason.Error in speech recognition?",
    options: [
      "Ignore it — it's informational only",
      "Restart the recognizer automatically",
      "Check cancellation_details.error_details for the specific error (auth, network, format issue) and fix accordingly",
      "Switch to a different language"
    ],
    correctAnswer: 2,
    explanation: "CancellationReason.Error indicates a real failure. Check error_details for specifics — common causes are invalid credentials, network issues, or unsupported audio format."
  }
]} />

## Cleanup

```bash
az group delete --name rg-ai102-speech --yes --no-wait
```

## Learn More

- [Speech-to-text overview](https://learn.microsoft.com/azure/ai-services/speech-service/speech-to-text)
- [Speech SDK quickstart](https://learn.microsoft.com/azure/ai-services/speech-service/get-started-speech-to-text)
- [Batch transcription](https://learn.microsoft.com/azure/ai-services/speech-service/batch-transcription)
- [Custom Speech](https://learn.microsoft.com/azure/ai-services/speech-service/custom-speech-overview)
