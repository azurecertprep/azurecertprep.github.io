---
sidebar_position: 7
title: "Challenge 36: Speech Translation"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Challenge 36: Speech Translation

:::info Estimated Time
**45 min** | **Cost**: $2-5 (estimated) | **Domain**: Implement NLP Solutions (15-20%)
:::

## Exam skills covered
- Translate speech-to-text in multiple languages
- Implement speech-to-speech translation
- Configure continuous translation sessions

## Overview

Azure Speech Translation combines speech recognition and text translation in a single pipeline:

```text
Audio Input → Speech Recognition → Translation → Text/Speech Output
```

Key differences from separate STT + Translator:
- **Single API call** — lower latency
- **Streaming** — real-time partial results
- **Speech-to-speech** — direct translated audio output
- Supports 70+ languages for speech-to-text translation

Classes: `SpeechTranslationConfig`, `TranslationRecognizer`

## Prerequisites
- Azure subscription
- Azure Speech resource
- Python 3.9+ or .NET 8
- Package: `azure-cognitiveservices-speech` (v1.38+)

## Implementation

### Task 1: Single-Shot Speech Translation

<Tabs>
<TabItem value="python" label="Python SDK">

```python
import os
import azure.cognitiveservices.speech as speechsdk

# Configure translation
translation_config = speechsdk.translation.SpeechTranslationConfig(
    subscription=os.environ["AZURE_SPEECH_KEY"],
    region=os.environ["AZURE_SPEECH_REGION"]
)

# Set source language (speech input)
translation_config.speech_recognition_language = "en-US"

# Add target languages (text output)
translation_config.add_target_language("es")
translation_config.add_target_language("fr")
translation_config.add_target_language("de")
translation_config.add_target_language("ja")

# Configure audio input from file
audio_config = speechsdk.audio.AudioConfig(filename="english-speech.wav")
recognizer = speechsdk.translation.TranslationRecognizer(
    translation_config=translation_config,
    audio_config=audio_config
)

# Single utterance translation
print("Translating speech...")
result = recognizer.recognize_once()

if result.reason == speechsdk.ResultReason.TranslatedSpeech:
    print(f"Recognized (en): {result.text}")
    print(f"\nTranslations:")
    for lang, translation in result.translations.items():
        print(f"  [{lang}] {translation}")
elif result.reason == speechsdk.ResultReason.NoMatch:
    print("No speech recognized")
elif result.reason == speechsdk.ResultReason.Canceled:
    cancellation = result.cancellation_details
    print(f"Canceled: {cancellation.reason} - {cancellation.error_details}")
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
using Microsoft.CognitiveServices.Speech;
using Microsoft.CognitiveServices.Speech.Translation;

var translationConfig = SpeechTranslationConfig.FromSubscription(
    Environment.GetEnvironmentVariable("AZURE_SPEECH_KEY"),
    Environment.GetEnvironmentVariable("AZURE_SPEECH_REGION"));

translationConfig.SpeechRecognitionLanguage = "en-US";
translationConfig.AddTargetLanguage("es");
translationConfig.AddTargetLanguage("fr");
translationConfig.AddTargetLanguage("de");

using var audioConfig = AudioConfig.FromWavFileInput("english-speech.wav");
using var recognizer = new TranslationRecognizer(translationConfig, audioConfig);

var result = await recognizer.RecognizeOnceAsync();

if (result.Reason == ResultReason.TranslatedSpeech)
{
    Console.WriteLine($"Recognized: {result.Text}");
    foreach (var (lang, text) in result.Translations)
        Console.WriteLine($"  [{lang}] {text}");
}
```

</TabItem>
</Tabs>

### Task 2: Continuous Speech Translation

<Tabs>
<TabItem value="python" label="Python SDK">

```python
import threading

translation_config = speechsdk.translation.SpeechTranslationConfig(
    subscription=os.environ["AZURE_SPEECH_KEY"],
    region=os.environ["AZURE_SPEECH_REGION"]
)
translation_config.speech_recognition_language = "en-US"
translation_config.add_target_language("es")
translation_config.add_target_language("fr")

audio_config = speechsdk.audio.AudioConfig(filename="conversation.wav")
recognizer = speechsdk.translation.TranslationRecognizer(
    translation_config=translation_config,
    audio_config=audio_config
)

translations_log = []
done = threading.Event()

def recognizing_handler(evt):
    """Partial/interim results (streaming)"""
    print(f"  [Partial] {evt.result.text}")

def recognized_handler(evt):
    """Final results"""
    if evt.result.reason == speechsdk.ResultReason.TranslatedSpeech:
        print(f"\n[Final] EN: {evt.result.text}")
        for lang, text in evt.result.translations.items():
            print(f"        {lang.upper()}: {text}")
        translations_log.append({
            "source": evt.result.text,
            "translations": dict(evt.result.translations)
        })

def canceled_handler(evt):
    print(f"Canceled: {evt.cancellation_details.reason}")
    done.set()

def stopped_handler(evt):
    done.set()

# Wire up events
recognizer.recognizing.connect(recognizing_handler)
recognizer.recognized.connect(recognized_handler)
recognizer.canceled.connect(canceled_handler)
recognizer.session_stopped.connect(stopped_handler)

# Start continuous translation
print("Starting continuous translation...\n")
recognizer.start_continuous_recognition()
done.wait()
recognizer.stop_continuous_recognition()

print(f"\n{'='*50}")
print(f"Translated {len(translations_log)} segments")
```

</TabItem>
</Tabs>

### Task 3: Speech-to-Speech Translation (with voice synthesis)

<Tabs>
<TabItem value="python" label="Python SDK">

