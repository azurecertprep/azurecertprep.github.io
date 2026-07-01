---
sidebar_position: 3
title: "Challenge 16: Speech Recognition and Synthesis"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Challenge 16: Speech Recognition and Synthesis

:::info Estimated Time
**20-30 min** | **Cost**: Free | **Domain**: Implement AI with Azure Foundry (55-60%)
:::

## Exam skills covered

- Identify features and uses for speech recognition
- Identify features and uses for speech synthesis
- Identify Azure AI Speech service capabilities

## Overview

**Speech recognition** (speech-to-text) converts spoken audio into written text. This powers applications like meeting transcription, voice assistants, closed captioning, and voice commands. Azure AI Speech supports real-time transcription (processing audio as it streams) and batch transcription (processing pre-recorded audio files). It recognizes natural speech patterns including hesitations, filler words, and different speaking styles.

**Speech synthesis** (text-to-speech) converts written text into natural-sounding spoken audio. Modern neural text-to-speech voices sound remarkably human, with natural intonation, emphasis, and rhythm. Azure AI Speech offers 500+ neural voices across 140+ languages and variants. Use cases include virtual assistants, audiobook narration, accessibility features for visually impaired users, and automated phone systems.

Both capabilities are part of the **Azure AI Speech** service, which also includes speech translation (real-time translation of spoken audio) and speaker recognition (identifying who is speaking). Together, these enable natural voice-based human-computer interaction.

## Explore

### Task 1: Understand speech-to-text capabilities

Speech-to-text converts audio into text. Review the key variations:

| Feature | Description | Use Case |
|---------|-------------|----------|
| Real-time transcription | Converts speech to text as it's spoken | Live captions, voice commands |
| Batch transcription | Processes pre-recorded audio files | Meeting recordings, call center logs |
| Custom Speech | Trains models for specific vocabulary/accents | Medical terminology, product names |
| Conversation transcription | Multi-speaker recognition | Meeting notes with speaker labels |

**Key capabilities**:
- Automatic punctuation and capitalization
- Profanity filtering options
- Word-level timestamps
- Speaker diarization (identifying different speakers)
- Support for 100+ languages and dialects

### Task 2: Explore Azure AI Speech Studio

