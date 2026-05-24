---
sidebar_position: 7
title: "Challenge 29: Video Analysis with Video Indexer"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Challenge 29: Video Analysis with Video Indexer

:::info Estimated Time
**60 min** | **Cost**: $5-15 (estimated) | **Domain**: Implement Computer Vision Solutions (10-15%)
:::

## Exam skills covered
- Use Azure AI Video Indexer to extract insights from video
- Extract transcripts, faces, topics, and sentiments
- Query video content by keyword and time

## Overview

Azure AI Video Indexer extracts rich insights from video and audio content:

| Insight | Description |
|---------|-------------|
| **Transcript** | Speech-to-text with speaker identification |
| **OCR** | On-screen text extraction |
| **Topics** | Wikipedia-based topic extraction |
| **Keywords** | Key terms from transcript |
| **Faces** | Face detection and grouping (not identification without approval) |
| **Sentiments** | Sentiment analysis (positive/negative/neutral) from transcript text |
| **Scenes/Shots** | Visual scene segmentation |
| **Labels** | Visual object labels per frame |

The API uses a different endpoint: `https://api.videoindexer.ai`

## Prerequisites
- Azure subscription
- Azure AI Video Indexer account
- Python 3.9+ with `requests` library
- Video file or URL

## Implementation

### Task 1: Set Up Video Indexer Account

```bash
az group create --name rg-ai102-videoindexer --location eastus2

# Create Video Indexer account (ARM-connected)
az resource create \
  --resource-group rg-ai102-videoindexer \
  --resource-type Microsoft.VideoIndexer/accounts \
  --name vi-ai102 \
  --location eastus2 \
  --properties '{}'
```

### Task 2: Upload and Index Video

<Tabs>
<TabItem value="python" label="Python SDK">

```python
import os
import time
import requests

# Video Indexer configuration
ACCOUNT_ID = os.environ["VIDEO_INDEXER_ACCOUNT_ID"]
LOCATION = "eastus2"
API_KEY = os.environ["VIDEO_INDEXER_API_KEY"]
API_URL = "https://api.videoindexer.ai"

# Get access token
def get_access_token():
    url = f"{API_URL}/Auth/{LOCATION}/Accounts/{ACCOUNT_ID}/AccessToken"
    headers = {"Ocp-Apim-Subscription-Key": API_KEY}
    params = {"allowEdit": "true"}
    response = requests.get(url, headers=headers, params=params)
    return response.json()

token = get_access_token()
print(f"Access token acquired (length: {len(token)})")

# Upload video from URL
def upload_video(video_url, video_name):
    url = f"{API_URL}/{LOCATION}/Accounts/{ACCOUNT_ID}/Videos"
    params = {
        "accessToken": token,
        "name": video_name,
        "videoUrl": video_url,
        "language": "en-US",
        "indexingPreset": "Default"
    }
    response = requests.post(url, params=params)
    result = response.json()
    print(f"Video uploaded: {result['id']} (state: {result['state']})")
    return result["id"]

video_id = upload_video(
    "https://example.com/sample-presentation.mp4",
    "AI-102 Sample Presentation"
)

# Poll for indexing completion
def wait_for_indexing(video_id):
    while True:
        url = f"{API_URL}/{LOCATION}/Accounts/{ACCOUNT_ID}/Videos/{video_id}/Index"
        params = {"accessToken": token}
        response = requests.get(url, params=params)
        result = response.json()
        state = result["state"]
        print(f"  Indexing state: {state}")
        
        if state == "Processed":
            return result
        elif state == "Failed":
            raise Exception(f"Indexing failed: {result.get('failureMessage')}")
        time.sleep(30)

print("\nWaiting for indexing...")
insights = wait_for_indexing(video_id)
print("Indexing complete!")
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
ACCOUNT_ID="<your-account-id>"
LOCATION="eastus2"
API_KEY="<your-api-key>"

# Get access token
TOKEN=$(curl -s "https://api.videoindexer.ai/Auth/${LOCATION}/Accounts/${ACCOUNT_ID}/AccessToken?allowEdit=true" \
  -H "Ocp-Apim-Subscription-Key: ${API_KEY}" | tr -d '"')

# Upload video from URL
curl -s "https://api.videoindexer.ai/${LOCATION}/Accounts/${ACCOUNT_ID}/Videos?accessToken=${TOKEN}&name=sample-video&videoUrl=https://example.com/video.mp4&language=en-US" \
  -X POST | jq '{id: .id, state: .state}'

# Check indexing status (replace VIDEO_ID)
curl -s "https://api.videoindexer.ai/${LOCATION}/Accounts/${ACCOUNT_ID}/Videos/VIDEO_ID/Index?accessToken=${TOKEN}" \
  | jq '.state'
```

