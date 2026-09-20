# JanKalyan — 3-Minute Demo Video Script
### First Commit Hackathon Submission

> **Total Runtime Target: 3:00**
> Format: Screen recording with voiceover. No slides. Show real output.

---

## SECTION 1 — The User and the Problem [0:00 – 0:20]
**⏱️ 20 seconds | What you show: Nothing yet — just your voice over a blank browser tab or the landing page loading**

**Voiceover Script:**

> "India has over 700 central and state welfare schemes — PM-KISAN, Ayushman Bharat, MUDRA loans, scholarships. But most guidelines are 50-page English PDFs. A farmer in Maharashtra who speaks Marathi, or a daily-wage worker who speaks Tamil, has no practical way to check: *am I even eligible?*
>
> We built JanKalyan — a voice-first scheme navigator that lets citizens ask in their own language and get verified answers grounded in official government documents. No hallucination. No guesswork."

**🎬 Screen action:** The Amplify live URL (`https://main.d2l2gs67zimgc.amplifyapp.com`) finishes loading and the JanKalyan landing page is visible by the time you finish speaking.

---

## SECTION 2 — The Flow Actually Running [0:20 – 1:50]
**⏱️ 90 seconds | What you show: Live screen recording of the real product. No mockups.**

### Beat 1: Language Selection [0:20 – 0:30]
**Voiceover:**
> "The citizen picks their language. I'll choose Hindi."

**🎬 Screen action:** Scroll to the language cards. Click on **Hindi (हिन्दी)**. The entire UI — every heading, button, filter label, and scheme name — switches to Hindi instantly.

---

### Beat 2: Scheme Discovery & Filtering [0:30 – 0:50]
**Voiceover:**
> "Schemes load live from DynamoDB through our API Gateway. The citizen can filter by category, state, or land size. Watch — I'll filter for Agriculture schemes."

**🎬 Screen action:**
1. Scroll down to the scheme cards. Point out that **5 real schemes** are displayed with Hindi titles and summaries.
2. Click the **Category** filter → select **Agriculture**. Cards filter in real time.
3. Briefly hover over a scheme card showing the **match score** and **match reasons**.

---

### Beat 3: Voice Assistant — The Core Feature [0:50 – 1:35]
**Voiceover:**
> "Now the main feature. I'll open the voice assistant and ask a real question — in Hindi."

**🎬 Screen action:**
1. Click the floating **"जनकल्याण से बात करें"** (Talk to JanKalyan) button at the bottom. The voice drawer slides up.
2. Type or speak: **"मैं एक महाराष्ट्र का किसान हूँ, क्या मैं PM-KISAN योजना के लिए पात्र हूँ?"**
3. Wait for the response to appear. **Show the full response on screen:**
   - The Hindi answer confirming eligibility for ₹6,000/year.
   - The official citation card showing **"Source: RevisedPM KISANOperationalGuidelines(English)"**.
   - The audio player with **"उत्तर सुनें"** (Listen to answer).
4. Click the **[View PDF]** link. Show the official government PDF opening inline in the browser tab.
5. Go back to the assistant. Point out the **disclaimer** at the bottom: *"Guidance only. Verify with the official department."*

**Voiceover (while response loads and displays):**
> "The backend retrieves relevant passages from the actual PM-KISAN operational guidelines PDF using Amazon Bedrock Knowledge Bases. The answer is translated to Hindi via AWS Translate, and spoken aloud using Amazon Polly's neural Kajal voice. The citizen can tap 'View PDF' to read the original government document — it opens inline through a pre-signed S3 URL. The bucket itself is completely private."

---

### Beat 4: Show It Works in Another Language [1:35 – 1:50]
**Voiceover:**
> "This works across all nine languages. Let me quickly switch to Marathi."

**🎬 Screen action:**
1. Scroll up, click the **Marathi (मराठी)** language card.
2. Show the UI flip to Marathi — headings, filters, scheme names, everything.
3. Briefly show the voice drawer title is now in Marathi.

**Voiceover:**
> "Every label, scheme name, and voice response translates natively. These aren't machine-translated widgets — they're curated dictionaries for each language."

---

## SECTION 3 — Architecture [1:50 – 2:20]
**⏱️ 30 seconds | What you show: The Mermaid architecture diagram from your ARCHITECTURE.md, or a quick sketch. Keep it fast.**

**🎬 Screen action:** Switch to the architecture diagram (open `ARCHITECTURE.md` in GitHub or show a screenshot of the rendered Mermaid diagram).

**Voiceover:**
> "Everything runs on AWS, fully serverless. The frontend is hosted on Amplify with CloudFront CDN. API requests hit an HTTP API Gateway, which routes to two Lambda functions — one for scheme filtering against DynamoDB, one for the Voice RAG pipeline.
>
> The RAG Lambda queries a Bedrock Knowledge Base backed by Titan Embeddings over five official ministry PDFs in S3. Answers are translated by AWS Translate and spoken by Amazon Polly. Audio is MD5-cached in S3 so repeated questions are instant. Zero EC2 instances. Runs within AWS Free Tier."

