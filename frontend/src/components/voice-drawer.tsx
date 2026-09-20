import {
  AlertTriangle,
  FileText,
  HelpCircle,
  Loader2,
  Mic,
  MicOff,
  Pause,
  Play,
  RotateCcw,
  Send,
  Sparkles,
  Volume2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { getUITranslations, type Language } from "@/data/jankalyan";
import { useChat } from "@/hooks/useChat";
import type { ChatResponse } from "@/lib/api";

type VoiceDrawerProps = {
  language: Language;
  schemeId?: string;
  schemeName?: string;
  autoStart?: boolean;
  onClose: () => void;
};

// Sample questions tailored to language
const sampleQuestionsByLang: Record<string, string[]> = {
  English: [
    "Am I eligible for PM-KISAN scheme?",
    "What documents are required to apply?",
    "How much financial subsidy will I receive?",
  ],
  Hindi: [
    "क्या मैं पीएम-किसान योजना के लिए पात्र हूँ?",
    "आवेदन करने के लिए कौन से दस्तावेज़ चाहिए?",
    "इस योजना में कितनी सब्सिडी या सहायता मिलती है?",
  ],
  Bengali: [
    "আমি কি এই প্রকল্পের জন্য যোগ্য?",
    "আবেদনের জন্য কোন নথিপত্র লাগবে?",
    "কত টাকা আর্থিক সুবিধা পাওয়া যাবে?",
  ],
  Marathi: [
    "मी या योजनेसाठी पात्र आहे का?",
    "अर्ज करण्यासाठी कोणती कागदपत्रे लागतील?",
    "किती अनुदान किंवा आर्थिक मदत मिळते?",
  ],
  Telugu: [
    "నేను ఈ పథకానికి అర్హుడనా?",
    "దరఖాస్తుకు ఏ పత్రాలు అవసరం?",
    "ఎంత ఆర్థిక సహాయం లభిస్తుంది?",
  ],
  Tamil: [
    "நான் இந்த திட்டத்திற்கு தகுதியானவரா?",
    "விண்ணப்பிக்க என்ன ஆவணங்கள் தேவை?",
    "எவ்வளவு நிதி உதவி கிடைக்கும்?",
  ],
  Gujarati: [
    "શું હું આ યોજના માટે પાત્ર છું?",
    "અરજી કરવા કયા દસ્તાવેજોની જરૂર પડશે?",
    "કેટલી સબસિડી કે સહાય મળે છે?",
  ],
  Urdu: [
    "کیا میں اس اسکیم کے لیے اہل ہوں؟",
    "درخواست کے لیے کون سے دستاویزات درکار ہیں؟",
    "کتنی مالی امداد ملتی ہے؟",
  ],
  Kannada: [
    "ನಾನು ಈ ಯೋಜನೆಗೆ ಅರ್ಹನೇ?",
    "ಅರ್ಜಿ ಸಲ್ಲಿಸಲು ಯಾವ ದಾಖಲೆಗಳು ಬೇಕು?",
    "ಎಷ್ಟು ಹಣಕಾಸಿನ ನೆರವು ಸಿಗುತ್ತದೆ?",
  ],
};

export function VoiceDrawer({
  language,
  schemeId,
  schemeName,
  autoStart = false,
  onClose,
}: VoiceDrawerProps) {
  const [query, setQuery] = useState("");
  const [conversation, setConversation] = useState<
    { role: "user" | "assistant"; text: string; data?: ChatResponse }[]
  >([]);
  const [playing, setPlaying] = useState(false);
  const [recognizing, setRecognizing] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [interimQuery, setInterimQuery] = useState("");
  const [isVoiceTriggered, setIsVoiceTriggered] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  const t = getUITranslations(language.name);
  const chat = useChat();

  // Close on Escape
  useEffect(() => {
    closeRef.current?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // Auto-scroll when conversation updates
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [conversation, chat.isPending]);

  // Clean up audio and speech recognition on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  const playAudio = useCallback((url: string) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.addEventListener("ended", () => setPlaying(false));
    audio.addEventListener("error", () => {
      setPlaying(false);
    });
    audio.play().catch(() => {
      setPlaying(false);
    });
    setPlaying(true);
  }, []);

  const toggleAudio = useCallback(() => {
    if (audioRef.current) {
      if (playing) {
        audioRef.current.pause();
        setPlaying(false);
      } else {
        audioRef.current.play().catch(() => setPlaying(false));
        setPlaying(true);
      }
      return;
    }

    if ("speechSynthesis" in window) {
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        setPlaying(false);
      }
    }
  }, [playing]);

  const speakText = useCallback(
    (text: string, audioUrl?: string | null) => {
      if (audioUrl) {
        playAudio(audioUrl);
        return;
      }
      // Browser Web Speech API fallback
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = language.langCode;
        utterance.onstart = () => setPlaying(true);
        utterance.onend = () => setPlaying(false);
        utterance.onerror = () => setPlaying(false);
        window.speechSynthesis.speak(utterance);
      }
    },
    [language.langCode, playAudio],
  );

  const handleSubmitWithText = useCallback(
    (rawText: string, fromVoice = false) => {
      const q = rawText.trim();
      if (!q || chat.isPending) return;

      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
        setRecognizing(false);
      }

      setConversation((prev) => [...prev, { role: "user", text: q }]);
      setQuery("");
      setInterimQuery("");
      setSpeechError(null);

      chat.mutate(
        { query: q, scheme_id: schemeId, language: language.langCode, audio: true },
        {
          onSuccess: (data) => {
            setConversation((prev) => [...prev, { role: "assistant", text: data.answer, data }]);
            // If the query was triggered by voice, speak the answer back aloud!
            if (fromVoice || isVoiceTriggered) {
              if (data.audio_url) {
                playAudio(data.audio_url);
              } else {
                speakText(data.answer);
              }
            }
          },
          onError: (err) => {
            setConversation((prev) => [
              ...prev,
              {
                role: "assistant",
                text: `Sorry, I could not get a response. ${err.message}`,
              },
            ]);
          },
        },
      );

      setTimeout(() => inputRef.current?.focus(), 50);
    },
    [chat, schemeId, language.langCode, isVoiceTriggered, playAudio, speakText],
  );

  const handleSubmit = useCallback(() => {
    handleSubmitWithText(query, false);
  }, [query, handleSubmitWithText]);

  // Robust speech-to-text recognition
  const stopSpeechRecognition = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
    setRecognizing(false);
    setInterimQuery("");
  }, []);

  const startSpeechRecognition = useCallback(async () => {
    setSpeechError(null);

    // 1. Check browser speech support
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechError(
        "Voice input requires Web Speech API support. Please use Google Chrome, Microsoft Edge, Safari, or Brave.",
      );
      return;
    }

    // 2. Request mic permission proactively to trigger browser dialog if needed
    if (navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
      } catch (err: unknown) {
        const error = err as { name?: string };
        if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
          setSpeechError(
            "Microphone access blocked. Please click the lock/camera icon in your address bar and allow microphone permissions.",
          );
          setRecognizing(false);
          return;
        }
      }
    }

    // 3. Stop existing recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }

    try {
      const rec = new SpeechRecognition();
      rec.lang = language.langCode || "hi-IN";
      // Setting continuous to false prevents the browser from dropping the websocket and throwing "network" error
      rec.continuous = false;
      rec.interimResults = true;
      rec.maxAlternatives = 1;

      let capturedText = "";
      let retried = false;

      rec.onstart = () => {
        setRecognizing(true);
        setIsVoiceTriggered(true);
        setSpeechError(null);
        setInterimQuery("");
        capturedText = "";
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rec.onresult = (event: any) => {
        let finalStr = "";
        let interimStr = "";
        for (let i = 0; i < event.results.length; i++) {
          const res = event.results[i];
          if (res.isFinal) {
            finalStr += res[0].transcript + " ";
          } else {
            interimStr += res[0].transcript;
          }
        }
        const fullTranscript = (finalStr + interimStr).trim();
        if (fullTranscript) {
          capturedText = fullTranscript;
          setQuery(fullTranscript);
          setInterimQuery(interimStr);
        }
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rec.onerror = (event: any) => {
        console.warn("Speech recognition error:", event.error);
        if (event.error === "no-speech") {
          // Normal timeout when silence, keep listening or prompt user
          setRecognizing(false);
          return;
        }

        if (event.error === "network") {
          // If a regional dialect caused the network error, retry once with hi-IN or en-IN
          if (!retried && rec.lang !== "hi-IN" && rec.lang !== "en-IN") {
            retried = true;
            try {
              rec.lang = "hi-IN";
              rec.start();
              return;
            } catch {
              // ignore
            }
          }

          // Check if running on Brave or behind an ad blocker
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const isBrave = Boolean((navigator as any).brave);
          if (isBrave) {
            setSpeechError(
              "Brave browser blocks speech recognition by default. To enable: open brave://settings/system and toggle 'Use Google services for speech recognition', or use Google Chrome / Microsoft Edge.",
            );
          } else {
            setSpeechError(
              "Speech recognition network error. The browser speech server could not be reached. Please check your internet/VPN, or tap a suggested question below.",
            );
          }
          setRecognizing(false);
          return;
        }

        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          setSpeechError("Microphone permission denied. Please allow microphone in browser settings.");
          setRecognizing(false);
        } else if (event.error === "language-not-supported") {
          console.warn(`Language ${language.langCode} not supported for STT, falling back to hi-IN`);
          try {
            rec.lang = "hi-IN";
            rec.start();
            return;
          } catch {
            setSpeechError(`Voice input is not supported in ${language.name} by this browser.`);
            setRecognizing(false);
          }
        } else if (event.error === "audio-capture") {
          setSpeechError("No microphone found. Please connect an audio input device.");
          setRecognizing(false);
        } else {
          setRecognizing(false);
        }
      };

      rec.onend = () => {
        setRecognizing(false);
        setInterimQuery("");
        // If a valid question was spoken and captured, automatically submit it to RAG!
        if (capturedText && capturedText.trim().length > 2) {
          const toSubmit = capturedText.trim();
          capturedText = "";
          handleSubmitWithText(toSubmit, true);
        }
      };

      recognitionRef.current = rec;
      rec.start();
    } catch (err) {
      console.error("Speech recognition startup error:", err);
      setRecognizing(false);
      setSpeechError("Could not start microphone. Please try again or type your question below.");
    }
  }, [language.langCode, language.name, handleSubmitWithText]);

  const toggleSpeechRecognition = useCallback(() => {
    if (recognizing) {
      stopSpeechRecognition();
    } else {
      startSpeechRecognition();
    }
  }, [recognizing, stopSpeechRecognition, startSpeechRecognition]);

  // Handle auto-start on mount if requested
  useEffect(() => {
    if (autoStart) {
      const timer = setTimeout(() => {
        startSpeechRecognition();
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [autoStart, startSpeechRecognition]);

  // Find the last assistant message
  const lastAssistantMsg = [...conversation].reverse().find((m) => m.role === "assistant");
  const lastAudioUrl = lastAssistantMsg?.data?.audio_url;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#182c25]/55 p-0 backdrop-blur-sm sm:items-center sm:p-5"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="flex h-[88vh] max-h-[88dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-[2rem] border border-[#e0d1b8] bg-[#fffaf0] shadow-2xl sm:h-[82vh] sm:max-h-[82vh] sm:rounded-[2rem]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="voice-dialog-title"
      >
        {/* Header */}
        <div className="shrink-0 flex items-start justify-between border-b border-[#eadfce] bg-[#f3e8d3] px-6 py-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.16em] text-[#b85c38]">
              {schemeName ? t.drawerEligibilityTitle : t.drawerVoiceTitle}
            </p>
            <h2 id="voice-dialog-title" className="mt-2 text-2xl font-semibold tracking-[-.04em] text-[#263d35]">
              {schemeName ?? t.drawerTitle}
            </h2>
            <p className="mt-1 text-sm text-[#69736d]">{t.drawerReplyIn} {language.name}.</p>
          </div>
          <button
            ref={closeRef}
            type="button"
            aria-label="Close voice help"
            onClick={onClose}
            className="rounded-xl p-2 text-[#52685d] transition hover:bg-[#eadcc3]"
          >
            <X size={20} />
          </button>
        </div>

        {/* Conversation area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-5">
          <div className="space-y-3">
            {/* Initial prompt */}
            {conversation.length === 0 && (
              <div className="space-y-4">
                <div className="max-w-[92%] rounded-2xl rounded-bl-md border border-[#ded1b9] bg-[#f8f0e2] p-4">
                  <p className="text-[1.1rem] font-semibold leading-7 text-[#263d35]">
                    {language.greeting}.{" "}
                    {schemeName
                      ? `Ask me anything about ${schemeName} — eligibility, benefits, documents, or next steps.`
                      : language.supportLine}
                  </p>
                  <div className="mt-3 flex items-center gap-2 text-xs font-bold text-[#897d6c]">
                    <Volume2 size={15} className="text-[#b85c38]" /> {t.drawerReadyHelp} {language.name}
                  </div>
                </div>

                {/* Quick Suggestion Chips */}
                <div className="space-y-2">
                  <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#8a7f6e]">
                    <Sparkles size={14} className="text-[#b85c38]" />
                    {language.name === "Hindi" ? "सुझाए गए सवाल (क्लिक करें):" : "Suggested questions (tap to ask):"}
                  </p>
                  <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                    {(sampleQuestionsByLang[language.name] || sampleQuestionsByLang.English).map((chip, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSubmitWithText(chip, false)}
                        disabled={chat.isPending}
                        className="rounded-xl border border-[#d9cbb2] bg-[#fdf8ee] px-3.5 py-2.5 text-left text-xs font-semibold text-[#3b4c42] shadow-xs transition hover:border-[#b85c38] hover:bg-[#faeed6] disabled:opacity-50"
                      >
                        "{chip}"
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Messages */}
            {conversation.map((msg, i) =>
              msg.role === "user" ? (
                <div key={i} className="ml-auto max-w-[86%] rounded-2xl rounded-br-md bg-[#263d35] p-4 text-[#fff4d9]">
                  <p className="text-base leading-7">{msg.text}</p>
                  <p className="mt-3 text-[11px] font-bold uppercase tracking-widest text-[#bed0bb]">
                    {t.drawerYourQuestion} · {language.name}
                  </p>
                </div>
              ) : (
                <div key={i} className="max-w-[92%] space-y-3">
                  <div className="rounded-2xl rounded-bl-md border border-[#ded1b9] bg-[#f8f0e2] p-4">
                    <p className="whitespace-pre-line text-[1.05rem] font-semibold leading-7 text-[#263d35]">
                      {msg.text}
                    </p>
                    {msg.data?.degraded && (
                      <div className="mt-3 flex items-center gap-2 rounded-lg bg-[#fef5f5] px-3 py-2 text-xs font-bold text-[#b83838]">
                        <AlertTriangle size={14} /> Response from official knowledge base.
                      </div>
                    )}
                    <div className="mt-3 flex items-center justify-between border-t border-[#eadfce]/60 pt-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-[#897d6c]">
                        <Volume2 size={15} className="text-[#b85c38]" /> {t.drawerAnswerIn} {language.name}
                      </div>
                      <button
                        type="button"
                        onClick={() => speakText(msg.text, msg.data?.audio_url)}
                        className="inline-flex items-center gap-1 rounded-lg bg-[#edd8b6] px-2.5 py-1 text-xs font-bold text-[#71462d] transition hover:bg-[#e4ca9e]"
                      >
                        <Volume2 size={13} /> {t.heroSpeakInstead}
                      </button>
                    </div>
                  </div>

                  {/* Citations */}
                  {msg.data?.citations && msg.data.citations.length > 0 && (
                    <div className="space-y-1.5">
                      {msg.data.citations.map((cit, ci) => (
                        <div key={ci} className="rounded-xl border border-[#d9c4a0] bg-[#f7e9cd] px-4 py-2.5 text-xs font-semibold leading-5 text-[#6e5943]">
                          <FileText size={12} className="mr-1.5 inline text-[#b85c38]" />
                          <span className="font-bold">Source:</span> {cit.document} {cit.page !== "N/A" ? `· Page ${cit.page}` : ""}
                          {cit.s3_uri && (
                            <a
                              href={cit.s3_uri}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-2 text-[#b85c38] underline hover:text-[#99492e]"
                            >
                              [View PDF]
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Disclaimer */}
                  {msg.data?.disclaimer && (
                    <p className="text-[11px] italic text-[#8b887d]">{msg.data.disclaimer}</p>
                  )}
                </div>
              ),
            )}

            {/* Loading indicator */}
            {chat.isPending && (
              <div className="max-w-[92%] rounded-2xl rounded-bl-md border border-[#ded1b9] bg-[#f8f0e2] p-4">
                <div className="flex items-center gap-3">
                  <Loader2 size={18} className="animate-spin text-[#b85c38]" />
                  <p className="text-sm font-semibold text-[#69736d]">{t.loadingSchemesSub}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Audio player bar */}
        {lastAssistantMsg && (
          <div className="mx-6 mb-3 shrink-0 flex items-center gap-4 rounded-2xl border border-[#ded1b9] bg-[#f8f0e2] p-3.5">
            <button
              type="button"
              aria-label={playing ? "Pause audio" : "Play audio"}
              onClick={() => {
                if (lastAudioUrl) {
                  if (!audioRef.current?.src || audioRef.current.src !== lastAudioUrl) {
                    playAudio(lastAudioUrl);
                  } else {
                    toggleAudio();
                  }
                } else {
                  speakText(lastAssistantMsg.text);
                }
              }}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#b85c38] text-white transition hover:bg-[#99492e]"
            >
              {playing ? <Pause size={17} /> : <Play size={17} fill="currentColor" />}
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-[#394b41]">
                {playing
                  ? (language.name === "Hindi" ? "उत्तर सुनाया जा रहा है..." : "Playing answer aloud...")
                  : (language.name === "Hindi" ? "उत्तर सुनें (आवाज़ में)" : "Listen to answer aloud")}
              </p>
              <div className="mt-2 flex h-3.5 items-center gap-1">
                {Array.from({ length: 22 }, (_, index) => (
                  <span
                    key={index}
                    className={`w-1 rounded-full ${playing ? "bg-[#b85c38]" : "bg-[#c9b99f]"}`}
                    style={{ height: `${5 + (index % 4) * 2.5}px` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Speech Error Banner */}
        {speechError && (
          <div className="mx-6 mb-2 flex items-start justify-between gap-3 rounded-xl border border-[#f3c1b6] bg-[#fef2f0] p-3 text-xs text-[#9d3623]">
            <div className="flex items-start gap-2">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-[#c24128]" />
              <p className="leading-5">{speechError}</p>
            </div>
            <button
              type="button"
              onClick={startSpeechRecognition}
              className="inline-flex shrink-0 items-center gap-1 rounded-md bg-[#fbdcd6] px-2 py-1 font-bold text-[#8a2a18] hover:bg-[#f6c3b9]"
            >
              <RotateCcw size={12} /> Retry
            </button>
          </div>
        )}

        {/* Live Voice Status Indicator */}
        {recognizing && (
          <div className="mx-6 mb-2 flex flex-col gap-1.5 rounded-xl border border-[#e5c7a4] bg-[#fdf5e7] p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-[#b85c38]">
                <span className="relative flex h-3 w-3">
                  <span className="jr-pulse-ring absolute inset-0 rounded-full bg-[#b85c38]" />
                  <span className="relative h-3 w-3 rounded-full bg-[#b85c38]" />
                </span>
                <span>
                  {language.name === "Hindi" ? "सुन रहा हूँ... बोलिए" : `Listening in ${language.name}... Speak now`}
                </span>
              </div>
              <button
                type="button"
                onClick={stopSpeechRecognition}
                className="text-xs font-bold text-[#8a7258] underline hover:text-[#524433]"
              >
                Stop
              </button>
            </div>
            {query && (
              <div className="mt-1 flex items-center justify-between gap-2 border-t border-[#ebdac4] pt-2 text-xs text-[#394a40]">
                <span className="truncate italic font-medium">"{query}"</span>
                <button
                  type="button"
                  onClick={() => handleSubmitWithText(query, true)}
                  className="shrink-0 rounded-md bg-[#b85c38] px-2 py-1 font-bold text-white shadow-xs hover:bg-[#9e4a2b]"
                >
                  Send now
                </button>
              </div>
            )}
          </div>
        )}

        {/* Input area */}
        <div className="shrink-0 border-t border-[#eadfce] bg-[#f3e8d3] px-6 py-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
            className="flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                schemeName
                  ? `Ask about ${schemeName}…`
                  : `${t.drawerPlaceholder}...`
              }
              disabled={chat.isPending}
              className="min-w-0 flex-1 rounded-xl border border-[#d8ceb8] bg-[#fffaf0] px-4 py-3 text-sm font-semibold text-[#263d35] placeholder:text-[#b0a890] outline-none focus:border-[#b85c38] disabled:opacity-50"
              data-testid="input-voice-query"
            />
            {/* Mic button for voice input */}
            <button
              type="button"
              onClick={toggleSpeechRecognition}
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition ${
                recognizing
                  ? "bg-[#b85c38] text-white shadow-lg animate-pulse"
                  : "border border-[#b9935d] bg-[#f7e7c5] text-[#71462d] hover:bg-[#f9edda]"
              }`}
              title={recognizing ? "Stop listening" : "Speak your question"}
              aria-label="Voice input"
              data-testid="button-mic-input"
            >
              {recognizing ? <MicOff size={19} /> : <Mic size={19} />}
            </button>
            <button
              type="submit"
              disabled={!query.trim() || chat.isPending}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#263d35] text-[#fff4d9] transition hover:bg-[#36564a] disabled:opacity-40"
              aria-label={t.drawerAskButton}
              data-testid="button-send-query"
            >
              {chat.isPending ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Send size={18} />
              )}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}