</TabItem>
</Tabs>

### Task 3: Extract Video Insights

<Tabs>
<TabItem value="python" label="Python SDK">

```python
def get_video_insights(video_id):
    url = f"{API_URL}/{LOCATION}/Accounts/{ACCOUNT_ID}/Videos/{video_id}/Index"
    params = {"accessToken": token}
    response = requests.get(url, params=params)
    return response.json()

insights = get_video_insights(video_id)
video_insights = insights["videos"][0]["insights"]

# Extract transcript
print("=== TRANSCRIPT ===")
if "transcript" in video_insights:
    for item in video_insights["transcript"][:5]:  # First 5 entries
        print(f"  [{item['instances'][0]['start']} - {item['instances'][0]['end']}]")
        print(f"  Speaker {item.get('speakerId', 'N/A')}: {item['text']}")
        print()

# Extract topics
print("=== TOPICS ===")
if "topics" in video_insights:
    for topic in video_insights["topics"]:
        print(f"  - {topic['name']} (confidence: {topic['confidence']:.3f})")

# Extract keywords
print("\n=== KEYWORDS ===")
if "keywords" in video_insights:
    for kw in video_insights["keywords"][:10]:
        print(f"  - {kw['text']} (appears {len(kw['instances'])} times)")

# Extract OCR text
print("\n=== ON-SCREEN TEXT (OCR) ===")
if "ocr" in video_insights:
    for ocr_item in video_insights["ocr"][:5]:
        print(f"  [{ocr_item['instances'][0]['start']}] '{ocr_item['text']}'")

# Search within video
def search_video(video_id, query):
    url = f"{API_URL}/{LOCATION}/Accounts/{ACCOUNT_ID}/Videos/{video_id}/Index"
    params = {"accessToken": token, "searchText": query}
    response = requests.get(url, params=params)
    result = response.json()
    
    # Find matching segments
    search_results = result.get("searchMatches", [])
    print(f"\nSearch '{query}': {len(search_results)} matches")
    for match in search_results:
        print(f"  [{match['startTime']} - {match['endTime']}] {match['type']}: {match.get('text', '')[:50]}")

search_video(video_id, "Azure AI")
```

</TabItem>
</Tabs>

## Expected Output

```text
Access token acquired (length: 1247)
Video uploaded: abc123def (state: Uploading)

Waiting for indexing...
  Indexing state: Processing
  Indexing state: Processing
  Indexing state: Processed
Indexing complete!

=== TRANSCRIPT ===
  [0:00:00.000 - 0:00:04.500]
  Speaker 1: Welcome to our presentation on Azure AI Services.

  [0:00:04.500 - 0:00:09.200]
  Speaker 1: Today we'll cover computer vision and natural language processing.

=== TOPICS ===
  - Artificial intelligence (confidence: 0.923)
  - Cloud computing (confidence: 0.856)
  - Computer vision (confidence: 0.834)

=== KEYWORDS ===
  - Azure AI (appears 12 times)
  - computer vision (appears 8 times)
  - machine learning (appears 5 times)

=== ON-SCREEN TEXT (OCR) ===
  [0:00:02.000] 'Azure AI Services Overview'
  [0:01:15.000] 'Computer Vision API'

Search 'Azure AI': 4 matches
  [0:00:00.000 - 0:00:04.500] Transcript: Welcome to our presentation on Azure AI...
  [0:02:30.000 - 0:02:35.000] Ocr: Azure AI Vision
```

