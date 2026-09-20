# JanKalyan (जनकल्याण) — System Architecture Document
### In-Depth Architectural Specification and Component Design

---

## 1. Architectural Principles & Paradigm

**JanKalyan** is architected on four core design tenets:
1. **100% Serverless & Event-Driven**: There are zero persistent EC2 virtual machines or provisioned container clusters. All resources execute ephemerally on demand, autoscaling from zero to thousands of concurrent requests while remaining virtually cost-free when idle.
2. **Zero-Hallucination Grounded AI (RAG)**: Conversational responses are not left to unconstrained model imagination. Answers are strictly bounded by official government operational guidelines stored in a vector knowledge base.
3. **Resilient Dual-Tier Fallback**: The architecture operates independently of third-party model availability or AWS account-level foundation model activation holds.
4. **Private-by-Default Security**: All cloud storage buckets strictly enforce `BlockPublicAcls` and `BlockPublicPolicy`. All document access uses temporary, cryptographically signed pre-signed URLs.

---

## 2. End-to-End System Architecture Diagram

![JanKalyan End-to-End System Architecture](./architecture.svg)

<details open>
<summary><b>Mermaid Diagram Definition</b></summary>

```mermaid
flowchart TB
    subgraph Client ["1. Client & Presentation Layer (Browser)"]
        UI["React 19 + Vite Frontend\n(Tailwind CSS v4 + Radix UI)"]
        STT["Web Speech Recognition API\n(Microphone Input)"]
        TTS["Audio Streaming Player\n(+ Web Speech Synthesis Fallback)"]
    end

    subgraph Edge ["2. Edge & Ingress Layer"]
        Amplify["AWS Amplify Hosting\n(Global CloudFront CDN + SSL)"]
        APIGW["AWS HTTP API Gateway (v2)\n(/prod stage with CORS)"]
    end

    subgraph Compute ["3. Compute Layer (AWS Lambda - Python 3.14 ARM64)"]
        FilterFn["Lambda: Filter Schemes\n(scheme-navigator-filter-schemes)"]
        VoiceRagFn["Lambda: Voice RAG & Eligibility\n(scheme-navigator-voice-rag)"]
    end

    subgraph Data ["4. Persistence & Storage Layer"]
        DDB_Schemes[("DynamoDB: GovSchemes Table\n(Schemes metadata, rules, benefits)")]
        DDB_Sessions[("DynamoDB: Sessions Table\n(24h TTL Session Cache)")]
        S3_Docs[("S3: Scheme Docs Bucket\n(Private - Official Ministry PDFs)")]
        S3_Audio[("S3: Audio Cache Bucket\n(Private - MD5 cached Polly MP3s)")]
    end

    subgraph GenAI ["5. Generative AI & Language Intelligence Layer"]
        BedrockKB["AWS Bedrock Knowledge Base\n(GovSchemesKB - ID: HDGCKVKYEE)"]
        TitanEmbed["Amazon Titan Text Embeddings v1\n(1536-dim vector indexing)"]
        Nova["Amazon Nova Foundation Models\n(nova-pro-v1:0 / nova-lite-v1:0)"]
        Translate["AWS Translate\n(Neural Regional Translation)"]
        Polly["Amazon Polly\n(Neural Indian Voice: Kajal)"]
    end

    %% Client Interactions
    UI -->|"Hosted by"| Amplify
    STT -->|"Transcribed Text"| UI
    UI -->|"GET /schemes"| APIGW
    UI -->|"POST /chat & /eligibility"| APIGW
    UI -->|"Plays Audio Stream"| TTS

    %% Routing
    APIGW -->|"Route /schemes"| FilterFn
    APIGW -->|"Route /chat, /eligibility"| VoiceRagFn

    %% Filter Lambda
    FilterFn -->|"Scan / Query"| DDB_Schemes

    %% Voice RAG Lambda
    VoiceRagFn -->|"Session Context"| DDB_Sessions
    VoiceRagFn -->|"1. Vector Search Query"| BedrockKB
    BedrockKB -->|"Embeddings"| TitanEmbed
    BedrockKB -->|"PDF Chunks"| S3_Docs

    VoiceRagFn -.->|"2a. LLM Inference (when active)"| Nova
    VoiceRagFn -->|"2b. Grounded Direct Synthesis"| VoiceRagFn
    VoiceRagFn -->|"3. Localize to 9 languages"| Translate
    VoiceRagFn -->|"4. Speech Synthesis"| Polly
    Polly -->|"Store MP3"| S3_Audio
    VoiceRagFn -->|"5. Generate Presigned URL"| S3_Audio
    VoiceRagFn -->|"6. Generate Presigned PDF URL"| S3_Docs
```
</details>

