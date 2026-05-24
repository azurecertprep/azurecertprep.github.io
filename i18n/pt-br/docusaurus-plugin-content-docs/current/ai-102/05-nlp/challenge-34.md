---
sidebar_position: 5
title: "Desafio 34: Speech-to-Text"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Desafio 34: Speech-to-Text

:::info Tempo Estimado
**50 min** | **Custo**: $2-5 (estimado) | **DomÃ­nio**: Implementar SoluÃ§Ãµes de NLP (15-20%)
:::

## Habilidades do exame abordadas
- Implementar transcriÃ§Ã£o speech-to-text
- Configurar transcriÃ§Ã£o em tempo real e em lote
- Implementar modelos de fala personalizados para vocabulÃ¡rio especÃ­fico de domÃ­nio

## VisÃ£o Geral

O serviÃ§o Azure Speech fornece capacidades de speech-to-text (STT):

| Modo | DescriÃ§Ã£o | Caso de Uso |
|------|-----------|-------------|
| **Tempo real** | Reconhecimento contÃ­nuo de microfone/stream | Legendas ao vivo, comandos de voz |
| **Lote** | TranscriÃ§Ã£o assÃ­ncrona de arquivos de Ã¡udio | GravaÃ§Ãµes de reuniÃµes, call centers |
| **Custom Speech** | Modelos treinados com seu vocabulÃ¡rio | DomÃ­nios mÃ©dico, jurÃ­dico, tÃ©cnico |

Classes principais: `SpeechConfig`, `SpeechRecognizer`, `AudioConfig`

## PrÃ©-requisitos
- Assinatura do Azure
- Recurso Azure Speech
- Python 3.9+ ou .NET 8
- Pacote: `azure-cognitiveservices-speech` (v1.38+)
- Microfone (para tempo real) ou arquivo de Ã¡udio (.wav)

## ImplementaÃ§Ã£o

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

### Tarefa 3: Reconhecimento ContÃ­nuo (TranscriÃ§Ã£o Completa de ReuniÃ£o)

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

### Tarefa 4: API de TranscriÃ§Ã£o em Lote

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

## SaÃ­da Esperada

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

| CenÃ¡rio | Sintoma | Causa Raiz | CorreÃ§Ã£o |
|---------|---------|------------|----------|
| Resultado `NoMatch` | Nenhuma fala reconhecida | Ãudio Ã© silÃªncio, formato errado ou idioma errado | Verifique formato WAV (16kHz, 16-bit, mono PCM); verifique configuraÃ§Ã£o de idioma |
| `Canceled` com erro de autenticaÃ§Ã£o | 401 Unauthorized | Chave ou regiÃ£o errada | Verifique se a chave corresponde Ã  regiÃ£o; verifique se o recurso estÃ¡ ativo |
| Reconhecimento truncado | Apenas primeira sentenÃ§a | Usou `recognize_once` em vez de contÃ­nuo | Use `start_continuous_recognition` para Ã¡udio longo |
| Palavras faltando | TranscriÃ§Ã£o incompleta | VocabulÃ¡rio especÃ­fico de domÃ­nio | Treine modelo Custom Speech com sua terminologia |
| Alta latÃªncia | Resultados lentos | Rede ou chunks grandes de Ã¡udio | Use streaming/push de Ã¡udio; verifique conectividade de rede |

## VerificaÃ§Ã£o de Conhecimento

