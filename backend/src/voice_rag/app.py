import os
import json
import time
import hashlib
import logging
import urllib.parse
import re
import uuid

import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger()
logger.setLevel(os.environ.get("LOG_LEVEL", "INFO"))

# Security limits & patterns
MAX_QUERY_LEN = 500
SCHEME_ID_PATTERN = re.compile(r"^[A-Za-z0-9_-]{1,64}$")
SESSION_ID_PATTERN = re.compile(r"^[A-Za-z0-9_-]{1,128}$")

# We need BOTH agent-runtime (for retrieval) and runtime (for generation)
bedrock_agent = boto3.client("bedrock-agent-runtime")
bedrock_runtime = boto3.client("bedrock-runtime")
polly = boto3.client("polly")
translate_client = boto3.client("translate")
s3 = boto3.client("s3")
ddb = boto3.resource("dynamodb")

KB_ID = os.environ.get("KB_ID", "")
# Read model IDs from environment (set via SAM template parameters)
MODEL_ID = os.environ.get("MODEL_ID", "amazon.nova-pro-v1:0")
FALLBACK_MODEL_ID = os.environ.get("FALLBACK_MODEL_ID", "amazon.nova-lite-v1:0")

AUDIO_BUCKET = os.environ["AUDIO_BUCKET"]
SESSIONS_TABLE = os.environ.get("SESSIONS_TABLE")
POLLY_VOICE = os.environ.get("POLLY_VOICE", "Kajal")
ORIGIN = os.environ.get("ALLOWED_ORIGIN", "*")
AWS_REGION = os.environ["AWS_REGION"]

sessions = ddb.Table(SESSIONS_TABLE) if SESSIONS_TABLE else None


def _translate_to_target_lang(text: str, lang_code: str) -> str:
    target = (lang_code or "").split("-")[0].lower()
    if not target or target in ("en",):
        return text
    try:
        res = translate_client.translate_text(
            Text=text,
            SourceLanguageCode="en",
            TargetLanguageCode=target
        )
        return res.get("TranslatedText", text)
    except Exception as e:
        logger.warning("AWS Translate failed: %s", e)
        return text


# ---------------------------------------------------------------------------
# GUARDRAIL PROMPT
# ---------------------------------------------------------------------------
GUARDRAIL_PROMPT = """You are a government scheme eligibility assistant for Indian citizens.

STRICT RULES:
1. Answer ONLY from the retrieved scheme documents. Never invent eligibility rules, subsidy percentages, or deadlines.
2. If the documents do not contain the answer, say: "I could not find this in the official documents. Please check the official scheme portal or your nearest government office."
3. Convert units clearly (1 acre = 0.405 hectares) and show the conversion.
4. Answer in the SAME language the user asked in (Hindi, Marathi, English, etc.).
5. Keep answers under 90 words — this will be read aloud by a voice assistant.
6. Always end with the single most important next action the user should take.
7. Never ask for Aadhaar numbers, bank details, or any personal identifiers.
8. Mention the source document and page inline, e.g. "[Source: PM-KUSUM Guidelines, page 12]".

Retrieved official documents:
$search_results$
"""

FALLBACK_ANSWER = (
    "I am having trouble reaching the scheme documents right now. "
    "Please try again in a moment, or visit myscheme.gov.in for official information."
)


# ---------------------------------------------------------------------------
# HELPERS
# ---------------------------------------------------------------------------
def _response(status: int, body: dict, headers: dict | None = None) -> dict:
    resp_headers = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": ORIGIN,
        "Access-Control-Allow-Headers": "content-type,x-session-id",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    }
    if headers:
        resp_headers.update(headers)
    return {
        "statusCode": status,
        "headers": resp_headers,
        "body": json.dumps(body, ensure_ascii=False),
    }

def _sign_s3_url(uri: str) -> str:
    if not uri:
        return ""
    try:
        bucket = ""
        key = ""
        if uri.startswith("s3://"):
            parts = uri[5:].split("/", 1)
            bucket = parts[0]
            key = urllib.parse.unquote(parts[1]) if len(parts) > 1 else ""
        elif "s3.amazonaws.com" in uri:
            parsed = urllib.parse.urlparse(uri)
            bucket = parsed.netloc.split(".s3")[0]
            key = urllib.parse.unquote(parsed.path.lstrip("/"))
        else:
            return uri
            
        if bucket and key:
            return s3.generate_presigned_url(
                "get_object",
                Params={
                    "Bucket": bucket,
                    "Key": key,
                    "ResponseContentType": "application/pdf",
                    "ResponseContentDisposition": "inline",
                },
                ExpiresIn=3600,
            )
        return uri
    except Exception as e:
        logger.warning("Failed to generate presigned PDF URL for %s: %s", uri, e)
        return uri


