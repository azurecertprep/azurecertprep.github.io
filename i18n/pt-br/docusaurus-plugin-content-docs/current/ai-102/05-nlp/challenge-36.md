---
sidebar_position: 7
title: "Desafio 36: TraduÃ§Ã£o de Fala"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Desafio 36: TraduÃ§Ã£o de Fala

:::info Tempo Estimado
**45 min** | **Custo**: $2-5 (estimado) | **DomÃ­nio**: Implementar SoluÃ§Ãµes de NLP (15-20%)
:::

## Habilidades do exame abordadas
- Traduzir speech-to-text em mÃºltiplos idiomas
- Implementar traduÃ§Ã£o speech-to-speech
- Configurar sessÃµes de traduÃ§Ã£o contÃ­nua

## VisÃ£o Geral

O Azure Speech Translation combina reconhecimento de fala e traduÃ§Ã£o de texto em um Ãºnico pipeline:

```text
Audio Input â†’ Speech Recognition â†’ Translation â†’ Text/Speech Output
```

Principais diferenÃ§as em relaÃ§Ã£o ao uso separado de STT + Translator:
- **Chamada de API Ãºnica** â€” menor latÃªncia
- **Streaming** â€” resultados parciais em tempo real
- **Speech-to-speech** â€” saÃ­da de Ã¡udio traduzido diretamente
- Suporta 70+ idiomas para traduÃ§Ã£o speech-to-text

Classes: `SpeechTranslationConfig`, `TranslationRecognizer`

## PrÃ©-requisitos
- Assinatura do Azure
- Recurso Azure Speech
- Python 3.9+ ou .NET 8
- Pacote: `azure-cognitiveservices-speech` (v1.38+)

## ImplementaÃ§Ã£o

### Tarefa 1: TraduÃ§Ã£o de Fala em Disparo Ãšnico

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

### Tarefa 2: TraduÃ§Ã£o ContÃ­nua de Fala

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

### Tarefa 3: TraduÃ§Ã£o Speech-to-Speech (com sÃ­ntese de voz)

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

## SaÃ­da Esperada

```text
Translating speech...
Recognized (en): The quarterly results exceeded expectations with a fifteen percent increase.

Translations:
  [es] Los resultados trimestrales superaron las expectativas con un aumento del quince por ciento.
  [fr] Les rÃ©sultats trimestriels ont dÃ©passÃ© les attentes avec une augmentation de quinze pour cent.
  [de] Die Quartalsergebnisse Ã¼bertrafen die Erwartungen mit einem Anstieg von fÃ¼nfzehn Prozent.
  [ja] å››åŠæœŸã®çµæžœã¯15ãƒ‘ãƒ¼ã‚»ãƒ³ãƒˆã®å¢—åŠ ã§æœŸå¾…ã‚’ä¸Šå›žã‚Šã¾ã—ãŸã€‚

Starting continuous translation...
  [Partial] The quarterly
  [Partial] The quarterly results

[Final] EN: The quarterly results exceeded expectations.
        ES: Los resultados trimestrales superaron las expectativas.
        FR: Les rÃ©sultats trimestriels ont dÃ©passÃ© les attentes.

Translated 3 segments
```

## Quebra & conserta

| CenÃ¡rio | Sintoma | Causa Raiz | CorreÃ§Ã£o |
|---------|---------|------------|----------|
| Nenhuma traduÃ§Ã£o retornada | DicionÃ¡rio de traduÃ§Ãµes vazio | Idioma de destino nÃ£o adicionado Ã  configuraÃ§Ã£o | Chame `add_target_language()` antes de criar o reconhecedor |
| Idioma de origem errado | Reconhecimento ilegÃ­vel | Idioma de origem incompatÃ­vel | Defina o `speech_recognition_language` correto |
| SÃ­ntese nÃ£o funciona | Sem saÃ­da de Ã¡udio | Nome da voz nÃ£o definido ou idioma incompatÃ­vel | Defina `voice_name` correspondendo ao idioma de destino |
| Resultados parciais ausentes | Sem feedback intermediÃ¡rio | Evento `recognizing` nÃ£o conectado | Conecte ao evento `recognizing` para resultados em streaming |
| Erro de cÃ³digo de idioma | Idioma invÃ¡lido | Usando formato de cÃ³digo errado | Use cÃ³digos BCP-47: "es" nÃ£o "spanish", "zh-Hans" nÃ£o "zh" |