---

## SECTION 4 — Failure Resilience + Roadmap [2:20 – 3:00]
**⏱️ 40 seconds | What you show: The system's 3-layer resilience architecture in action, then the roadmap.**

### Failure Case: 3-Layer Resilience [2:20 – 2:45]

> **Why this matters to judges:** The guidelines say *"plan the failure case in advance, because live demos break on inputs nobody prepared for."* Our system doesn't just handle one failure — it has **three cascading safety nets** built into the Lambda code. Show all three.

**🎬 Demo 1 — Input Validation (Layer 1):**
1. Open the voice assistant drawer.
2. Clear the input and hit **Ask** with no text.
3. The system immediately returns: **"query is required"** — a clean 400 validation error, not a crash or a stack trace.

**Voiceover:**
> "First layer: input validation. Empty or malformed inputs get a clean error message instantly — the Lambda catches this before it ever touches Bedrock."

**🎬 Demo 2 — Graceful AI Degradation (Layer 2):**
1. Now type a **nonsense query** like: **"xyz asdf 12345 random"**
2. The system still returns a response! Bedrock Knowledge Base retrieves the closest matching document chunks and presents them directly with citations.
3. Point out: the response says *"According to the official scheme documents..."* and still shows a PDF citation link — even though the query made no sense.

**Voiceover:**
> "Second layer: even with gibberish input, the Knowledge Base retrieves the closest matching official documents and shows them with full citations. The citizen always gets something useful — never a blank screen or a spinning loader that never resolves."

**🎬 Demo 3 — Explain the third layer (no need to trigger live):**

**Voiceover:**
> "Third layer — and this is actually running right now: if the LLM itself is unavailable, our Lambda automatically falls back to serving answers directly from retrieved Knowledge Base chunks. We built this because our AWS account doesn't currently have Nova model access enabled, but the app works perfectly anyway. The system detects the failure, switches pipelines, and the citizen never notices. That's what we mean by resilient architecture."

---

### Roadmap: What We're Building Next [2:45 – 3:00]

> **Note:** Frame this as ambition, not gaps. The judges want to know you're thinking ahead.

**Voiceover:**
> "Looking ahead — three things on the roadmap. First: **WhatsApp integration** through Amazon Pinpoint, so citizens can text their questions without needing a browser. Second: **Aadhaar-linked auto-apply**, where once a citizen is verified as eligible, they can start the application process right from JanKalyan. And third: **expanding to state-level schemes** — right now we cover five major central government schemes, but India has over 700 across all states. We'd index those PDFs into the Knowledge Base to provide truly universal scheme discovery."

**🎬 Screen action:** End on the JanKalyan landing page hero section. Pause for 2 seconds. Recording ends.

---

### What We'd Build Next [2:50 – 3:00]
**Voiceover:**
> "Next, we'd enable Nova for conversational follow-up questions, add WhatsApp integration via Amazon Pinpoint so citizens can text in their questions, and expand the Knowledge Base to cover state-level schemes beyond central government programs. Thank you."

**🎬 Screen action:** End on the landing page hero section showing the JanKalyan branding.

---

## Pre-Demo Checklist

Before you hit record, verify all of these:

- [ ] Open `https://main.d2l2gs67zimgc.amplifyapp.com` in Chrome (for Speech Recognition support).
- [ ] Clear browser cache so the page loads fresh on camera.
- [ ] Verify `/api/schemes` returns 5 schemes (open DevTools Network tab briefly).
- [ ] Pre-test the Hindi PM-KISAN query to confirm it returns a translated answer + audio + citation.
- [ ] Pre-test clicking **[View PDF]** to confirm the pre-signed URL opens the PDF inline.
- [ ] Pre-test the **empty query** failure case to confirm the clean error message.
- [ ] Close all other browser tabs and notifications to keep the recording clean.
- [ ] Set browser zoom to **100%** (or 90% if your screen is small) so the full UI is visible.

---

## Timing Cheat Sheet

| Section | Duration | Cumulative |
| :--- | :--- | :--- |
| Problem & User | 20s | 0:20 |
| Language Selection | 10s | 0:30 |
| Scheme Filtering | 20s | 0:50 |
| Voice Assistant (Core Demo) | 45s | 1:35 |
| Second Language Switch | 15s | 1:50 |
| Architecture Diagram | 30s | 2:20 |
| 3-Layer Failure Resilience | 25s | 2:45 |
| Roadmap & Close | 15s | 3:00 |

---
*Prepared for First Commit Hackathon demo recording.*
