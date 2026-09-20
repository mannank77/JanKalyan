# JanKalyan (जनकल्याण) — Voice-First Government Scheme Navigator

[![Live App](https://img.shields.io/badge/🌐_Live_App-AWS_Amplify-FF9900?style=for-the-badge&logo=amazonaws)](https://main.d2l2gs67zimgc.amplifyapp.com)
[![AWS Serverless](https://img.shields.io/badge/Backend-AWS_SAM_Serverless-E34F26?style=for-the-badge&logo=awslambda)](https://aws.amazon.com/serverless/)
[![Amazon Bedrock](https://img.shields.io/badge/AI-Amazon_Bedrock_RAG-232F3E?style=for-the-badge&logo=amazonaws)](https://aws.amazon.com/bedrock/)
[![React 19](https://img.shields.io/badge/Frontend-React_19_+_Vite_6-61DAFB?style=for-the-badge&logo=react)](https://react.dev)
[![Languages](https://img.shields.io/badge/Languages-9_Indian_Regional-green?style=for-the-badge)](https://main.d2l2gs67zimgc.amplifyapp.com)

> **JanKalyan** is a voice-first, AI-powered multilingual government scheme discovery and eligibility platform built for Indian citizens. It enables farmers, women entrepreneurs, artisans, and students to discover welfare schemes, verify eligibility, and receive verified answers — all in their mother tongue, grounded in official government documents with zero hallucination.

🔗 **Live Demo**: [https://main.d2l2gs67zimgc.amplifyapp.com](https://main.d2l2gs67zimgc.amplifyapp.com)

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        CITIZEN (Browser / Mobile)                       │
│  🎙️ Voice Input (webkitSpeechRecognition) │ 🌐 9 Languages │ 🔊 Audio │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                     ┌───────▼───────┐
                     │  AWS Amplify   │  (React 19 + Vite 6 + Tailwind v4)
                     │  CloudFront    │
                     └───────┬───────┘
                             │
                     ┌───────▼───────┐
                     │ API Gateway   │  (HTTP API v2 + CORS)
                     │   /api/*      │
                     └───┬───────┬───┘
                         │       │
              ┌──────────▼──┐  ┌─▼──────────────┐
              │ Filter      │  │ Voice RAG       │
              │ Schemes λ   │  │ Lambda          │
              │ (Python)    │  │ (Python 3.14)   │
              └──────┬──────┘  └─┬──┬──┬──┬──┬───┘
                     │           │  │  │  │  │
              ┌──────▼──────┐    │  │  │  │  │
              │ DynamoDB    │    │  │  │  │  │
              │ GovSchemes  │    │  │  │  │  │
              └─────────────┘    │  │  │  │  │
                                 │  │  │  │  │
    ┌────────────────────────────┘  │  │  │  └─────────────────┐
    │                               │  │  │                    │
┌───▼────────────┐  ┌──────────────▼┐ │ ┌▼──────────┐  ┌──────▼──────┐
│ Bedrock KB     │  │ AWS Translate │ │ │ Amazon    │  │ S3 (Docs)   │
│ (Titan Embed)  │  │ (8 languages)│ │ │ Polly     │  │ Official    │
│ Vector Search  │  └──────────────┘ │ │ (Kajal)   │  │ PDFs        │
└───┬────────────┘                   │ └────┬──────┘  └──────┬──────┘
    │                                │      │                │
    │                         ┌──────▼──┐   │         ┌──────▼──────┐
    │                         │ DynamoDB│   │         │ Pre-signed  │
    │                         │Sessions │   │         │ URL → inline│
    │                         └─────────┘   │         │ PDF viewer  │
    │                                ┌──────▼──────┐  └─────────────┘
    └────────────────────────────────│ S3 (Audio)  │
                                     │ MD5 cached  │
                                     └─────────────┘
```

---

## 🌟 Key Features

### 🎙️ Voice-First Conversational Interface
Citizens speak via their microphone in natural Hindi, Hinglish, or any regional language. The browser's native `webkitSpeechRecognition` API transcribes speech, which is then sent to the Bedrock RAG pipeline for verified answers.

### 🇮🇳 9 Indian Regional Languages
Complete native localization with curated translations (not machine-translated widgets):

| Language | Script | Code |
|:---------|:-------|:-----|
| English | Latin | `en` |
| Hindi | हिन्दी | `hi-IN` |
| Bengali | বাংলা | `bn-IN` |
| Marathi | मराठी | `mr-IN` |
| Telugu | తెలుగు | `te-IN` |
| Tamil | தமிழ் | `ta-IN` |
| Gujarati | ગુજરાતી | `gu-IN` |
| Urdu | اردو | `ur-IN` |
| Kannada | ಕನ್ನಡ | `kn-IN` |

### 🧠 Zero-Hallucination RAG
Answers are **strictly grounded** in official gazette guidelines and ministry operational PDFs indexed in AWS Bedrock Knowledge Bases. The system prompt includes guardrails that prevent fabrication of eligibility rules, subsidy percentages, or deadlines.

### 📄 Inline PDF Citations
Citations link directly to the official government PDF page using **pre-signed S3 URLs** with `ResponseContentDisposition: inline` — documents open in the browser without exposing the S3 bucket publicly.

### 🔊 Neural Indian Voice Synthesis
Answers are spoken aloud using **Amazon Polly's Kajal neural voice** (Hindi/Indian English) with MD5-based audio caching in S3 to eliminate redundant synthesis for repeated queries.

### 🎯 Dynamic Scheme Matching
Filter schemes by state, category, land size, income, and age. The system computes an eligibility **match percentage (0–100%)** with specific match reasons for each scheme.

### ⚖️ Side-by-Side Comparison
Compare multiple schemes in a matrix view — benefits, application steps, required documents, and eligibility criteria at a glance.

### 🛡️ 3-Layer Failure Resilience
1. **Input validation** — clean error messages, never stack traces
2. **Graceful AI degradation** — nonsense queries still return the closest official documents
3. **Pipeline failover** — if the LLM is unavailable, the system automatically serves answers from direct Knowledge Base chunk extraction

---

## 🗂️ Project Structure

```
scheme-navigator/
├── backend/
│   ├── template.yaml              # AWS SAM Infrastructure-as-Code
│   ├── samconfig.toml              # SAM deployment configuration
│   ├── src/
│   │   ├── voice_rag/
│   │   │   └── app.py              # Voice RAG Lambda (Bedrock + Polly + Translate)
│   │   └── filter_schemes/
│   │       └── app.py              # Scheme filtering Lambda (DynamoDB)
│   ├── scripts/
│   │   └── seed_dynamodb.py        # DynamoDB seed script for scheme data
│   └── data/
│       └── schemes.json            # Scheme metadata
│
├── frontend/
│   ├── index.html                  # Entry point with SEO meta tags
│   ├── vite.config.ts              # Vite 6 config with API proxy
│   ├── package.json                # Dependencies (React 19, Radix UI, etc.)
│   ├── src/
│   │   ├── App.tsx                 # Main application (Dashboard + Filters + Voice)
│   │   ├── index.css               # Tailwind CSS v4 with design tokens
│   │   ├── components/
│   │   │   ├── voice-drawer.tsx    # Voice assistant drawer (Speech + Audio + Chat)
│   │   │   └── ui/                 # 40+ accessible Radix UI primitives
│   │   ├── data/
│   │   │   ├── jankalyan.ts        # Scheme data and constants
│   │   │   └── translations.ts     # 9-language translation dictionary
│   │   ├── hooks/
│   │   │   ├── useSchemes.ts       # TanStack Query hook for scheme filtering
│   │   │   └── useChat.ts          # TanStack Query hook for voice chat
│   │   └── lib/
│   │       ├── api.ts              # API client (typed requests/responses)
│   │       └── utils.ts            # Utility functions
│   └── dist/                       # Production build output
│
├── docs/
│   ├── ARCHITECTURE.md             # Detailed system architecture specification
│   ├── PROJECT_DOCUMENTATION.md    # Comprehensive technical documentation
│   ├── CONTRIBUTION_SUMMARY.md     # Team contribution breakdown
│   └── DEMO_SCRIPT.md             # 3-minute hackathon demo script
│
└── .gitignore
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18 and **npm** ≥ 9
- **Python** ≥ 3.11
- **AWS CLI** configured with appropriate credentials
- **AWS SAM CLI** ([install guide](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html))

### 1. Clone the Repository

```bash
git clone https://github.com/mannank77/scheme-navigator.git
cd scheme-navigator
```

### 2. Deploy the Backend

```bash
cd backend

# Build and deploy the SAM stack
sam build
sam deploy --guided

# Seed DynamoDB with scheme data
python scripts/seed_dynamodb.py
```

The deployment outputs will include your **API Gateway endpoint URL**. Note this for the frontend configuration.

### 3. Run the Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start development server (proxies /api to your AWS backend)
npm run dev
```

The app will be available at `http://localhost:5173`.

### 4. Configure the API Proxy (Development)

The Vite development server proxies `/api` requests to the live AWS backend. Update the target URL in [`vite.config.ts`](frontend/vite.config.ts) if your API Gateway endpoint differs:

```typescript
proxy: {
  "/api": {
    target: "https://YOUR_API_GATEWAY_ID.execute-api.us-east-1.amazonaws.com",
    changeOrigin: true,
  },
}
```

### 5. Production Build

```bash
cd frontend
npm run build     # Outputs to dist/
```

Deploy the `dist/` directory to AWS Amplify, S3 + CloudFront, or any static hosting platform.

---

## ☁️ AWS Services Used

| Service | Purpose |
|:--------|:--------|
| **AWS Lambda** (ARM64, Python 3.14) | Serverless compute for Voice RAG and Scheme Filtering |
| **Amazon Bedrock Knowledge Bases** | RAG vector search over official government PDFs |
| **Amazon Titan Text Embeddings v1** | Semantic embedding model for document indexing |
| **Amazon Nova Pro / Lite** | LLM inference for answer generation |
| **Amazon Polly** (Neural Kajal) | Hindi/Indian English speech synthesis |
| **AWS Translate** | Real-time translation across 8 Indian languages |
| **Amazon DynamoDB** | NoSQL storage for scheme data and session management |
| **Amazon S3** | Private storage for official PDFs and cached audio |
| **Amazon API Gateway** (HTTP v2) | REST API routing with CORS |
| **AWS Amplify** | Frontend hosting with CI/CD and CloudFront CDN |
| **AWS SAM** | Infrastructure-as-Code for all backend resources |

---

## 📚 Official Scheme PDFs Indexed

The Bedrock Knowledge Base currently indexes the following official ministry documents:

1. **PM-KISAN** — Revised Operational Guidelines (Ministry of Agriculture)
2. **PM-KUSUM** — Solar Energy Scheme Guidelines (Ministry of New & Renewable Energy)
3. **Ayushman Bharat PM-JAY** — Health Coverage Guidelines (Ministry of Health)
4. **MUDRA Yojana** — Micro-Enterprise Loan Guidelines (Ministry of Finance)
5. **National Scholarship Portal** — Scholarship Guidelines (Ministry of Education)

---

## 🔒 Security

- **S3 buckets** are private with AES-256 encryption; documents are accessed only through time-limited pre-signed URLs
- **IAM policies** follow least-privilege principles — each Lambda has only the permissions it needs
- **No hardcoded credentials** — all sensitive values are managed through SAM parameters and environment variables
- **CORS** is configured to restrict API access to authorized origins
- **Session TTL** — DynamoDB sessions auto-expire after 24 hours

---

## 📖 Documentation

| Document | Description |
|:---------|:------------|
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Detailed system architecture with Mermaid diagrams |
| [`docs/PROJECT_DOCUMENTATION.md`](docs/PROJECT_DOCUMENTATION.md) | Comprehensive technical documentation |
| [`docs/CONTRIBUTION_SUMMARY.md`](docs/CONTRIBUTION_SUMMARY.md) | Team contribution breakdown for management |
| [`docs/DEMO_SCRIPT.md`](docs/DEMO_SCRIPT.md) | 3-minute hackathon demo script with timing |

---

## 🗺️ Roadmap

- [ ] **WhatsApp Integration** — Enable citizens to ask questions via WhatsApp using Amazon Pinpoint
- [ ] **Aadhaar-Linked Auto-Apply** — Start application processes directly from JanKalyan
- [ ] **State-Level Scheme Expansion** — Index state government scheme PDFs (700+ schemes)
- [ ] **Amazon Nova LLM** — Enable full generative conversational follow-ups when model access is approved
- [ ] **Offline Mode** — Progressive Web App (PWA) support for low-connectivity areas

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

<p align="center">
  <strong>JanKalyan (जनकल्याण)</strong> — Empowering every Indian citizen to discover their rights, in their language.
  <br>
  Built with ❤️ using AWS Serverless
</p>