## VerificaÃ§Ã£o de Conhecimento

<KnowledgeCheck questions={[
  {
    question: "Qual classe Ã© usada para traduÃ§Ã£o de fala em vez de SpeechConfig?",
    options: [
      "TranslatorConfig",
      "TranslationSpeechConfig",
      "SpeechConfig com parÃ¢metros de traduÃ§Ã£o",
      "SpeechTranslationConfig"
    ],
    correctAnswer: 3,
    explanation: "SpeechTranslationConfig Ã© a classe de configuraÃ§Ã£o dedicada para traduÃ§Ã£o de fala. Ela estende a configuraÃ§Ã£o de fala com configuraÃ§Ãµes de idioma de destino e voz."
  },
  {
    question: "Como vocÃª especifica mÃºltiplos idiomas de destino para traduÃ§Ã£o de fala?",
    options: [
      "Passe uma lista para o construtor",
      "Chame add_target_language() mÃºltiplas vezes, uma para cada idioma",
      "Defina uma string separada por vÃ­rgulas na propriedade target_languages",
      "Crie mÃºltiplos reconhecedores, um por idioma"
    ],
    correctAnswer: 1,
    explanation: "Chame add_target_language() para cada idioma de saÃ­da desejado. O reconhecedor traduz para todos os idiomas especificados simultaneamente em uma Ãºnica passagem."
  },
  {
    question: "Qual Ã© a diferenÃ§a entre os eventos 'recognizing' e 'recognized'?",
    options: [
      "'recognizing' fornece resultados parciais/intermediÃ¡rios durante a fala; 'recognized' fornece resultados finais apÃ³s a elocuÃ§Ã£o ser completada",
      "SÃ£o o mesmo evento com nomes diferentes",
      "'recognizing' Ã© para a primeira elocuÃ§Ã£o; 'recognized' Ã© para as subsequentes",
      "'recognizing' Ã© para traduÃ§Ã£o; 'recognized' Ã© apenas para o texto de origem"
    ],
    correctAnswer: 0,
    explanation: "'recognizing' dispara com resultados intermediÃ¡rios (parciais) enquanto a fala estÃ¡ sendo processada â€” Ãºtil para legendas ao vivo. 'recognized' dispara com o resultado final e completo para cada elocuÃ§Ã£o."
  },
  {
    question: "Como vocÃª habilita a traduÃ§Ã£o speech-to-speech (saÃ­da sintetizada)?",
    options: [
      "Use um SpeechSynthesizer separado apÃ³s a traduÃ§Ã£o",
      "Habilite um flag 'synthesize' na configuraÃ§Ã£o",
      "Defina a propriedade voice_name no SpeechTranslationConfig e trate o evento synthesizing",
      "Chame synthesize_translation() apÃ³s o reconhecimento"
    ],
    correctAnswer: 2,
    explanation: "Defina voice_name na configuraÃ§Ã£o para uma voz correspondente ao idioma de destino. O reconhecedor entÃ£o emite eventos synthesizing com dados de Ã¡udio da fala traduzida."
  },
  {
    question: "Qual vantagem a traduÃ§Ã£o de fala tem sobre o uso separado de STT + Translator API?",
    options: [
      "Suporta mais idiomas",
      "Ã‰ mais barato por caractere",
      "Melhor precisÃ£o de traduÃ§Ã£o",
      "Menor latÃªncia com resultados parciais em streaming em um Ãºnico pipeline"
    ],
    correctAnswer: 3,
    explanation: "A traduÃ§Ã£o de fala combina reconhecimento e traduÃ§Ã£o em um pipeline de streaming Ãºnico, fornecendo menor latÃªncia e resultados parciais em tempo real â€” crÃ­tico para cenÃ¡rios de traduÃ§Ã£o ao vivo."
  }
]} />

## Limpeza

```bash
az group delete --name rg-ai102-speech --yes --no-wait
```

## Saiba Mais

- [VisÃ£o geral da traduÃ§Ã£o de fala](https://learn.microsoft.com/azure/ai-services/speech-service/speech-translation)
- [ReferÃªncia do TranslationRecognizer](https://learn.microsoft.com/python/api/azure-cognitiveservices-speech/azure.cognitiveservices.speech.translation)
- [Idiomas suportados para traduÃ§Ã£o](https://learn.microsoft.com/azure/ai-services/speech-service/language-support#speech-translation)
