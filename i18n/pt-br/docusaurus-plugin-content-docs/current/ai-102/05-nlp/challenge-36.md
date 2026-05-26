---
sidebar_position: 7
title: "Desafio 36: Tradução de Fala"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Desafio 36: Tradução de Fala

:::info Tempo Estimado
**45 min** | **Custo**: $2-5 (estimado) | **Domínio**: Implementar Soluções de NLP (15-20%)
:::

## Habilidades do exame abordadas
- Traduzir speech-to-text em múltiplos idiomas
- Implementar tradução speech-to-speech
- Configurar sessões de tradução contínua

## Visão Geral

O Azure Speech Translation combina reconhecimento de fala e tradução de texto em um único pipeline:

```text
Audio Input → Speech Recognition → Translation → Text/Speech Output
```

Principais diferenças em relação ao uso separado de STT + Translator:
- **Chamada de API única** — menor latência
- **Streaming** — resultados parciais em tempo real
- **Speech-to-speech** — saída de áudio traduzido diretamente
- Suporta 70+ idiomas para tradução speech-to-text

Classes: `SpeechTranslationConfig`, `TranslationRecognizer`

## Pré-requisitos
- Assinatura do Azure
- Recurso Azure Speech
- Python 3.9+ ou .NET 8
- Pacote: `azure-cognitiveservices-speech` (v1.38+)

## Implementação

### Tarefa 1: Tradução de Fala em Disparo Único

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

### Tarefa 2: Tradução Contínua de Fala

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

### Tarefa 3: Tradução Speech-to-Speech (com síntese de voz)

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

## Saída Esperada

```text
Translating speech...
Recognized (en): The quarterly results exceeded expectations with a fifteen percent increase.

Translations:
  [es] Los resultados trimestrales superaron las expectativas con un aumento del quince por ciento.
  [fr] Les résultats trimestriels ont dépassé les attentes avec une augmentation de quinze pour cent.
  [de] Die Quartalsergebnisse übertrafen die Erwartungen mit einem Anstieg von fünfzehn Prozent.
  [ja] 四半期の結果は15パーセントの増加で期待を上回りました。

Starting continuous translation...
  [Partial] The quarterly
  [Partial] The quarterly results

[Final] EN: The quarterly results exceeded expectations.
        ES: Los resultados trimestrales superaron las expectativas.
        FR: Les résultats trimestriels ont dépassé les attentes.

Translated 3 segments
```

## Quebra & conserta

| Cenário | Sintoma | Causa Raiz | Correção |
|---------|---------|------------|----------|
| Nenhuma tradução retornada | Dicionário de traduções vazio | Idioma de destino não adicionado à configuração | Chame `add_target_language()` antes de criar o reconhecedor |
| Idioma de origem errado | Reconhecimento ilegível | Idioma de origem incompatível | Defina o `speech_recognition_language` correto |
| Síntese não funciona | Sem saída de áudio | Nome da voz não definido ou idioma incompatível | Defina `voice_name` correspondendo ao idioma de destino |
| Resultados parciais ausentes | Sem feedback intermediário | Evento `recognizing` não conectado | Conecte ao evento `recognizing` para resultados em streaming |
| Erro de código de idioma | Idioma inválido | Usando formato de código errado | Use códigos BCP-47: "es" não "spanish", "zh-Hans" não "zh" |

## Verificação de Conhecimento

<KnowledgeCheck questions={[
  {
    question: "Qual classe é usada para tradução de fala em vez de SpeechConfig?",
    options: [
      "TranslatorConfig",
      "TranslationSpeechConfig",
      "SpeechConfig com parâmetros de tradução",
      "SpeechTranslationConfig"
    ],
    correctAnswer: 3,
    explanation: "SpeechTranslationConfig é a classe de configuração dedicada para tradução de fala. Ela estende a configuração de fala com configurações de idioma de destino e voz."
  },
  {
    question: "Como você especifica múltiplos idiomas de destino para tradução de fala?",
    options: [
      "Passe uma lista para o construtor",
      "Chame add_target_language() múltiplas vezes, uma para cada idioma",
      "Defina uma string separada por vírgulas na propriedade target_languages",
      "Crie múltiplos reconhecedores, um por idioma"
    ],
    correctAnswer: 1,
    explanation: "Chame add_target_language() para cada idioma de saída desejado. O reconhecedor traduz para todos os idiomas especificados simultaneamente em uma única passagem."
  },
  {
    question: "Qual é a diferença entre os eventos 'recognizing' e 'recognized'?",
    options: [
      "'recognizing' fornece resultados parciais/intermediários durante a fala; 'recognized' fornece resultados finais após a elocução ser completada",
      "São o mesmo evento com nomes diferentes",
      "'recognizing' é para a primeira elocução; 'recognized' é para as subsequentes",
      "'recognizing' é para tradução; 'recognized' é apenas para o texto de origem"
    ],
    correctAnswer: 0,
    explanation: "'recognizing' dispara com resultados intermediários (parciais) enquanto a fala está sendo processada — útil para legendas ao vivo. 'recognized' dispara com o resultado final e completo para cada elocução."
  },
  {
    question: "Como você habilita a tradução speech-to-speech (saída sintetizada)?",
    options: [
      "Use um SpeechSynthesizer separado após a tradução",
      "Habilite um flag 'synthesize' na configuração",
      "Defina a propriedade voice_name no SpeechTranslationConfig e trate o evento synthesizing",
      "Chame synthesize_translation() após o reconhecimento"
    ],
    correctAnswer: 2,
    explanation: "Defina voice_name na configuração para uma voz correspondente ao idioma de destino. O reconhecedor então emite eventos synthesizing com dados de áudio da fala traduzida."
  },
  {
    question: "Qual vantagem a tradução de fala tem sobre o uso separado de STT + Translator API?",
    options: [
      "Suporta mais idiomas",
      "É mais barato por caractere",
      "Melhor precisão de tradução",
      "Menor latência com resultados parciais em streaming em um único pipeline"
    ],
    correctAnswer: 3,
    explanation: "A tradução de fala combina reconhecimento e tradução em um pipeline de streaming único, fornecendo menor latência e resultados parciais em tempo real — crítico para cenários de tradução ao vivo."
  }
]} />

## Limpeza

```bash
az group delete --name rg-ai102-speech --yes --no-wait
```

## Saiba Mais

- [Visão geral da tradução de fala](https://learn.microsoft.com/azure/ai-services/speech-service/speech-translation)
- [Referência do TranslationRecognizer](https://learn.microsoft.com/python/api/azure-cognitiveservices-speech/azure.cognitiveservices.speech.translation)
- [Idiomas suportados para tradução](https://learn.microsoft.com/azure/ai-services/speech-service/language-support#speech-translation)