<KnowledgeCheck questions={[
  {
    question: "Qual Ã© a diferenÃ§a entre recognize_once e reconhecimento contÃ­nuo?",
    options: [
      "recognize_once Ã© mais rÃ¡pido; contÃ­nuo Ã© mais preciso",
      "recognize_once processa uma Ãºnica elocuÃ§Ã£o e para; reconhecimento contÃ­nuo processa atÃ© ser explicitamente parado",
      "recognize_once funciona offline; contÃ­nuo requer internet",
      "Produzem resultados idÃªnticos mas com APIs diferentes"
    ],
    correctAnswer: 1,
    explanation: "recognize_once escuta uma Ãºnica elocuÃ§Ã£o (atÃ© o silÃªncio) e retorna. O reconhecimento contÃ­nuo processa todo o fluxo de Ã¡udio, disparando eventos 'recognized' para cada elocuÃ§Ã£o atÃ© ser parado."
  },
  {
    question: "Qual formato de Ã¡udio o Speech SDK espera para entrada de arquivo?",
    options: [
      "Qualquer formato de Ã¡udio â€” converte automaticamente",
      "Apenas MP3",
      "WAV com codificaÃ§Ã£o PCM (padrÃ£o: 16kHz, 16-bit, mono)",
      "FLAC ou OGG Vorbis"
    ],
    correctAnswer: 2,
    explanation: "O SDK espera arquivos WAV com codificaÃ§Ã£o PCM. O formato padrÃ£o esperado Ã© 16kHz de taxa de amostragem, 16-bit de profundidade, canal mono. Outros formatos podem precisar de configuraÃ§Ã£o explÃ­cita de AudioStreamFormat."
  },
  {
    question: "Quando vocÃª deve usar transcriÃ§Ã£o em lote em vez de reconhecimento em tempo real?",
    options: [
      "Quando vocÃª precisa de resultados em menos de 1 segundo",
      "Lote Ã© sempre preferÃ­vel ao tempo real",
      "Quando vocÃª precisa de diarizaÃ§Ã£o de falantes",
      "Quando transcrever arquivos de Ã¡udio prÃ©-gravados de forma assÃ­ncrona, especialmente gravaÃ§Ãµes longas ou mÃºltiplos arquivos"
    ],
    correctAnswer: 3,
    explanation: "A transcriÃ§Ã£o em lote Ã© para arquivos prÃ©-gravados processados de forma assÃ­ncrona via REST API. Ã‰ ideal para gravaÃ§Ãµes longas, mÃºltiplos arquivos e quando resultados em tempo real nÃ£o sÃ£o necessÃ¡rios."
  },
  {
    question: "O que a diarizaÃ§Ã£o fornece no speech-to-text?",
    options: [
      "IdentificaÃ§Ã£o de qual falante disse o quÃª (separaÃ§Ã£o de falantes)",
      "TraduÃ§Ã£o para outro idioma",
      "CorreÃ§Ã£o de pontuaÃ§Ã£o",
      "ReduÃ§Ã£o de ruÃ­do"
    ],
    correctAnswer: 0,
    explanation: "A diarizaÃ§Ã£o separa a fala por falante, identificando 'quem disse o quÃª'. Ela rotula segmentos da transcriÃ§Ã£o com IDs de falantes, Ãºtil para reuniÃµes com mÃºltiplos participantes."
  },
  {
    question: "Como vocÃª lida com CancellationReason.Error no reconhecimento de fala?",
    options: [
      "Ignore â€” Ã© apenas informativo",
      "Reinicie o reconhecedor automaticamente",
      "Verifique cancellation_details.error_details para o erro especÃ­fico (autenticaÃ§Ã£o, rede, problema de formato) e corrija adequadamente",
      "Mude para um idioma diferente"
    ],
    correctAnswer: 2,
    explanation: "CancellationReason.Error indica uma falha real. Verifique error_details para detalhes â€” causas comuns sÃ£o credenciais invÃ¡lidas, problemas de rede ou formato de Ã¡udio nÃ£o suportado."
  }
]} />

## Limpeza

```bash
az group delete --name rg-ai102-speech --yes --no-wait
```

## Saiba Mais

- [VisÃ£o geral do Speech-to-text](https://learn.microsoft.com/azure/ai-services/speech-service/speech-to-text)
- [InÃ­cio rÃ¡pido do Speech SDK](https://learn.microsoft.com/azure/ai-services/speech-service/get-started-speech-to-text)
- [TranscriÃ§Ã£o em lote](https://learn.microsoft.com/azure/ai-services/speech-service/batch-transcription)
- [Custom Speech](https://learn.microsoft.com/azure/ai-services/speech-service/custom-speech-overview)
