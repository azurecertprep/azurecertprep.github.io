---
sidebar_position: 6
title: "Desafio 35: Text-to-Speech e SSML"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Desafio 35: Text-to-Speech e SSML

:::info Tempo Estimado
**45 min** | **Custo**: $2-5 (estimado) | **Domínio**: Implementar Soluções de NLP (15-20%)
:::

## Habilidades do exame abordadas
- Implementar síntese de text-to-speech
- Melhorar a saída de fala com SSML (Speech Synthesis Markup Language)
- Configurar seleção de voz e formatos de saída de áudio

## Visão Geral

O Azure Text-to-Speech (TTS) converte texto em áudio com som natural:

| Recurso | Descrição |
|---------|-----------|
| **Vozes neurais** | Vozes geradas por IA (400+ em 140 idiomas) |
| **SSML** | Marcação XML para controlar prosódia, ênfase, pausas |
| **Formatos de áudio** | WAV, MP3, OGG, PCM raw |
| **Viseme** | Dados de posição da boca para animação de avatar |
| **Custom Neural Voice** | Treine uma voz única (requer aprovação) |

Elementos SSML: `<speak>`, `<voice>`, `<prosody>`, `<emphasis>`, `<break>`, `<say-as>`, `<phoneme>`

## Pré-requisitos
- Assinatura do Azure
- Recurso Azure Speech
- Python 3.9+ ou .NET 8
- Pacote: `azure-cognitiveservices-speech` (v1.38+)
- Dispositivo de saída de áudio (alto-falante) ou saída em arquivo

## Implementação

### Tarefa 1: Text-to-Speech Básico

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

using var audioConfig = AudioConfig.FromWavFileOutput("output.wav");
using var synthesizer = new SpeechSynthesizer(speechConfig, audioConfig);

var result = await synthesizer.SpeakTextAsync("Welcome to Azure AI text-to-speech.");

if (result.Reason == ResultReason.SynthesizingAudioCompleted)
    Console.WriteLine($"Audio synthesized: {result.AudioData.Length} bytes");
```

</TabItem>
</Tabs>

### Tarefa 2: SSML para Controle Avançado de Fala

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

### Tarefa 3: Listar Vozes Disponíveis

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

## Saída Esperada

```text
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

## Quebra & conserta

| Cenário | Sintoma | Causa Raiz | Correção |
|---------|---------|------------|----------|
| Sem saída de áudio | 0 bytes gerados | Nome de voz inválido | Use o `short_name` exato da lista de vozes |
| Erro de parse SSML | Síntese cancelada | XML malformado | Valide a estrutura SSML; verifique URIs de namespace |
| Voz não encontrada | Erro de cancelamento | Voz não disponível na região | Verifique disponibilidade da voz por região |
| Qualidade de áudio ruim | Som robótico | Usando vozes standard antigas | Mude para vozes Neural (sufixo `*Neural`) |
| Arquivo muito grande | Bytes de áudio excessivos | Formato de saída errado | Use formato comprimido (MP3/OGG) em vez de PCM raw |

## Verificação de Conhecimento

<KnowledgeCheck questions={[
  {
    question: "Qual é o propósito do elemento SSML <prosody>?",
    options: [
      "Selecionar qual voz usar",
      "Inserir silêncio entre palavras",
      "Controlar velocidade, tom e volume da saída de fala",
      "Especificar o formato de saída de áudio"
    ],
    correctAnswer: 2,
    explanation: "O elemento <prosody> controla características da fala: rate (velocidade), pitch (tom) e volume. Os atributos aceitam porcentagens ou valores predefinidos."
  },
  {
    question: "Qual método você usa para sintetizar fala a partir de SSML?",
    options: [
      "speak_ssml_async(ssml)",
      "speak_text_async(ssml)",
      "synthesize(ssml, format='ssml')",
      "speak_async(ssml, mode='ssml')"
    ],
    correctAnswer: 0,
    explanation: "Use speak_ssml_async() para entrada SSML e speak_text_async() para texto puro. O método SSML analisa a marcação XML para controle de voz."
  },
  {
    question: "O que o elemento SSML <say-as> faz?",
    options: [
      "Define um alias para uma palavra",
      "Controla como tipos específicos de conteúdo são pronunciados (datas, números, caracteres, moeda)",
      "Adiciona ênfase a uma palavra",
      "Muda a voz no meio da sentença"
    ],
    correctAnswer: 1,
    explanation: "<say-as> controla a pronúncia de conteúdo estruturado. interpret-as='date' lê datas corretamente, 'characters' soletra letras, 'currency' lê valores monetários."
  },
  {
    question: "Quais formatos de saída de áudio estão disponíveis para text-to-speech?",
    options: [
      "Apenas arquivos WAV",
      "Apenas MP3",
      "Apenas streaming — sem saída em arquivo",
      "WAV, MP3, OGG Opus, PCM raw e outros formatos comprimidos"
    ],
    correctAnswer: 3,
    explanation: "TTS suporta muitos formatos: WAV/PCM não comprimido, MP3 e OGG Opus comprimidos em várias taxas de bits e taxas de amostragem, configuráveis via SpeechSynthesisOutputFormat."
  },
  {
    question: "Como você insere uma pausa na fala sintetizada?",
    options: [
      "Adicione espaços no texto",
      "Use o método pause() entre segmentos de texto",
      "Use o elemento SSML <break time='500ms'/>",
      "Adicione '...' no texto"
    ],
    correctAnswer: 2,
    explanation: "O elemento <break> insere silêncio. Especifique a duração com time='500ms' ou time='1s'. Você também pode usar strength='weak|medium|strong' para pausas relativas."
  }
]} />

## Limpeza

```bash
az group delete --name rg-ai102-speech --yes --no-wait
```

## Saiba Mais

- [Visão geral do Text-to-speech](https://learn.microsoft.com/azure/ai-services/speech-service/text-to-speech)
- [Referência do SSML](https://learn.microsoft.com/azure/ai-services/speech-service/speech-synthesis-markup-structure)
- [Galeria de vozes](https://speech.microsoft.com/portal/voicegallery)
- [Formatos de saída de áudio](https://learn.microsoft.com/azure/ai-services/speech-service/rest-text-to-speech#audio-outputs)