Navigate to: [speech.microsoft.com](https://speech.microsoft.com/)

1. Browse the **Speech Studio** interface
2. Look at the available demos:
   - **Real-time speech-to-text** — Try speaking or upload audio
   - **Text-to-speech** — Enter text and hear it spoken
   - **Pronunciation assessment** — Evaluate pronunciation quality
3. Under **Text to Speech**, explore:
   - Different voice options (neural voices)
   - Different languages and regional variants
   - Voice styles (cheerful, sad, angry, etc. for some voices)

### Task 3: Understand text-to-speech features

Text-to-speech (TTS) converts text into natural-sounding audio. Review the options:

| Feature | Description |
|---------|-------------|
| Neural voices | AI-generated voices with natural intonation (500+ available) |
| SSML control | Speech Synthesis Markup Language for fine-tuning pronunciation, speed, pitch |
| Voice styles | Emotional variations (cheerful, empathetic, angry) for select voices |
| Custom Neural Voice | Create a unique branded voice from training audio |
| Audio format options | WAV, MP3, OGG and other formats |

**SSML Example** — controlling speech output:
```xml
<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">
  <voice name="en-US-JennyNeural">
    <prosody rate="slow" pitch="low">
      Welcome to Azure AI Speech services.
    </prosody>
  </voice>
</speak>
```

### Task 4: Compare real-time vs batch processing

| Aspect | Real-time | Batch |
|--------|-----------|-------|
| Input | Streaming audio (microphone) | Audio files (WAV, MP3, etc.) |
| Latency | Immediate results | Minutes to hours |
| Best for | Live captioning, voice assistants | Processing recordings, archives |
| Duration | Continuous or short utterances | Up to hundreds of hours |
| Output | Streaming text results | JSON/text files with timestamps |

**Your task**: Consider these scenarios and decide which mode fits:
1. A doctor dictating patient notes during an appointment → **Real-time**
2. A company processing 1,000 recorded customer service calls → **Batch**
3. Adding subtitles to a live webinar → **Real-time**
4. Transcribing a library of podcast episodes → **Batch**

:::tip Azure CLI Alternative
```bash
# Create an Azure AI Speech resource (Free tier)
az cognitiveservices account create \
  --name my-speech-resource \
  --resource-group myResourceGroup \
  --kind SpeechServices \
  --sku F0 \
  --location eastus

# List available speech resource keys
az cognitiveservices account keys list \
  --name my-speech-resource \
  --resource-group myResourceGroup
```
:::

## Key Concepts

| Concept | Definition |
|---------|-----------|
| Speech-to-text (STT) | Converts spoken audio into written text (also called speech recognition) |
| Text-to-speech (TTS) | Converts written text into natural-sounding spoken audio (also called speech synthesis) |
| Neural voice | AI-generated voice that uses deep neural networks for natural-sounding speech |
| SSML | Speech Synthesis Markup Language — XML-based format for controlling speech output |
| Speaker diarization | Identifying and labeling different speakers in an audio recording |
| Custom Speech | Training a speech recognition model on domain-specific vocabulary or acoustic conditions |

## Common Misconceptions

| Misconception | Reality |
|---------------|---------|
| Speech-to-text requires silence/studio conditions | Modern models handle background noise, accents, and natural speech patterns well |
| Text-to-speech always sounds robotic | Neural voices are nearly indistinguishable from human speech in many cases |
| You need a custom model for basic transcription | The pre-built models work well for general speech; custom models are for specialized vocabulary |
| Speech services only work in English | Azure AI Speech supports 100+ languages for STT and 140+ languages for TTS |
| Real-time transcription is always better than batch | Batch is better for large volumes of pre-recorded audio and provides richer metadata |

## Knowledge Check

<KnowledgeCheck
  questions={[
    {
      id: 'ai900-16-q1',
      question: 'A call center wants to transcribe thousands of recorded customer calls to analyze them later. Which speech capability should they use?',
      options: ['Real-time speech-to-text', 'Batch transcription', 'Text-to-speech', 'Speech translation'],
      correctAnswer: 1,
      explanation: 'Batch transcription is designed for processing pre-recorded audio files in bulk. It can handle large volumes of recordings and provides detailed output with timestamps — ideal for analyzing previously recorded calls.'
    },
    {
      id: 'ai900-16-q2',
      question: 'What technology makes modern text-to-speech voices sound natural and human-like?',
      options: ['Deep neural networks (neural voices)', 'Simple concatenation of recorded sounds', 'Rule-based phonetics', 'Text pattern matching'],
      correctAnswer: 0,
      explanation: 'Neural text-to-speech uses deep neural networks to generate speech that sounds natural, with proper intonation, emphasis, and rhythm — unlike older robotic-sounding synthesis methods.'
    },
    {
      id: 'ai900-16-q3',
      question: 'Which feature of speech-to-text identifies different speakers in a conversation?',
      options: ['Language detection', 'Punctuation prediction', 'Speaker diarization', 'Custom Speech'],
      correctAnswer: 2,
      explanation: 'Speaker diarization identifies and labels different speakers in an audio recording, answering "who spoke when." This is essential for meeting transcription where multiple people are talking.'
    },
    {
      id: 'ai900-16-q4',
      question: 'A hospital needs speech recognition that accurately transcribes medical terminology like drug names and procedures. What should they use?',
      options: ['Standard speech-to-text only', 'Custom Speech trained on medical vocabulary', 'Text-to-speech with SSML', 'Language detection'],
      correctAnswer: 1,
      explanation: 'Custom Speech allows you to train a speech recognition model with domain-specific vocabulary. Medical terminology, drug names, and procedures would benefit from a custom model trained on medical audio and text data.'
    },
    {
      id: 'ai900-16-q5',
      question: 'What is SSML used for in Azure AI Speech?',
      options: ['Converting speech to text', 'Detecting the language of spoken audio', 'Training custom speech models', 'Controlling how text-to-speech output sounds (speed, pitch, pauses)'],
      correctAnswer: 3,
      explanation: 'Speech Synthesis Markup Language (SSML) is an XML-based format that lets you control text-to-speech output — adjusting pronunciation, speaking rate, pitch, pauses, and emphasis for more natural-sounding results.'
    }
  ]}
/>

## Learn More

- [What is the Azure AI Speech service?](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/overview)
- [Speech-to-text overview](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/speech-to-text)
- [Text-to-speech overview](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/text-to-speech)
- [Azure AI Speech Studio](https://speech.microsoft.com/)
- [SSML reference](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/speech-synthesis-markup)
