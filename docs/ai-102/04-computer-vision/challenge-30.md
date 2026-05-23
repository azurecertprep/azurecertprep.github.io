---
sidebar_position: 8
title: "Challenge 30: Spatial Analysis"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Challenge 30: Spatial Analysis

:::info Estimated Time
**45 min** | **Cost**: $2-5 (estimated) | **Domain**: Implement Computer Vision Solutions (10-15%)
:::

:::caution Edge Deployment
Spatial Analysis typically runs as an IoT Edge module on edge hardware with a connected camera. This challenge covers the configuration and output format. Actual deployment requires compatible hardware.
:::

## Exam skills covered
- Implement spatial analysis for detecting presence and movement
- Configure zones and lines for people counting
- Process spatial analysis events

## Overview

Azure AI Vision Spatial Analysis processes real-time video from cameras to understand people's movements and interactions with physical spaces:

| Operation | Description |
|-----------|-------------|
| `cognitiveservices.vision.spatialanalysis-personcount` | Count people in a zone |
| `cognitiveservices.vision.spatialanalysis-personcrossingline` | Detect when people cross a line |
| `cognitiveservices.vision.spatialanalysis-personcrossingpolygon` | Detect entry/exit from a polygon zone |
| `cognitiveservices.vision.spatialanalysis-persondistance` | Monitor social distancing |
| `cognitiveservices.vision.spatialanalysis-personzonedwelltime` | Measure time spent in zones |

Deployment model: Video → IoT Edge device (Spatial Analysis container) → IoT Hub → Application

## Prerequisites
- Azure subscription
- Azure AI Vision resource (S1 tier for Spatial Analysis)
- Understanding of IoT Edge deployment (conceptual)
- Azure IoT Hub

## Implementation

### Task 1: Create IoT Hub and Register Edge Device

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

### Task 2: Configure Spatial Analysis Operation

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

### Task 3: IoT Edge Deployment Manifest

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

### Task 4: Process Spatial Analysis Events

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

## Expected Output

```
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

## Break and Fix

| Scenario | Symptom | Root Cause | Fix |
|----------|---------|------------|-----|
| No events generated | Module running but silent | Camera feed URL incorrect or unreachable | Verify RTSP URL; check network connectivity |
| False detections | High person count in empty area | Min confidence too low | Increase `min_confidence` in detector config |
| Zone not triggering | Events for wrong zone | Polygon coordinates incorrect | Verify normalized coordinates match camera FOV |
| GPU out of memory | Container crashes | Too many simultaneous operations | Reduce number of zones/operations per GPU |
| Delayed events | High latency | Edge hardware underpowered | Use recommended GPU (NVIDIA T4 or better) |

## Knowledge Check

<KnowledgeCheck questions={[
  {
    question: "How is Spatial Analysis deployed?",
    options: [
      "As a cloud API endpoint like other Cognitive Services",
      "As an IoT Edge module running on edge hardware with GPU",
      "As a mobile SDK installed on cameras",
      "As an Azure Function triggered by video uploads"
    ],
    correctAnswer: 1,
    explanation: "Spatial Analysis runs as a Docker container on IoT Edge devices with NVIDIA GPUs, processing video locally and sending events to IoT Hub."
  },
  {
    question: "How are zones defined in Spatial Analysis configuration?",
    options: [
      "By specifying pixel coordinates of zone boundaries",
      "By drawing zones in the Azure portal",
      "As polygons with normalized coordinates (0.0 to 1.0) relative to the camera frame",
      "By providing GPS coordinates of physical locations"
    ],
    correctAnswer: 2,
    explanation: "Zones are polygons defined with normalized coordinates (0.0 to 1.0) relative to the camera frame dimensions, making them resolution-independent."
  },
  {
    question: "Which operation would you use to count how many people are in a store section?",
    options: [
      "spatialanalysis-personcrossingline",
      "spatialanalysis-personcount",
      "spatialanalysis-persondistance",
      "spatialanalysis-persondetection"
    ],
    correctAnswer: 1,
    explanation: "personcount monitors the number of people within a defined polygon zone, suitable for occupancy monitoring in store sections."
  },
  {
    question: "What triggers a 'personCrossingLine' event?",
    options: [
      "A person is detected anywhere in the frame",
      "A person's detected footprint crosses a defined virtual line with a specified direction",
      "A person stands still for more than 30 seconds",
      "Two people come within 6 feet of each other"
    ],
    correctAnswer: 1,
    explanation: "personCrossingLine fires when a person's position crosses a defined virtual line. Direction (in/out) is determined by the line's configured from/to sides."
  },
  {
    question: "What hardware is required for Spatial Analysis?",
    options: [
      "Any computer with a webcam",
      "An Azure VM with GPU",
      "IoT Edge device with NVIDIA GPU (T4 or better recommended) and connected camera",
      "Raspberry Pi with camera module"
    ],
    correctAnswer: 2,
    explanation: "Spatial Analysis requires an IoT Edge device with an NVIDIA GPU (T4 or better) for real-time video processing, plus an IP camera providing an RTSP video stream."
  }
]} />

## Cleanup

```bash
az group delete --name rg-ai102-spatial --yes --no-wait
```

## Learn More

- [Spatial Analysis overview](https://learn.microsoft.com/azure/ai-services/computer-vision/intro-to-spatial-analysis-public-preview)
- [Spatial Analysis operations](https://learn.microsoft.com/azure/ai-services/computer-vision/spatial-analysis-operations)
- [Configure zones and lines](https://learn.microsoft.com/azure/ai-services/computer-vision/spatial-analysis-zone-line-placement)
- [IoT Edge deployment](https://learn.microsoft.com/azure/ai-services/computer-vision/spatial-analysis-container)
