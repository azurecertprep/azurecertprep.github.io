---
sidebar_position: 8
title: "Desafio 30: Análise Espacial"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Desafio 30: Análise Espacial

:::info Tempo Estimado
**45 min** | **Custo**: $2-5 (estimado) | **Domínio**: Implementar Soluções de Visão Computacional (10-15%)
:::

:::caution Implantação Edge
A Análise Espacial normalmente roda como um módulo IoT Edge em hardware de borda com uma câmera conectada. Este desafio cobre a configuração e o formato de saída. A implantação real requer hardware compatível.
:::

## Habilidades do exame abordadas
- Implementar análise espacial para detectar presença e movimento
- Configurar zonas e linhas para contagem de pessoas
- Processar eventos de análise espacial

## Visão Geral

O Azure AI Vision Spatial Analysis processa vídeo em tempo real de câmeras para entender os movimentos das pessoas e interações com espaços físicos:

| Operação | Descrição |
|----------|-----------|
| `cognitiveservices.vision.spatialanalysis-personcount` | Contar pessoas em uma zona |
| `cognitiveservices.vision.spatialanalysis-personcrossingline` | Detectar quando pessoas cruzam uma linha |
| `cognitiveservices.vision.spatialanalysis-personcrossingpolygon` | Detectar entrada/saída de uma zona poligonal |
| `cognitiveservices.vision.spatialanalysis-persondistance` | Monitorar distanciamento social |
| `cognitiveservices.vision.spatialanalysis-personzonedwelltime` | Medir tempo gasto em zonas |

Modelo de implantação: Vídeo → Dispositivo IoT Edge (contêiner Spatial Analysis) → IoT Hub → Aplicação

## Pré-requisitos
- Assinatura Azure
- Recurso Azure AI Vision (tier S1 para Spatial Analysis)
- Compreensão da implantação IoT Edge (conceitual)
- Azure IoT Hub

## Implementação

### Tarefa 1: Criar IoT Hub e Registrar Dispositivo Edge

```bash
az group create --name rg-ai102-spatial --location eastus2

# Create Computer Vision resource (S1 tier required for Spatial Analysis)
az cognitiveservices account create \
  --name cv-spatial-ai102 \
  --resource-group rg-ai102-spatial \
  --kind ComputerVision \
  --sku S1 \
  --location eastus2

# Create IoT Hub
az iot hub create \
  --name iothub-spatial-ai102 \
  --resource-group rg-ai102-spatial \
  --sku S1 \
  --location eastus2

# Register IoT Edge device
az iot hub device-identity create \
  --hub-name iothub-spatial-ai102 \
  --device-id edge-spatial-device \
  --edge-enabled

# Get connection string for device provisioning
az iot hub device-identity connection-string show \
  --hub-name iothub-spatial-ai102 \
  --device-id edge-spatial-device \
  --output tsv
```

### Tarefa 2: Configurar Operação de Análise Espacial

<Tabs>
<TabItem value="python" label="Python SDK">

```python
import json

# Spatial Analysis is configured via deployment manifest for IoT Edge
# This shows the configuration structure and event processing

# Zone definition for people counting
zone_config = {
    "zones": [
        {
            "name": "entrance-zone",
            "polygon": [
                [0.1, 0.1],   # top-left (normalized coordinates)
                [0.6, 0.1],   # top-right
                [0.6, 0.9],   # bottom-right
                [0.1, 0.9]    # bottom-left
            ]
        },
        {
            "name": "checkout-zone",
            "polygon": [
                [0.65, 0.2],
                [0.95, 0.2],
                [0.95, 0.8],
                [0.65, 0.8]
            ]
        }
    ]
}

# Line definition for crossing detection
line_config = {
    "lines": [
        {
            "name": "entry-line",
            "line": {
                "start": [0.5, 0.0],
                "end": [0.5, 1.0]
            },
            "direction": {
                "to": "right",
                "from": "left"
            }
        }
    ]
}

# Full operation configuration
spatial_analysis_config = {
    "ai_parameters": {
        "OPERATION_NAME": "cognitiveservices.vision.spatialanalysis-personcount",
        "CAMERA_CONFIGURATION": json.dumps({
            "gpu_index": 0,
            "camera_id": "camera-01",
            "zones": zone_config["zones"]
        }),
        "DETECTOR_NODE_CONFIG": json.dumps({
            "gpu_index": 0,
            "detector_node_name": "person-detector",
            "min_confidence": 0.7,
            "enable_face_mask_classifier": True
        }),
        "SPACEANALYTICS_CONFIG": json.dumps({
            "zones": zone_config["zones"],
            "events": {
                "PERSON_COUNT": {
                    "trigger": "event",
                    "output_frequency": 1,
                    "threshold": 5
                }
            }
        })
    }
}

print("Spatial Analysis Configuration:")
print(json.dumps(spatial_analysis_config, indent=2))
```