---

## 3. The Five Structural Layers

### 3.1. Client & Presentation Layer (Frontend)
- **Framework**: React 19, Vite 6, TypeScript.
- **Styling**: Tailwind CSS v4 using semantic design tokens tailored for rural and urban Indian citizens.
- **Speech-to-Text (STT)**: Integrated with the Web Speech API (`webkitSpeechRecognition`). Automatically configures language BCP-47 codes (e.g., `hi-IN` for Hindi, `mr-IN` for Marathi, `ta-IN` for Tamil).
- **Text-to-Speech (TTS)**: Plays cached Amazon Polly audio via HTML5 `<audio>` streaming, with a client-side `window.speechSynthesis` fallback for offline or low-connectivity environments.
- **State & Caching**: TanStack Query (`@tanstack/react-query`) handles query deduplication, background caching, and automatic refetching.

### 3.2. Edge & Ingress Layer
- **AWS Amplify Hosting**: Hosts the single-page application and distributes static assets globally across Amazon CloudFront edge nodes with HTTP/2 and TLS 1.3 encryption.
- **AWS HTTP API Gateway (v2)**: Serves as the central API gateway at `https://qo950rv93f.execute-api.us-east-1.amazonaws.com/prod`:
  - Auto-manages CORS (`Access-Control-Allow-Origin: *`, `AllowHeaders: [content-type, x-session-id]`).
  - Low latency proxy routing directly to AWS Lambda functions without intermediate proxies.

### 3.3. Compute Layer (AWS Lambda)
Serverless execution runs on AWS Graviton (ARM64) processors running Python 3.14:
- **`scheme-navigator-filter-schemes`**:
  - Memory: 512 MB, Timeout: 10s.
  - Queries DynamoDB and computes matching scores against farmer landholdings, annual income, age, and state categories.
- **`scheme-navigator-voice-rag`**:
  - Memory: 1024 MB, Timeout: 60s.
  - Coordinates vector retrieval from Bedrock Knowledge Bases, translation via AWS Translate, voice synthesis via Amazon Polly, and pre-signed S3 URL generation.

### 3.4. Generative AI & Language Intelligence Layer
- **Amazon Bedrock Knowledge Base (`HDGCKVKYEE` — `GovSchemesKB`)**: Indexes official government gazettes using **Amazon Titan Text Embeddings v1** (1536 dimensions).
- **Dual-Tier Resilient Answering**:
  - *Tier 1*: High-capacity foundation model generation via Amazon Nova (`amazon.nova-pro-v1:0` / `amazon.nova-lite-v1:0`).
  - *Tier 2 (Fallback)*: Grounded direct extraction from retrieved Knowledge Base vectors, dynamically translating via AWS Translate when account-level model access holds are in place.
- **AWS Translate**: Translates scheme rules and answers into 9 Indian regional languages with grammar tailored for spoken clarity.
- **Amazon Polly**: Synthesizes Hindi and Indian English audio streams using the neural `Kajal` voice.

### 3.5. Persistence & Storage Layer
- **`scheme-navigator-GovSchemes` (DynamoDB)**: Pay-per-request table containing normalized scheme metadata, criteria, benefits, and application URLs.
- **`scheme-navigator-Sessions` (DynamoDB)**: Manages anonymous user conversation state with a 24-hour Time-to-Live (`ttl`) expiration for privacy.
- **`gov-schemes-docs-...` (Amazon S3)**: Private document store holding the original official ministry PDFs with server-side AES-256 encryption.
- **`gov-schemes-audio-...` (Amazon S3)**: Private audio cache storing generated Polly MP3s with a 7-day automated lifecycle expiry.