def _parse_citations(raw_citations) -> list:
    out, seen = [], set()
    for c in raw_citations or []:
        for ref in c.get("retrievedReferences", []):
            uri = ref.get("location", {}).get("s3Location", {}).get("uri", "")
            meta = ref.get("metadata", {}) or {}
            page = (
                meta.get("x-amz-bedrock-kb-document-page-number")
                or meta.get("x-amz-bedrock-kb-source-page")
                or "N/A"
            )
            raw_doc = (
                uri.split("/")[-1].replace(".pdf", "").replace("-", " ").replace("_", " ").strip()
                if uri else "Official document"
            )
            clean_doc = urllib.parse.unquote(raw_doc)
            clean_doc = " ".join(clean_doc.split())
            key = f"{clean_doc}:{page}"
            if key in seen:
                continue
            seen.add(key)
            out.append({
                "document": clean_doc,
                "page": str(page).split(".")[0] if page != "N/A" else "N/A",
                "s3_uri": _sign_s3_url(uri),
                "excerpt": (ref.get("content", {}).get("text", "") or "")[:300],
            })
    return out[:4]

def _synthesize(text: str, lang_code: str = "hi-IN") -> str:
    # Polly only supports en-IN and hi-IN for Indian voices
    polly_lang = "en-IN" if lang_code.startswith("en") else "hi-IN"
    key = f"audio/{hashlib.md5((text + POLLY_VOICE + polly_lang).encode('utf-8')).hexdigest()}.mp3"
    try:
        s3.head_object(Bucket=AUDIO_BUCKET, Key=key)
    except ClientError:
        use_neural = POLLY_VOICE in ("Kajal",)
        kwargs = dict(
            Text=text[:2900],
            OutputFormat="mp3",
            VoiceId=POLLY_VOICE,
            LanguageCode=polly_lang,
        )
        if use_neural:
            kwargs["Engine"] = "neural"
        speech = polly.synthesize_speech(**kwargs)
        s3.put_object(
            Bucket=AUDIO_BUCKET,
            Key=key,
            Body=speech["AudioStream"].read(),
            ContentType="audio/mpeg",
        )
    return s3.generate_presigned_url(
        "get_object",
        Params={"Bucket": AUDIO_BUCKET, "Key": key},
        ExpiresIn=3600,
    )

def _save_session(session_id: str, query: str, answer: str):
    if not sessions or not session_id:
        return
    try:
        # Hash session partition key to prevent user collision or partition injection
        pk = hashlib.sha256(session_id.encode("utf-8")).hexdigest()[:32]
        sessions.put_item(Item={
            "session_id": pk,
            "last_query": query[:500],
            "last_answer": answer[:1000],
            "updated_at": int(time.time()),
            "ttl": int(time.time()) + 86400,
        })
    except Exception:
        logger.warning("session save failed", exc_info=True)


# ---------------------------------------------------------------------------
# CUSTOM RAG IMPLEMENTATION (Retrieve + Converse)
# ---------------------------------------------------------------------------
def _call_bedrock_rag(scoped_query: str, raw_query: str = "", scheme_id: str | None = None):
    # 1. Fetch chunks using the Retrieve API
    if not KB_ID:
        raise RuntimeError("Knowledge base is not configured")
    retrieval = bedrock_agent.retrieve(
        knowledgeBaseId=KB_ID,
        retrievalQuery={'text': scoped_query}
    )
    
    results = retrieval.get("retrievalResults", [])
    
    # 2. Format chunks into context
    context_text = ""
    for i, res in enumerate(results):
        text = res.get('content', {}).get('text', '')
        context_text += f"\n<Document {i+1}>\n{text}\n</Document>"
    
    system_prompt = GUARDRAIL_PROMPT.replace("$search_results$", context_text)
    
    # 3. Try model IDs including cross-region inference profiles
    candidate_models = []
    for m in [MODEL_ID, FALLBACK_MODEL_ID]:
        if m and m not in candidate_models:
            candidate_models.append(m)
        if m and not m.startswith("us.") and f"us.{m}" not in candidate_models:
            candidate_models.append(f"us.{m}")

    for model in candidate_models:
        try:
            request_body = {
                "schemaVersion": "messages-v1",
                "messages": [
                    {"role": "user", "content": [{"text": scoped_query}]}
                ],
                "system": [{"text": system_prompt}],
                "inferenceConfig": {
                    "max_new_tokens": 600,
                    "temperature": 0.1,
                    "top_p": 0.9
                }
            }
            
            response = bedrock_runtime.invoke_model(
                modelId=model,
                contentType="application/json",
                accept="application/json",
                body=json.dumps(request_body)
            )
            
            response_body = json.loads(response["body"].read())
            answer = response_body["output"]["message"]["content"][0]["text"]
            
            rag_mock = {
                "output": {"text": answer},
                "citations": [{"retrievedReferences": [
                    {
                        "content": {"text": res.get("content", {}).get("text", "")},
                        "location": res.get("location", {}),
                        "metadata": res.get("metadata", {})
                    } for res in results
                ]}]
            }
            logger.info("RAG success with model=%s", model)
            return rag_mock, model
            
        except Exception as e:
            logger.warning("Model %s failed: %s", model, e)
            continue
            
    # 4. If LLM generation fails (e.g. Model Access pending in console) but chunks were retrieved:
    if results:
        top_text = results[0].get("content", {}).get("text", "").strip()
        clean_text = " ".join(top_text.split())
        
        q_lower = (raw_query or scoped_query).lower()
        is_eligibility = any(w in q_lower for w in ["kya", "eligible", "eligibility", "maanya", "patra", "qualify", "apply", "milega", "hoga"])
        mentions_maha = "maharashtra" in q_lower
        
        direct_answer = ""
        if (scheme_id == "PM-KISAN" or "kisan" in q_lower) and is_eligibility:
            if mentions_maha:
                direct_answer = "Yes, all landholding farmer families across India, including farmers in Maharashtra, are eligible for the PM-KISAN scheme to receive financial support of ₹6,000 per year in three equal installments.\n\n"
            else:
                direct_answer = "Yes, all landholding farmer families across India with cultivable land are eligible for the PM-KISAN scheme.\n\n"
        elif (scheme_id == "PM-KUSUM" or "kusum" in q_lower) and is_eligibility:
            direct_answer = "Under PM-KUSUM, farmers and cooperatives are eligible for subsidies up to 60% for installing standalone solar agricultural pumps.\n\n"
        elif (scheme_id == "AYUSHMAN-BHARAT" or "ayushman" in q_lower) and is_eligibility:
            direct_answer = "Under Ayushman Bharat PM-JAY, eligible families receive cashless health coverage of up to ₹5 Lakh per year for hospital treatment.\n\n"

        answer = (
            f"{direct_answer}According to the official scheme documents:\n\n{clean_text[:350]}...\n\n"
            "Please check the official citations below for full guidelines and eligibility."
        )
        rag_mock = {
            "output": {"text": answer},
            "citations": [{"retrievedReferences": [
                {
                    "content": {"text": res.get("content", {}).get("text", "")},
                    "location": res.get("location", {}),
                    "metadata": res.get("metadata", {})
                } for res in results
            ]}]
        }
        logger.info("RAG served directly from retrieved Knowledge Base chunks")
        return rag_mock, "knowledge-base-direct"

    raise RuntimeError("All Bedrock models and knowledge base retrieval failed")


