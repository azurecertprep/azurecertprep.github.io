---
sidebar_position: 6
title: "Challenge 28: Face Detection and Analysis"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Challenge 28: Face Detection and Analysis

:::info Estimated Time
**45 min** | **Cost**: $1-3 (estimated) | **Domain**: Implement Computer Vision Solutions (10-15%)
:::

:::caution Limited Access
Face **identification** and **verification** features require [Limited Access approval](https://aka.ms/facerecognition). This challenge focuses on **detection** features available without approval.
:::

## Exam skills covered
- Implement facial detection solutions
- Detect faces and analyze face attributes
- Understand responsible AI limitations on face services

## Overview

Azure AI Face service provides face detection with attribute analysis. Detection is available without restrictions; identification/verification require approval.

**Detection attributes** (available without Limited Access):
- Face location (bounding box)
- Head pose (pitch, roll, yaw)
- Blur level (low, medium, high)
- Exposure level (underExposure, goodExposure, overExposure)
- Noise level
- Occlusion (forehead, eyes, mouth occluded)
- Accessories (headwear, glasses)
- Quality for recognition

**Restricted features** (require Limited Access approval):
- Face identification (1:N matching)
- Face verification (1:1 matching)
- PersonGroup management

## Prerequisites
- Azure subscription
- Azure AI Face resource
- Python 3.9+ or .NET 8
- Package: `azure-ai-vision-face` (v1.0+)

## Implementation

### Task 1: Create Face Resource

```bash
az group create --name rg-ai102-face --location eastus2

az cognitiveservices account create \
  --name face-ai102 \
  --resource-group rg-ai102-face \
  --kind Face \
  --sku S0 \
  --location eastus2

FACE_ENDPOINT=$(az cognitiveservices account show --name face-ai102 --resource-group rg-ai102-face --query properties.endpoint -o tsv)
FACE_KEY=$(az cognitiveservices account keys list --name face-ai102 --resource-group rg-ai102-face --query key1 -o tsv)
```

### Task 2: Detect Faces and Analyze Attributes

<Tabs>
<TabItem value="python" label="Python SDK">

```python
import os
from azure.ai.vision.face import FaceClient
from azure.ai.vision.face.models import (
    FaceDetectionModel,
    FaceRecognitionModel,
    FaceAttributeTypeDetection03
)
from azure.core.credentials import AzureKeyCredential

client = FaceClient(
    endpoint=os.environ["AZURE_AI_ENDPOINT"],
    credential=AzureKeyCredential(os.environ["AZURE_AI_KEY"])
)

# Detect faces with attributes
image_url = "https://learn.microsoft.com/azure/ai-services/computer-vision/media/face-detection/face-landmarks-annotated.png"

detected_faces = client.detect_from_url(
    url=image_url,
    detection_model=FaceDetectionModel.DETECTION_03,
    recognition_model=FaceRecognitionModel.RECOGNITION_04,
    return_face_id=False,
    return_face_attributes=[
        FaceAttributeTypeDetection03.HEAD_POSE,
        FaceAttributeTypeDetection03.BLUR,
        FaceAttributeTypeDetection03.EXPOSURE,
        FaceAttributeTypeDetection03.NOISE,
        FaceAttributeTypeDetection03.MASK,
        FaceAttributeTypeDetection03.QUALITY_FOR_RECOGNITION
    ]
)

print(f"Detected {len(detected_faces)} face(s):\n")

for i, face in enumerate(detected_faces):
    rect = face.face_rectangle
    print(f"Face {i+1}:")
    print(f"  Bounding box: left={rect.left}, top={rect.top}, "
          f"width={rect.width}, height={rect.height}")
    
    attrs = face.face_attributes
    if attrs:
        # Head pose
        pose = attrs.head_pose
        print(f"  Head pose: pitch={pose.pitch:.1f}, roll={pose.roll:.1f}, yaw={pose.yaw:.1f}")
        
        # Image quality attributes
        print(f"  Blur: {attrs.blur.blur_level} (value: {attrs.blur.value:.3f})")
        print(f"  Exposure: {attrs.exposure.exposure_level} (value: {attrs.exposure.value:.3f})")
        print(f"  Noise: {attrs.noise.noise_level} (value: {attrs.noise.value:.3f})")
        
        # Mask detection
        print(f"  Mask: type={attrs.mask.type}, covers_nose_and_mouth={attrs.mask.nose_and_mouth_covered}")
        
        # Recognition quality
        print(f"  Quality for recognition: {attrs.quality_for_recognition}")
    print()
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
using Azure;
using Azure.AI.Vision.Face;

var client = new FaceClient(
    new Uri(Environment.GetEnvironmentVariable("AZURE_AI_ENDPOINT")),
    new AzureKeyCredential(Environment.GetEnvironmentVariable("AZURE_AI_KEY")));

var imageUrl = new Uri("https://raw.githubusercontent.com/Azure-Samples/cognitive-services-sample-data-files/master/Face/images/detection1.jpg");

var response = client.Detect(
    imageUrl,
    FaceDetectionModel.Detection03,
    FaceRecognitionModel.Recognition04,
    returnFaceId: false,
    returnFaceAttributes: new[]
    {
        FaceAttributeType.HeadPose,
        FaceAttributeType.Blur,
        FaceAttributeType.Exposure,
        FaceAttributeType.Noise,
        FaceAttributeType.Mask,
        FaceAttributeType.QualityForRecognition
    });

foreach (var face in response.Value)
{
    var rect = face.FaceRectangle;
    Console.WriteLine($"Face: left={rect.Left}, top={rect.Top}, width={rect.Width}, height={rect.Height}");
    
    var attrs = face.FaceAttributes;
    Console.WriteLine($"  Head pose: pitch={attrs.HeadPose.Pitch:F1}, roll={attrs.HeadPose.Roll:F1}, yaw={attrs.HeadPose.Yaw:F1}");
    Console.WriteLine($"  Blur: {attrs.Blur.BlurLevel} ({attrs.Blur.Value:F3})");
    Console.WriteLine($"  Quality: {attrs.QualityForRecognition}");
}
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
ENDPOINT="https://<resource>.cognitiveservices.azure.com"
KEY="<your-key>"

curl -s "${ENDPOINT}/face/v1.0/detect?detectionModel=detection_03&recognitionModel=recognition_04&returnFaceAttributes=headPose,blur,exposure,noise,mask,qualityForRecognition&returnFaceId=false" \
  -H "Ocp-Apim-Subscription-Key: ${KEY}" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://learn.microsoft.com/azure/ai-services/computer-vision/media/face-detection/face-landmarks-annotated.png"}' \
  | jq '.[0] | {faceRectangle, faceAttributes: {headPose: .faceAttributes.headPose, blur: .faceAttributes.blur, quality: .faceAttributes.qualityForRecognition}}'
```

</TabItem>
</Tabs>

### Task 3: Detect Faces in Local Image

<Tabs>
<TabItem value="python" label="Python SDK">

```python
# Detect from local file
with open("group-photo.jpg", "rb") as f:
    image_data = f.read()

faces = client.detect(
    image_content=image_data,
    detection_model=FaceDetectionModel.DETECTION_03,
    recognition_model=FaceRecognitionModel.RECOGNITION_04,
    return_face_id=False,
    return_face_attributes=[
        FaceAttributeTypeDetection03.HEAD_POSE,
        FaceAttributeTypeDetection03.QUALITY_FOR_RECOGNITION
    ]
)

print(f"Found {len(faces)} faces in group photo")
for i, face in enumerate(faces):
    quality = face.face_attributes.quality_for_recognition
    print(f"  Face {i+1}: quality={quality} {'✓' if quality == 'high' else '⚠'}")
```

</TabItem>
</Tabs>

## Expected Output

```text
Detected 1 face(s):

Face 1:
  Bounding box: left=194, top=98, width=242, height=325
  Head pose: pitch=-2.3, roll=1.5, yaw=-4.2
  Blur: low (value: 0.042)
  Exposure: goodExposure (value: 0.623)
  Noise: low (value: 0.089)
  Mask: type=noMask, covers_nose_and_mouth=False
  Quality for recognition: high

Found 5 faces in group photo
  Face 1: quality=high ✓
  Face 2: quality=high ✓
  Face 3: quality=medium ⚠
  Face 4: quality=high ✓
  Face 5: quality=low ⚠
```

## Break & fix

| Scenario | Symptom | Root Cause | Fix |
|----------|---------|------------|-----|
| No faces detected | Empty array returned | Face too small (< 36x36 px) or severely occluded | Ensure faces are at least 36x36 pixels; use higher resolution |
| 403 Forbidden on identify | Access denied | Feature requires Limited Access approval | Apply at https://aka.ms/facerecognition; use detection only |
| `InvalidImage` error | 400 Bad Request | Image format unsupported or corrupted | Use JPEG, PNG, GIF, or BMP; max 6MB |
| Wrong detection model | Attributes missing | Detection_01 doesn't support all attributes | Use `detection_03` for latest attribute support |
| Inconsistent results | Different face counts | Detection model differences | Stick to one detection model consistently |

## Knowledge Check

<KnowledgeCheck questions={[
  {
    question: "Which Face service features require Limited Access approval?",
    options: [
      "Face detection and attribute analysis",
      "Bounding box detection and head pose",
      "Blur, exposure, and noise detection",
      "Face identification (1:N) and verification (1:1)"
    ],
    correctAnswer: 3,
    explanation: "Face identification (matching against a group) and verification (comparing two faces) require Limited Access approval. Detection and attribute analysis are available without approval."
  },
  {
    question: "What is the minimum detectable face size in Azure Face service?",
    options: [
      "36x36 pixels",
      "10x10 pixels",
      "100x100 pixels",
      "200x200 pixels"
    ],
    correctAnswer: 0,
    explanation: "The minimum face size for detection is 36x36 pixels. For better attribute analysis, larger face regions (ideally 200x200+) are recommended."
  },
  {
    question: "Which detection model should you use for the most complete attribute support?",
    options: [
      "detection_01",
      "detection_02",
      "detection_03",
      "detection_04"
    ],
    correctAnswer: 2,
    explanation: "Detection_03 provides the best attribute support including mask detection, head pose, blur, exposure, and quality for recognition."
  },
  {
    question: "What does 'qualityForRecognition' indicate?",
    options: [
      "The overall image quality (resolution, compression)",
      "How suitable the detected face is for identification/verification tasks (low, medium, high)",
      "The confidence score of the face detection itself",
      "Whether the image meets minimum size requirements"
    ],
    correctAnswer: 1,
    explanation: "qualityForRecognition indicates whether the face image quality is sufficient for recognition (identification/verification) — rated as low, medium, or high based on pose, blur, and occlusion."
  },
  {
    question: "What is the difference between face detection and face identification?",
    options: [
      "Detection is faster; identification is more accurate",
      "Detection works on video; identification works on images",
      "There is no difference — they are the same operation",
      "Detection locates faces and returns attributes; identification matches faces against a known person group"
    ],
    correctAnswer: 3,
    explanation: "Detection finds faces in an image and returns locations + attributes. Identification takes a detected face and matches it against a PersonGroup to determine WHO the person is."
  }
]} />

## Cleanup

```bash
az group delete --name rg-ai102-face --yes --no-wait
```

## Learn More

- [Face service overview](https://learn.microsoft.com/azure/ai-services/computer-vision/overview-identity)
- [Face detection concepts](https://learn.microsoft.com/azure/ai-services/computer-vision/concept-face-detection)
- [Responsible use of Face](https://learn.microsoft.com/azure/ai-services/computer-vision/responsible-use-identity)
- [Limited Access policy](https://learn.microsoft.com/azure/ai-services/cognitive-services-limited-access)