</TabItem>
</Tabs>

### Tarefa 3: Manifesto de Implantação IoT Edge

<Tabs>
<TabItem value="python" label="Python SDK">

```python
# IoT Edge deployment manifest for Spatial Analysis
deployment_manifest = {
    "modulesContent": {
        "$edgeAgent": {
            "properties.desired": {
                "schemaVersion": "1.1",
                "runtime": {
                    "type": "docker",
                    "settings": {
                        "minDockerVersion": "v1.25"
                    }
                },
                "systemModules": {
                    "edgeAgent": {
                        "type": "docker",
                        "settings": {
                            "image": "mcr.microsoft.com/azureiotedge-agent:1.4"
                        }
                    },
                    "edgeHub": {
                        "type": "docker",
                        "status": "running",
                        "restartPolicy": "always",
                        "settings": {
                            "image": "mcr.microsoft.com/azureiotedge-hub:1.4"
                        }
                    }
                },
                "modules": {
                    "spatialanalysis": {
                        "version": "1.0",
                        "type": "docker",
                        "status": "running",
                        "restartPolicy": "always",
                        "settings": {
                            "image": "mcr.microsoft.com/azure-cognitive-services/vision/spatial-analysis:latest",
                            "createOptions": json.dumps({
                                "HostConfig": {
                                    "Runtime": "nvidia",
                                    "Binds": [
                                        "/tmp/.X11-unix:/tmp/.X11-unix"
                                    ],
                                    "IpcMode": "host"
                                },
                                "Env": [
                                    "DISPLAY=:0"
                                ]
                            })
                        }
                    }
                }
            }
        },
        "$edgeHub": {
            "properties.desired": {
                "schemaVersion": "1.1",
                "routes": {
                    "spatialToHub": "FROM /messages/modules/spatialanalysis/outputs/* INTO $upstream"
                },
                "storeAndForwardConfiguration": {
                    "timeToLiveSecs": 7200
                }
            }
        },
        "spatialanalysis": {
            "properties.desired": {
                "globalSettings": {
                    "PlatformTelemetryEnabled": True,
                    "CustomerTelemetryEnabled": True
                },
                "graphs": {
                    "personcount": {
                        "operationId": "cognitiveservices.vision.spatialanalysis-personcount",
                        "version": 2,
                        "enabled": True,
                        "parameters": {
                            "VIDEO_URL": "rtsp://camera-ip:554/stream",
                            "VIDEO_SOURCE_ID": "camera-01",
                            "SPACEANALYTICS_CONFIG": json.dumps({
                                "zones": [{
                                    "name": "entrance",
                                    "polygon": [[0.1,0.1],[0.9,0.1],[0.9,0.9],[0.1,0.9]],
                                    "events": [{
                                        "type": "count",
                                        "config": {
                                            "trigger": "event",
                                            "threshold": 3,
                                            "focus": "footprint"
                                        }
                                    }]
                                }]
                            })
                        }
                    }
                }
            }
        }
    }
}

print("Deployment Manifest (partial):")
print(json.dumps(deployment_manifest["modulesContent"]["spatialanalysis"], indent=2)[:1000])
```

</TabItem>
<TabItem value="cli" label="Deploy via CLI">

```bash
# Deploy the manifest to the IoT Edge device
az iot edge set-modules \
  --hub-name iothub-spatial-ai102 \
  --device-id edge-spatial-device \
  --content deployment-manifest.json

# Verify modules are running on the edge device
az iot hub module-identity list \
  --hub-name iothub-spatial-ai102 \
  --device-id edge-spatial-device \
  --output table
```

</TabItem>
</Tabs>

