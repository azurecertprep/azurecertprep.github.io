---
sidebar_position: 6
title: "Challenge 35: Text-to-Speech and SSML"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Challenge 35: Text-to-Speech and SSML

:::info Estimated Time
**45 min** | **Cost**: $2-5 (estimated) | **Domain**: Implement NLP Solutions (15-20%)
:::

## Exam skills covered
- Implement text-to-speech synthesis
- Improve speech output with SSML (Speech Synthesis Markup Language)
- Configure voice selection and audio output formats

## Overview

Azure Text-to-Speech (TTS) converts text into natural-sounding audio:

| Feature | Description |
|---------|-------------|
| **Neural voices** | AI-generated voices (400+ across 140 languages) |
| **SSML** | XML markup for controlling prosody, emphasis, pauses |
| **Audio formats** | WAV, MP3, OGG, raw PCM |
| **Viseme** | Mouth position data for avatar animation |
| **Custom Neural Voice** | Train a unique voice (requires approval) |

SSML elements: `<speak>`, `<voice>`, `<prosody>`, `<emphasis>`, `<break>`, `<say-as>`, `<phoneme>`

## Prerequisites
- Azure subscription
- Azure Speech resource
- Python 3.9+ or .NET 8
- Package: `azure-cognitiveservices-speech` (v1.38+)
- Audio output device (speaker) or file output

## Implementation

### Task 1: Basic Text-to-Speech

<Tabs>
<TabItem value="python" label="Python SDK">

```python
import os
import azure.cognitiveservices.speech as speechsdk

speech_config = speechsdk.SpeechConfig(
    subscription=os.environ["AZURE_SPEECH_KEY"],
    region=os.environ["AZURE_SPEECH_REGION"]
)

# Set voice
speech_config.speech_synthesis_voice_name = "en-US-JennyNeural"

# Set output format
speech_config.set_speech_synthesis_output_format(
    speechsdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3
)

# Synthesize to audio file
audio_config = speechsdk.audio.AudioOutputConfig(filename="output.mp3")
synthesizer = speechsdk.SpeechSynthesizer(
    speech_config=speech_config,
    audio_config=audio_config
)

text = "Welcome to Azure AI Services. Today we'll explore text-to-speech capabilities."
result = synthesizer.speak_text_async(text).get()

if result.reason == speechsdk.ResultReason.SynthesizingAudioCompleted:
    print(f"Speech synthesized successfully!")
    print(f"Audio duration: {result.audio_duration / 10_000_000:.2f} seconds")
    print(f"Audio length: {len(result.audio_data)} bytes")
elif result.reason == speechsdk.ResultReason.Canceled:
    cancellation = result.cancellation_details
    print(f"Synthesis canceled: {cancellation.reason}")
    print(f"Error: {cancellation.error_details}")
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
using Microsoft.CognitiveServices.Speech;

var speechConfig = SpeechConfig.FromSubscription(
    Environment.GetEnvironmentVariable("AZURE_SPEECH_KEY"),
    Environment.GetEnvironmentVariable("AZURE_SPEECH_REGION"));

speechConfig.SpeechSynthesisVoiceName = "en-US-JennyNeural";
speechConfig.SetSpeechSynthesisOutputFormat(SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3);

using var audioConfig = AudioConfig.FromWavFileOutput("output.wav");
using var synthesizer = new SpeechSynthesizer(speechConfig, audioConfig);

var result = await synthesizer.SpeakTextAsync("Welcome to Azure AI text-to-speech.");

if (result.Reason == ResultReason.SynthesizingAudioCompleted)
    Console.WriteLine($"Audio synthesized: {result.AudioData.Length} bytes");
```

</TabItem>
</Tabs>

### Task 2: SSML for Advanced Speech Control

<Tabs>
<TabItem value="python" label="Python SDK">