```python
# Configure speech-to-speech: translate and synthesize output
translation_config = speechsdk.translation.SpeechTranslationConfig(
    subscription=os.environ["AZURE_SPEECH_KEY"],
    region=os.environ["AZURE_SPEECH_REGION"]
)
translation_config.speech_recognition_language = "en-US"
translation_config.add_target_language("es")

# Set voice for synthesized translation output
translation_config.voice_name = "es-ES-ElviraNeural"

audio_config = speechsdk.audio.AudioConfig(filename="english-speech.wav")
recognizer = speechsdk.translation.TranslationRecognizer(
    translation_config=translation_config,
    audio_config=audio_config
)

# Handle synthesized audio
def synthesis_handler(evt):
    """Handle translated speech audio output"""
    if evt.result.reason == speechsdk.ResultReason.SynthesizingAudio:
        audio_data = evt.result.audio
        print(f"  Synthesized audio: {len(audio_data)} bytes")
        # Save to file
        with open("translated-speech-es.wav", "ab") as f:
            f.write(audio_data)

recognizer.synthesizing.connect(synthesis_handler)

# Translate and synthesize
result = recognizer.recognize_once()

if result.reason == speechsdk.ResultReason.TranslatedSpeech:
    print(f"Source (EN): {result.text}")
    print(f"Target (ES): {result.translations['es']}")
    print(f"Audio output saved to: translated-speech-es.wav")
```

</TabItem>
</Tabs>

## Expected Output

```text
Translating speech...
Recognized (en): The quarterly results exceeded expectations with a fifteen percent increase.

Translations:
  [es] Los resultados trimestrales superaron las expectativas con un aumento del quince por ciento.
  [fr] Les résultats trimestriels ont dépassé les attentes avec une augmentation de quinze pour cent.
  [de] Die Quartalsergebnisse Ã¼bertrafen die Erwartungen mit einem Anstieg von fÃ¼nfzehn Prozent.
  [ja] 四半期の結果は15パーセントの増加で期待を上回りました。

Starting continuous translation...
  [Partial] The quarterly
  [Partial] The quarterly results

[Final] EN: The quarterly results exceeded expectations.
        ES: Los resultados trimestrales superaron las expectativas.
        FR: Les résultats trimestriels ont dépassé les attentes.

Translated 3 segments
```

## Break & fix

| Scenario | Symptom | Root Cause | Fix |
|----------|---------|------------|-----|
| No translations returned | Empty translations dict | Target language not added to config | Call `add_target_language()` before creating recognizer |
| Wrong source language | Garbled recognition | Source language mismatch | Set correct `speech_recognition_language` |
| Synthesis not working | No audio output | Voice name not set or mismatched language | Set `voice_name` matching target language |
| Partial results missing | No interim feedback | `recognizing` event not connected | Connect to `recognizing` event for streaming results |
| Language code error | Invalid language | Using wrong code format | Use BCP-47 codes: "es" not "spanish", "zh-Hans" not "zh" |

## Knowledge Check

<KnowledgeCheck questions={[
  {
    question: "What class is used for speech translation instead of SpeechConfig?",
    options: [
      "TranslatorConfig",
      "TranslationSpeechConfig",
      "SpeechConfig with translation parameters",
      "SpeechTranslationConfig"
    ],
    correctAnswer: 3,
    explanation: "SpeechTranslationConfig is the dedicated configuration class for speech translation. It extends speech configuration with target language and voice settings."
  },
  {
    question: "How do you specify multiple target languages for speech translation?",
    options: [
      "Pass a list to the constructor",
      "Call add_target_language() multiple times, once for each language",
      "Set a comma-separated string in target_languages property",
      "Create multiple recognizers, one per language"
    ],
    correctAnswer: 1,
    explanation: "Call add_target_language() for each desired output language. The recognizer translates to all specified languages simultaneously in one pass."
  },
  {
    question: "What is the difference between the 'recognizing' and 'recognized' events?",
    options: [
      "'recognizing' provides partial/interim results during speech; 'recognized' provides final results after an utterance completes",
      "They are the same event with different names",
      "'recognizing' is for the first utterance; 'recognized' is for subsequent ones",
      "'recognizing' is for translation; 'recognized' is for the source text only"
    ],
    correctAnswer: 0,
    explanation: "'recognizing' fires with interim (partial) results as speech is being processed — useful for live captions. 'recognized' fires with the final, complete result for each utterance."
  },
  {
    question: "How do you enable speech-to-speech translation (synthesized output)?",
    options: [
      "Use a separate SpeechSynthesizer after translation",
      "Enable a 'synthesize' flag in the config",
      "Set the voice_name property on SpeechTranslationConfig and handle the synthesizing event",
      "Call synthesize_translation() after recognition"
    ],
    correctAnswer: 2,
    explanation: "Set voice_name on the config to a voice matching the target language. The recognizer then emits synthesizing events with audio data for the translated speech."
  },
  {
    question: "What advantage does speech translation have over separate STT + Translator API?",
    options: [
      "It supports more languages",
      "It's cheaper per character",
      "Better translation accuracy",
      "Lower latency with streaming partial results in a single pipeline"
    ],
    correctAnswer: 3,
    explanation: "Speech translation combines recognition and translation in one streaming pipeline, providing lower latency and real-time partial results — critical for live translation scenarios."
  }
]} />

## Cleanup

```bash
az group delete --name rg-ai102-speech --yes --no-wait
```

## Learn More

- [Speech translation overview](https://learn.microsoft.com/azure/ai-services/speech-service/speech-translation)
- [TranslationRecognizer reference](https://learn.microsoft.com/python/api/azure-cognitiveservices-speech/azure.cognitiveservices.speech.translation)
- [Supported languages for translation](https://learn.microsoft.com/azure/ai-services/speech-service/language-support#speech-translation)
