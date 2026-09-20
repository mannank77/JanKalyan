import {
  AlertTriangle,
  FileText,
  Loader2,
  Mic,
  MicOff,
  Pause,
  Play,
  Send,
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
  onClose: () => void;
};

export function VoiceDrawer({ language, schemeId, schemeName, onClose }: VoiceDrawerProps) {
  const [query, setQuery] = useState("");
  const [conversation, setConversation] = useState<
    { role: "user" | "assistant"; text: string; data?: ChatResponse }[]
  >([]);
  const [playing, setPlaying] = useState(false);
  const [recognizing, setRecognizing] = useState(false);
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

  const handleSubmit = useCallback(() => {
    const q = query.trim();
    if (!q || chat.isPending) return;

    if (recognizing && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      setRecognizing(false);
    }

    setConversation((prev) => [...prev, { role: "user", text: q }]);
    setQuery("");

    chat.mutate(
      { query: q, scheme_id: schemeId, language: language.langCode, audio: true },
      {
        onSuccess: (data) => {
          setConversation((prev) => [...prev, { role: "assistant", text: data.answer, data }]);
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

    // Refocus the input
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [query, chat, schemeId, language.langCode, recognizing]);

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
    audio.addEventListener("error", () => setPlaying(false));
    audio.play();
    setPlaying(true);
  }, []);

  const toggleAudio = useCallback(() => {
    if (audioRef.current) {
      if (playing) {
        audioRef.current.pause();
        setPlaying(false);
      } else {
        audioRef.current.play();
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

  // Toggle browser speech-to-text recognition
  const toggleSpeechRecognition = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice input is not supported in this browser. Please use Chrome, Edge, or Safari.");
      return;
    }

    if (recognizing) {
      try {
        recognitionRef.current?.stop();
      } catch {
        // ignore
      }
      setRecognizing(false);
      return;
    }

    try {
      const rec = new SpeechRecognition();
      rec.lang = language.langCode;
      rec.continuous = false;
      rec.interimResults = true;

      rec.onstart = () => setRecognizing(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rec.onresult = (event: any) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const transcript = Array.from(event.results).map((r: any) => r[0].transcript).join("");
        setQuery(transcript);
      };
      rec.onerror = () => {
        setRecognizing(false);
      };
      rec.onend = () => setRecognizing(false);

      recognitionRef.current = rec;
      rec.start();
    } catch {
      setRecognizing(false);
    }
  };

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

        {/* Input area */}
        <div className="shrink-0 border-t border-[#eadfce] bg-[#f3e8d3] px-6 py-4">
          {recognizing && (
            <div className="mb-2 flex items-center gap-2 text-xs font-bold text-[#b85c38]">
              <span className="relative flex h-2.5 w-2.5">
                <span className="jr-pulse-ring absolute inset-0 rounded-full bg-[#b85c38]" />
                <span className="relative h-2.5 w-2.5 rounded-full bg-[#b85c38]" />
              </span>
              <span>Listening in {language.name}... Speak your question</span>
            </div>
          )}
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