```python
# Synthesize using SSML for fine control
ssml = """
<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis"
       xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="en-US">
    <voice name="en-US-JennyNeural">
        <prosody rate="-10%" pitch="+5%">
            Welcome to the Azure AI certification prep.
        </prosody>
        
        <break time="500ms"/>
        
        <emphasis level="strong">
            This is an important concept.
        </emphasis>
        
        <break time="300ms"/>
        
        <prosody volume="soft" rate="slow">
            Let me explain it step by step.
        </prosody>
        
        <break time="500ms"/>
        
        <!-- Pronunciation control -->
        The API version is <say-as interpret-as="characters">3.0</say-as>.
        
        <break time="200ms"/>
        
        <!-- Date and number formatting -->
        The release date is <say-as interpret-as="date" format="mdy">01/15/2024</say-as>.
        The cost is <say-as interpret-as="currency" language="en-US">$2.50</say-as>.
    </voice>
</speak>
"""

# Use SSML synthesis
audio_config = speechsdk.audio.AudioOutputConfig(filename="ssml-output.mp3")
synthesizer = speechsdk.SpeechSynthesizer(
    speech_config=speech_config,
    audio_config=audio_config
)

result = synthesizer.speak_ssml_async(ssml).get()

if result.reason == speechsdk.ResultReason.SynthesizingAudioCompleted:
    print(f"SSML synthesis complete: {len(result.audio_data)} bytes")
    print(f"Duration: {result.audio_duration / 10_000_000:.2f}s")
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
string ssml = @"
<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis'
       xmlns:mstts='https://www.w3.org/2001/mstts' xml:lang='en-US'>
    <voice name='en-US-JennyNeural'>
        <prosody rate='-10%' pitch='+5%'>
            Welcome to Azure AI certification prep.
        </prosody>
        <break time='500ms'/>
        <emphasis level='strong'>This is important.</emphasis>
    </voice>
</speak>";

var result = await synthesizer.SpeakSsmlAsync(ssml);
Console.WriteLine($"SSML result: {result.Reason}, {result.AudioData.Length} bytes");
```

</TabItem>
</Tabs>

### Task 3: List Available Voices

<Tabs>
<TabItem value="python" label="Python SDK">

```python
# List all available voices
synthesizer = speechsdk.SpeechSynthesizer(speech_config=speech_config, audio_config=None)
voices_result = synthesizer.get_voices_async("en-US").get()

if voices_result.reason == speechsdk.ResultReason.VoicesListRetrieved:
    print(f"Available en-US voices ({len(voices_result.voices)}):")
    for voice in voices_result.voices[:10]:
        print(f"  {voice.short_name}: {voice.local_name} "
              f"({voice.gender.name}, {voice.voice_type.name})")
        if voice.style_list:
            print(f"    Styles: {', '.join(voice.style_list)}")
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
SPEECH_KEY="<key>"
REGION="eastus2"

# Get access token
TOKEN=$(curl -s "https://${REGION}.api.cognitive.microsoft.com/sts/v1.0/issueToken" \
  -H "Ocp-Apim-Subscription-Key: ${SPEECH_KEY}" -X POST)

# List voices
curl -s "https://${REGION}.tts.speech.microsoft.com/cognitiveservices/voices/list" \
  -H "Authorization: Bearer ${TOKEN}" | jq '[.[] | select(.Locale=="en-US")] | .[0:5] | .[] | {ShortName, Gender, VoiceType}'

# Synthesize with SSML
curl -s "https://${REGION}.tts.speech.microsoft.com/cognitiveservices/v1" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/ssml+xml" \
  -H "X-Microsoft-OutputFormat: audio-16khz-32kbitrate-mono-mp3" \
  -d '<speak version="1.0" xml:lang="en-US"><voice name="en-US-JennyNeural">Hello world</voice></speak>' \
  --output output.mp3
```

</TabItem>
</Tabs>

## Expected Output