---

## 4. End-to-End Request Lifecycles

### 4.1. Voice RAG & Eligibility Assessment Flow

```mermaid
sequenceDiagram
    autonumber
    actor Citizen as Citizen (Browser)
    participant APIGW as API Gateway (v2)
    participant Lambda as Voice RAG Lambda
    participant DDB as DynamoDB (Sessions)
    participant KB as Bedrock Knowledge Base
    participant Translate as AWS Translate
    participant Polly as Amazon Polly
    participant S3 as Amazon S3 (Docs & Audio)

    Citizen->>APIGW: POST /chat (query, language, scheme_id)
    APIGW->>Lambda: Invoke lambda_handler(event)
    Lambda->>KB: retrieve(scoped_query, KB_ID)
    KB-->>Lambda: Top 4 document chunks & S3 URIs
    
    alt LLM Access Active
        Lambda->>Lambda: Invoke Nova Pro with Guardrail Prompt
    else Fallback Mode
        Lambda->>Lambda: Ground answer directly on retrieved official PDF chunks
    end

    Lambda->>Translate: translate_text(answer, target_lang)
    Translate-->>Lambda: Translated regional response
    
    Lambda->>S3: Check audio cache (MD5 hash)
    alt Audio Not Cached
        Lambda->>Polly: synthesize_speech(Text, VoiceId="Kajal")
        Polly-->>Lambda: Audio Stream (MP3)
        Lambda->>S3: PutObject(audio/hash.mp3)
    end
    Lambda->>S3: generate_presigned_url(audio, 1hr)
    S3-->>Lambda: Presigned Audio URL

    Lambda->>S3: generate_presigned_url(PDF, 1hr, inline)
    S3-->>Lambda: Presigned PDF Citation URLs

    Lambda->>DDB: PutItem(session_id, last_query, last_answer, ttl)
    Lambda-->>APIGW: 200 OK (answer, citations, audio_url)
    APIGW-->>Citizen: Response JSON
    Citizen->>Citizen: Render text, play audio, display [View PDF]
```

---

## 5. Security & Isolation Architecture

1. **Zero Public S3 Buckets**: Both the PDF storage bucket and Polly audio cache bucket enforce `BlockPublicAcls: true` and `BlockPublicPolicy: true`. All external access requires short-lived AWS Signature Version 4 URLs.
2. **Inline PDF Streaming**: Citation URLs are signed with:
   - `ResponseContentType: application/pdf`
   - `ResponseContentDisposition: inline`
   This allows mobile devices and desktop browsers to open the official government guidelines directly inside a tab without downloading unverified files.
3. **Session Privacy**: Conversation sessions in DynamoDB are decoupled from citizen identity and automatically expire after 24 hours via DynamoDB TTL.
4. **IAM Least Privilege**: Each Lambda function is assigned a dedicated execution role with fine-grained Resource ARNs.

---

## 6. Active Infrastructure Reference

| Resource Component | AWS Resource Name / Identifier | Region |
| :--- | :--- | :--- |
| **API Gateway Endpoint** | `https://qo950rv93f.execute-api.us-east-1.amazonaws.com/prod` | `us-east-1` |
| **Amplify Web URL** | `https://main.d2l2gs67zimgc.amplifyapp.com` | Global CDN |
| **Bedrock Knowledge Base** | `HDGCKVKYEE` (`GovSchemesKB`) | `us-east-1` |
| **Embedding Model** | `amazon.titan-embed-text-v1` | `us-east-1` |
| **Schemes Database** | `scheme-navigator-GovSchemes` | `us-east-1` |
| **Sessions Database** | `scheme-navigator-Sessions` | `us-east-1` |
| **Document Storage Bucket** | `gov-schemes-docs-892667863574-us-east-1` | `us-east-1` |
| **Audio Cache Bucket** | `gov-schemes-audio-892667863574-us-east-1` | `us-east-1` |
| **Filter Schemes Function** | `scheme-navigator-filter-schemes` | `us-east-1` |
| **Voice RAG Function** | `scheme-navigator-voice-rag` | `us-east-1` |

---
*JanKalyan Scheme Navigator Architecture Specification.*
