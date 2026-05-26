---
sidebar_position: 5
title: "Desafio 34: Speech-to-Text"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Desafio 34: Speech-to-Text

:::info Tempo Estimado
**50 min** | **Custo**: $2-5 (estimado) | **Domínio**: Implementar Soluções de NLP (15-20%)
:::

## Habilidades do exame abordadas
- Implementar transcrição speech-to-text
- Configurar transcrição em tempo real e em lote
- Implementar modelos de fala personalizados para vocabulário específico de domínio

## Visão Geral

O serviço Azure Speech fornece capacidades de speech-to-text (STT):

| Modo | Descrição | Caso de Uso |
|------|-----------|-------------|
| **Tempo real** | Reconhecimento contínuo de microfone/stream | Legendas ao vivo, comandos de voz |
| **Lote** | Transcrição assíncrona de arquivos de áudio | Gravações de reuniões, call centers |
| **Custom Speech** | Modelos treinados com seu vocabulário | Domínios médico, jurídico, técnico |

Classes principais: `SpeechConfig`, `SpeechRecognizer`, `AudioConfig`

## Pré-requisitos
- Assinatura do Azure
- Recurso Azure Speech
- Python 3.9+ ou .NET 8
- Pacote: `azure-cognitiveservices-speech` (v1.38+)
- Microfone (para tempo real) ou arquivo de áudio (.wav)

## Implementação

### Tarefa 1: Criar Recurso de Speech

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

### Tarefa 2: Reconhecimento de Fala em Tempo Real

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

### Tarefa 3: Reconhecimento Contínuo (Transcrição Completa de Reunião)

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

### Tarefa 4: API de Transcrição em Lote

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

## Saída Esperada

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

## Quebra & conserta

| Cenário | Sintoma | Causa Raiz | Correção |
|---------|---------|------------|----------|
| Resultado `NoMatch` | Nenhuma fala reconhecida | Áudio é silêncio, formato errado ou idioma errado | Verifique formato WAV (16kHz, 16-bit, mono PCM); verifique configuração de idioma |
| `Canceled` com erro de autenticação | 401 Unauthorized | Chave ou região errada | Verifique se a chave corresponde à região; verifique se o recurso está ativo |
| Reconhecimento truncado | Apenas primeira sentença | Usou `recognize_once` em vez de contínuo | Use `start_continuous_recognition` para áudio longo |
| Palavras faltando | Transcrição incompleta | Vocabulário específico de domínio | Treine modelo Custom Speech com sua terminologia |
| Alta latência | Resultados lentos | Rede ou chunks grandes de áudio | Use streaming/push de áudio; verifique conectividade de rede |

## Verificação de Conhecimento

<KnowledgeCheck questions={[
  {
    question: "Qual é a diferença entre recognize_once e reconhecimento contínuo?",
    options: [
      "recognize_once é mais rápido; contínuo é mais preciso",
      "recognize_once processa uma única elocução e para; reconhecimento contínuo processa até ser explicitamente parado",
      "recognize_once funciona offline; contínuo requer internet",
      "Produzem resultados idênticos mas com APIs diferentes"
    ],
    correctAnswer: 1,
    explanation: "recognize_once escuta uma única elocução (até o silêncio) e retorna. O reconhecimento contínuo processa todo o fluxo de áudio, disparando eventos 'recognized' para cada elocução até ser parado."
  },
  {
    question: "Qual formato de áudio o Speech SDK espera para entrada de arquivo?",
    options: [
      "Qualquer formato de áudio — converte automaticamente",
      "Apenas MP3",
      "WAV com codificação PCM (padrão: 16kHz, 16-bit, mono)",
      "FLAC ou OGG Vorbis"
    ],
    correctAnswer: 2,
    explanation: "O SDK espera arquivos WAV com codificação PCM. O formato padrão esperado é 16kHz de taxa de amostragem, 16-bit de profundidade, canal mono. Outros formatos podem precisar de configuração explícita de AudioStreamFormat."
  },
  {
    question: "Quando você deve usar transcrição em lote em vez de reconhecimento em tempo real?",
    options: [
      "Quando você precisa de resultados em menos de 1 segundo",
      "Lote é sempre preferível ao tempo real",
      "Quando você precisa de diarização de falantes",
      "Quando transcrever arquivos de áudio pré-gravados de forma assíncrona, especialmente gravações longas ou múltiplos arquivos"
    ],
    correctAnswer: 3,
    explanation: "A transcrição em lote é para arquivos pré-gravados processados de forma assíncrona via REST API. É ideal para gravações longas, múltiplos arquivos e quando resultados em tempo real não são necessários."
  },
  {
    question: "O que a diarização fornece no speech-to-text?",
    options: [
      "Identificação de qual falante disse o quê (separação de falantes)",
      "Tradução para outro idioma",
      "Correção de pontuação",
      "Redução de ruído"
    ],
    correctAnswer: 0,
    explanation: "A diarização separa a fala por falante, identificando 'quem disse o quê'. Ela rotula segmentos da transcrição com IDs de falantes, útil para reuniões com múltiplos participantes."
  },
  {
    question: "Como você lida com CancellationReason.Error no reconhecimento de fala?",
    options: [
      "Ignore — é apenas informativo",
      "Reinicie o reconhecedor automaticamente",
      "Verifique cancellation_details.error_details para o erro específico (autenticação, rede, problema de formato) e corrija adequadamente",
      "Mude para um idioma diferente"
    ],
    correctAnswer: 2,
    explanation: "CancellationReason.Error indica uma falha real. Verifique error_details para detalhes — causas comuns são credenciais inválidas, problemas de rede ou formato de áudio não suportado."
  }
]} />

## Limpeza

```bash
az group delete --name rg-ai102-speech --yes --no-wait
```

## Saiba Mais

- [Visão geral do Speech-to-text](https://learn.microsoft.com/azure/ai-services/speech-service/speech-to-text)
- [Início rápido do Speech SDK](https://learn.microsoft.com/azure/ai-services/speech-service/get-started-speech-to-text)
- [Transcrição em lote](https://learn.microsoft.com/azure/ai-services/speech-service/batch-transcription)
- [Custom Speech](https://learn.microsoft.com/azure/ai-services/speech-service/custom-speech-overview)