```
Speech synthesized successfully!
Audio duration: 4.82 seconds
Audio length: 77120 bytes

SSML synthesis complete: 98304 bytes
Duration: 8.15s

Available en-US voices (148):
  en-US-JennyNeural: Jenny (Female, Neural)
    Styles: assistant, chat, customerservice, newscast, angry, cheerful, sad
  en-US-GuyNeural: Guy (Male, Neural)
    Styles: newscast, angry, cheerful, sad
  en-US-AriaNeural: Aria (Female, Neural)
    Styles: chat, customerservice, narration-professional
```

## Break and Fix

| Scenario | Symptom | Root Cause | Fix |
|----------|---------|------------|-----|
| No audio output | 0 bytes generated | Invalid voice name | Use exact `short_name` from voices list |
| SSML parse error | Synthesis canceled | Malformed XML | Validate SSML structure; check namespace URIs |
| Voice not found | Cancellation error | Voice not available in region | Check voice availability per region |
| Audio quality poor | Robotic sound | Using old standard voices | Switch to Neural voices (`*Neural` suffix) |
| Large file size | Excessive audio bytes | Wrong output format | Use compressed format (MP3/OGG) instead of raw PCM |

## Knowledge Check

<KnowledgeCheck questions={[
  {
    question: "What is the purpose of the <prosody> SSML element?",
    options: [
      "To select which voice to use",
      "To control rate, pitch, and volume of speech output",
      "To insert silence between words",
      "To specify the output audio format"
    ],
    correctAnswer: 1,
    explanation: "The <prosody> element controls speech characteristics: rate (speed), pitch (high/low), and volume (loud/soft). Attributes accept percentages or preset values."
  },
  {
    question: "Which method do you use to synthesize speech from SSML?",
    options: [
      "speak_text_async(ssml)",
      "speak_ssml_async(ssml)",
      "synthesize(ssml, format='ssml')",
      "speak_async(ssml, mode='ssml')"
    ],
    correctAnswer: 1,
    explanation: "Use speak_ssml_async() for SSML input and speak_text_async() for plain text. The SSML method parses the XML markup for voice control."
  },
  {
    question: "What does the <say-as> SSML element do?",
    options: [
      "Defines an alias for a word",
      "Controls how specific content types are pronounced (dates, numbers, characters, currency)",
      "Adds emphasis to a word",
      "Changes the voice mid-sentence"
    ],
    correctAnswer: 1,
    explanation: "<say-as> controls pronunciation of structured content. interpret-as='date' reads dates correctly, 'characters' spells out letters, 'currency' reads monetary values."
  },
  {
    question: "What audio output formats are available for text-to-speech?",
    options: [
      "Only WAV files",
      "WAV, MP3, OGG Opus, raw PCM, and other compressed formats",
      "Only MP3",
      "Only streaming — no file output"
    ],
    correctAnswer: 1,
    explanation: "TTS supports many formats: uncompressed WAV/PCM, compressed MP3 and OGG Opus at various bitrates and sample rates, configurable via SpeechSynthesisOutputFormat."
  },
  {
    question: "How do you insert a pause in synthesized speech?",
    options: [
      "Add spaces in the text",
      "Use the <break time='500ms'/> SSML element",
      "Use the pause() method between text segments",
      "Add '...' in the text"
    ],
    correctAnswer: 1,
    explanation: "The <break> element inserts silence. Specify duration with time='500ms' or time='1s'. You can also use strength='weak|medium|strong' for relative pauses."
  }
]} />

## Cleanup

```bash
az group delete --name rg-ai102-speech --yes --no-wait
```

## Learn More

- [Text-to-speech overview](https://learn.microsoft.com/azure/ai-services/speech-service/text-to-speech)
- [SSML reference](https://learn.microsoft.com/azure/ai-services/speech-service/speech-synthesis-markup-structure)
- [Voice gallery](https://speech.microsoft.com/portal/voicegallery)
- [Audio output formats](https://learn.microsoft.com/azure/ai-services/speech-service/rest-text-to-speech#audio-outputs)