### Tarefa 4: Processar Eventos de Análise Espacial

<Tabs>
<TabItem value="python" label="Python SDK">

```python
# Process events from Spatial Analysis (via IoT Hub)
# These are the event structures emitted by the spatial analysis module

sample_events = [
    {
        "id": "event-001",
        "type": "personCountEvent",
        "detectionIds": ["det-1", "det-2", "det-3"],
        "properties": {
            "personCount": 3,
            "zone": "entrance-zone",
            "trigger": "event"
        },
        "sourceInfo": {
            "id": "camera-01",
            "timestamp": "2024-01-15T10:30:00.000Z",
            "width": 1920,
            "height": 1080,
            "frameId": "frame-4521"
        }
    },
    {
        "id": "event-002",
        "type": "personCrossingLineEvent",
        "detectionIds": ["det-4"],
        "properties": {
            "direction": "in",
            "line": "entry-line",
            "zone": "entrance-zone"
        },
        "sourceInfo": {
            "id": "camera-01",
            "timestamp": "2024-01-15T10:30:05.000Z",
            "width": 1920,
            "height": 1080,
            "frameId": "frame-4530"
        }
    },
    {
        "id": "event-003",
        "type": "personDistanceEvent",
        "detectionIds": ["det-5", "det-6"],
        "properties": {
            "personCount": 2,
            "minimumDistanceInFeet": 3.2,
            "averageDistanceInFeet": 4.8,
            "violationCount": 1,
            "zone": "checkout-zone"
        },
        "sourceInfo": {
            "id": "camera-01",
            "timestamp": "2024-01-15T10:30:10.000Z",
            "width": 1920,
            "height": 1080,
            "frameId": "frame-4540"
        }
    }
]

# Event processor
class SpatialEventProcessor:
    def __init__(self):
        self.zone_counts = {}
        self.crossings = {"in": 0, "out": 0}
        self.distance_violations = 0
    
    def process_event(self, event):
        event_type = event["type"]
        props = event["properties"]
        timestamp = event["sourceInfo"]["timestamp"]
        
        if event_type == "personCountEvent":
            zone = props["zone"]
            count = props["personCount"]
            self.zone_counts[zone] = count
            print(f"[{timestamp}] ZONE '{zone}': {count} people")
            
            if count > 5:
                print(f"  ⚠️ ALERT: Zone '{zone}' exceeds capacity!")
        
        elif event_type == "personCrossingLineEvent":
            direction = props["direction"]
            self.crossings[direction] = self.crossings.get(direction, 0) + 1
            print(f"[{timestamp}] LINE CROSSING: 1 person going '{direction}' at '{props['line']}'")
        
        elif event_type == "personDistanceEvent":
            violations = props["violationCount"]
            self.distance_violations += violations
            min_dist = props["minimumDistanceInFeet"]
            print(f"[{timestamp}] DISTANCE: {props['personCount']} people, "
                  f"min distance: {min_dist:.1f}ft, violations: {violations}")
    
    def summary(self):
        print(f"\n--- Session Summary ---")
        print(f"Zone occupancy: {self.zone_counts}")
        print(f"Crossings: {self.crossings}")
        print(f"Distance violations: {self.distance_violations}")

# Process sample events
processor = SpatialEventProcessor()
for event in sample_events:
    processor.process_event(event)
processor.summary()
```

</TabItem>
</Tabs>

## Saída Esperada

```text
Spatial Analysis Configuration:
{
  "ai_parameters": {
    "OPERATION_NAME": "cognitiveservices.vision.spatialanalysis-personcount",
    ...
  }
}

[2024-01-15T10:30:00.000Z] ZONE 'entrance-zone': 3 people
[2024-01-15T10:30:05.000Z] LINE CROSSING: 1 person going 'in' at 'entry-line'
[2024-01-15T10:30:10.000Z] DISTANCE: 2 people, min distance: 3.2ft, violations: 1

--- Session Summary ---
Zone occupancy: {'entrance-zone': 3}
Crossings: {'in': 1, 'out': 0}
Distance violations: 1
```

## Quebra & conserta

