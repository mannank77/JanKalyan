export type Language = {
  name: string;
  native: string;
  script: string;
  tint: string;
  accent: string;
  greeting: string;
  supportLine: string;
  /** BCP-47 language code sent to the backend for Polly TTS */
  langCode: string;
};

export const languages: Language[] = [
  { name: "English", native: "English", script: "Latin script", tint: "#E8EFE6", accent: "#3C8063", greeting: "Hello, I'm here to help you", supportLine: "Find public support in a language that feels familiar.", langCode: "en-IN" },
  { name: "Hindi", native: "हिन्दी", script: "देवनागरी", tint: "#F7EBD0", accent: "#B85C38", greeting: "नमस्ते, मैं आपकी मदद के लिए यहाँ हूँ", supportLine: "अपनी भाषा में सरकारी सहायता पाएं।", langCode: "hi-IN" },
  { name: "Bengali", native: "বাংলা", script: "বাংলা লিপি", tint: "#E3F0E9", accent: "#3C8063", greeting: "নমস্কার, আমি আপনাকে সাহায্য করতে পারি", supportLine: "আপনার ভাষায় সরকারি সহায়তা খুঁজুন।", langCode: "bn-IN" },
  { name: "Marathi", native: "मराठी", script: "देवनागरी", tint: "#E5ECF7", accent: "#416B9A", greeting: "नमस्कार, मी तुमची मदत करू शकतो", supportLine: "तुमच्या भाषेत सरकारी मदत शोधा.", langCode: "mr-IN" },
  { name: "Telugu", native: "తెలుగు", script: "తెలుగు లిపి", tint: "#EEE8F6", accent: "#74569D", greeting: "నమస్కారం, నేను మీకు సహాయం చేస్తాను", supportLine: "మీ భాషలో ప్రభుత్వ సహాయం కనుగొనండి.", langCode: "te-IN" },
  { name: "Tamil", native: "தமிழ்", script: "தமிழ் எழுத்து", tint: "#F3E4E8", accent: "#9A4D68", greeting: "வணக்கம், நான் உங்களுக்கு உதவுகிறேன்", supportLine: "உங்கள் மொழியில் அரசாங்க உதவியைத் தேடுங்கள்.", langCode: "ta-IN" },
  { name: "Gujarati", native: "ગુજરાતી", script: "ગુજરાતી લિપિ", tint: "#F5E8CF", accent: "#A86525", greeting: "નમસ્તે, હું તમને મદદ કરી શકું છું", supportLine: "તમારી ભાષામાં સરકારી સહાય શોધો.", langCode: "gu-IN" },
  { name: "Urdu", native: "اردو", script: "نستعلیق", tint: "#F1E7DD", accent: "#8D5A3A", greeting: "السلام علیکم، میں آپ کی مدد کے لیے حاضر ہوں", supportLine: "अपनी زبان میں سرکاری مدد تلاش کریں۔", langCode: "ur-IN" },
  { name: "Kannada", native: "ಕನ್ನಡ", script: "ಕನ್ನಡ ಲಿಪಿ", tint: "#E4F0EC", accent: "#397565", greeting: "ನಮಸ್ಕಾರ, ನಾನು ನಿಮಗೆ ಸಹಾಯ ಮಾಡುತ್ತೇನೆ", supportLine: "ನಿಮ್ಮ ಭಾಷೆಯಲ್ಲಿ ಸರ್ಕಾರಿ ಸಹಾಯ ಹುಡುಕಿ.", langCode: "kn-IN" },
];

export const translationLines: Record<string, string> = {
  English: "Find government support in a language that feels natural.",
  Hindi: "अपनी भाषा में सरकारी मदद पाएं।",
  Bengali: "আপনার ভাষায় সরকারি সহায়তা খুঁজুন।",
  Marathi: "तुमच्या भाषेत सरकारी मदत शोधा.",
  Telugu: "మీ భాషలో ప్రభుత్వ సహాయం కనుగొనండి.",
  Tamil: "உங்கள் மொழியில் அரசாங்க உதவியைத் தேடுங்கள்.",
  Gujarati: "તમારી ભાષામાં સરકારી સહાય શોધો.",
  Urdu: "اپنی زبان میں سرکاری مدد تلاش کریں۔",
  Kannada: "ನಿಮ್ಮ ಭಾಷೆಯಲ್ಲಿ ಸರ್ಕಾರಿ ಸಹಾಯ ಹುಡುಕಿ.",
};

export { getUITranslations, getLocalizedScheme, localizedSchemes } from "./translations";
export type { LanguageKey, UIStrings, LocalizedSchemeData } from "./translations";