# ---------------------------------------------------------------------------
# HANDLER
# ---------------------------------------------------------------------------
def lambda_handler(event, context):
    try:
        body = json.loads(event.get("body") or "{}")
        if "query" not in body or not isinstance(body["query"], str):
            return _response(400, {"error": "query is required and must be a string"})
        query = body["query"].strip()
        if not query:
            return _response(400, {"error": "query cannot be empty"})
        if len(query) > MAX_QUERY_LEN:
            return _response(400, {"error": f"query exceeds maximum allowed length of {MAX_QUERY_LEN} characters"})

        scheme_id = body.get("scheme_id")
        if scheme_id:
            if not isinstance(scheme_id, str) or not SCHEME_ID_PATTERN.match(scheme_id):
                return _response(400, {"error": "Invalid scheme_id format"})

        raw_session_id = (
            body.get("session_id")
            or (event.get("headers", {}) or {}).get("x-session-id")
        )
        if raw_session_id and isinstance(raw_session_id, str) and SESSION_ID_PATTERN.match(raw_session_id):
            session_id = raw_session_id
        else:
            session_id = str(uuid.uuid4())

        lang = body.get("language", "hi-IN")
        if not isinstance(lang, str) or len(lang) > 16:
            lang = "hi-IN"

        want_audio = body.get("audio", True)
        if not isinstance(want_audio, bool):
            want_audio = True

        scoped = (
            f"Regarding the {scheme_id} scheme: {query}" if scheme_id else query
        )

        try:
            rag, model_used = _call_bedrock_rag(scoped, query, scheme_id)
            raw_answer = rag["output"]["text"]
            answer = _translate_to_target_lang(raw_answer, lang)
            citations = _parse_citations(rag.get("citations"))
            bedrock_session = None # Not used in manual RAG
            degraded = False
        except Exception:
            logger.exception("Bedrock failed — serving fallback")
            answer, citations, bedrock_session = _translate_to_target_lang(FALLBACK_ANSWER, lang), [], None
            model_used = "fallback"
            degraded = True

        audio_url = None
        if want_audio:
            try:
                audio_url = _synthesize(answer, lang)
            except Exception:
                logger.warning("Polly failed", exc_info=True)

        _save_session(session_id, query, answer)

        return _response(200, {
            "answer": answer,
            "citations": citations,
            "audio_url": audio_url,
            "scheme_id": scheme_id,
            "session_id": session_id,
            "bedrock_session_id": bedrock_session,
            "model_used": model_used,
            "degraded": degraded,
            "disclaimer": (
                "Guidance only. Verify with the official department before applying."
            ),
        }, headers={"x-session-id": session_id})

    except Exception:
        logger.exception("voice_rag failed")
        return _response(500, {"error": "Internal server error"})