## Break & fix

| Scenario | Symptom | Root Cause | Fix |
|----------|---------|------------|-----|
| 401 Unauthorized | Access denied | Token expired (valid for 1 hour) | Request new access token |
| Indexing stuck in Processing | Never completes | Video too long or corrupt | Check video format; try shorter clip |
| Empty transcript | No speech detected | Audio track missing or too quiet | Verify audio exists; check language parameter |
| No faces detected | Face insights empty | Faces too small or obscured | Ensure faces occupy sufficient frame area |
| Search returns no results | Empty searchMatches | Video not fully indexed | Wait for state=Processed before searching |

## Knowledge Check

<KnowledgeCheck questions={[
  {
    question: "What API endpoint does Azure AI Video Indexer use?",
    options: [
      "https://api.videoindexer.ai",
      "https://<resource>.cognitiveservices.azure.com",
      "https://<resource>.videoindexer.azure.com",
      "https://video.cognitive.microsoft.com"
    ],
    correctAnswer: 0,
    explanation: "Video Indexer uses its own dedicated API at https://api.videoindexer.ai, separate from the standard Cognitive Services endpoint."
  },
  {
    question: "What is the typical workflow for processing a video with Video Indexer?",
    options: [
      "Upload â†’ Process â†’ Delete",
      "Create index â†’ Add video â†’ Query results",
      "Deploy model â†’ Send video â†’ Get predictions",
      "Get access token â†’ Upload video â†’ Poll for completion â†’ Retrieve insights"
    ],
    correctAnswer: 3,
    explanation: "The workflow is: authenticate (get token) â†’ upload video â†’ poll status until 'Processed' â†’ retrieve structured insights via the Index endpoint."
  },
  {
    question: "Which insights does Video Indexer extract from the audio track?",
    options: [
      "Only speech-to-text transcript",
      "Only keywords and topics",
      "Transcript with speaker identification, language detection, and sentiment",
      "Audio is not analyzed â€” only visual content"
    ],
    correctAnswer: 2,
    explanation: "Video Indexer extracts transcript with speaker diarization (who spoke when), language detection, keywords, topics, and text-based sentiment analysis from the audio."
  },
  {
    question: "How do you search for specific content within an indexed video?",
    options: [
      "Download the video and search locally",
      "Use the searchText parameter when querying the video index",
      "Create a separate search index",
      "Search is not supported â€” you must read the full transcript"
    ],
    correctAnswer: 1,
    explanation: "Video Indexer supports keyword search via the searchText parameter, which finds matches across transcript, OCR, topics, and other textual insights with timestamps."
  },
  {
    question: "What indexing preset should you use for a video with both speech and on-screen text?",
    options: [
      "AudioOnly",
      "VideoOnly",
      "Default (includes both audio and video analysis)",
      "BasicAudio"
    ],
    correctAnswer: 2,
    explanation: "The 'Default' preset analyzes both audio (transcript, speakers) and video (OCR, faces, objects, scenes). Use AudioOnly or VideoOnly when you need just one track."
  }
]} />

## Cleanup

```bash
az group delete --name rg-ai102-videoindexer --yes --no-wait
```

## Learn More

- [Video Indexer overview](https://learn.microsoft.com/azure/azure-video-indexer/video-indexer-overview)
- [Video Indexer API reference](https://api-portal.videoindexer.ai/)
- [Upload and index videos](https://learn.microsoft.com/azure/azure-video-indexer/upload-index-videos)