| Cenário | Sintoma | Causa Raiz | Correção |
|---------|---------|------------|----------|
| Nenhum evento gerado | Módulo rodando mas silencioso | URL do feed da câmera incorreta ou inacessível | Verifique a URL RTSP; confira a conectividade de rede |
| Detecções falsas | Contagem alta de pessoas em área vazia | Confiança mínima muito baixa | Aumente `min_confidence` na configuração do detector |
| Zona não dispara | Eventos para zona errada | Coordenadas do polígono incorretas | Verifique se coordenadas normalizadas correspondem ao FOV da câmera |
| GPU sem memória | Contêiner trava | Muitas operações simultâneas | Reduza o número de zonas/operações por GPU |
| Eventos atrasados | Alta latência | Hardware de borda subdimensionado | Use GPU recomendada (NVIDIA T4 ou superior) |

## Verificação de Conhecimento

<KnowledgeCheck questions={[
  {
    question: "Como o Spatial Analysis é implantado?",
    options: [
      "Como um endpoint de API na nuvem como outros Cognitive Services",
      "Como um módulo IoT Edge rodando em hardware de borda com GPU",
      "Como um SDK móvel instalado nas câmeras",
      "Como uma Azure Function acionada por uploads de vídeo"
    ],
    correctAnswer: 1,
    explanation: "O Spatial Analysis roda como um contêiner Docker em dispositivos IoT Edge com GPUs NVIDIA, processando vídeo localmente e enviando eventos para o IoT Hub."
  },
  {
    question: "Como as zonas são definidas na configuração do Spatial Analysis?",
    options: [
      "Especificando coordenadas em pixels dos limites da zona",
      "Desenhando zonas no portal Azure",
      "Como polígonos com coordenadas normalizadas (0.0 a 1.0) relativas ao frame da câmera",
      "Fornecendo coordenadas GPS de localizações físicas"
    ],
    correctAnswer: 2,
    explanation: "Zonas são polígonos definidos com coordenadas normalizadas (0.0 a 1.0) relativas às dimensões do frame da câmera, tornando-as independentes de resolução."
  },
  {
    question: "Qual operação você usaria para contar quantas pessoas estão em uma seção da loja?",
    options: [
      "spatialanalysis-personcrossingline",
      "spatialanalysis-persondistance",
      "spatialanalysis-persondetection",
      "spatialanalysis-personcount"
    ],
    correctAnswer: 3,
    explanation: "personcount monitora o número de pessoas dentro de uma zona poligonal definida, adequado para monitoramento de ocupação em seções de lojas."
  },
  {
    question: "O que aciona um evento 'personCrossingLine'?",
    options: [
      "A pegada detectada de uma pessoa cruza uma linha virtual definida com uma direção especificada",
      "Uma pessoa é detectada em qualquer lugar no frame",
      "Uma pessoa fica parada por mais de 30 segundos",
      "Duas pessoas ficam a menos de 2 metros uma da outra"
    ],
    correctAnswer: 0,
    explanation: "personCrossingLine dispara quando a posição de uma pessoa cruza uma linha virtual definida. A direção (in/out) é determinada pelos lados from/to configurados na linha."
  },
  {
    question: "Qual hardware é necessário para o Spatial Analysis?",
    options: [
      "Qualquer computador com webcam",
      "Uma VM Azure com GPU",
      "Dispositivo IoT Edge com GPU NVIDIA (T4 ou superior recomendado) e câmera conectada",
      "Raspberry Pi com módulo de câmera"
    ],
    correctAnswer: 2,
    explanation: "O Spatial Analysis requer um dispositivo IoT Edge com GPU NVIDIA (T4 ou superior) para processamento de vídeo em tempo real, além de uma câmera IP fornecendo um stream de vídeo RTSP."
  }
]} />

## Limpeza

```bash
az group delete --name rg-ai102-spatial --yes --no-wait
```

## Saiba Mais

- [Visão geral do Spatial Analysis](https://learn.microsoft.com/azure/ai-services/computer-vision/intro-to-spatial-analysis-public-preview)
- [Operações do Spatial Analysis](https://learn.microsoft.com/azure/ai-services/computer-vision/spatial-analysis-operations)
- [Configurar zonas e linhas](https://learn.microsoft.com/azure/ai-services/computer-vision/spatial-analysis-zone-line-placement)
- [Implantação IoT Edge](https://learn.microsoft.com/azure/ai-services/computer-vision/spatial-analysis-container)
