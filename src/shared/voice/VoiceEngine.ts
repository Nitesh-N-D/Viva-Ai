/**
 * shared/voice/VoiceEngine.ts
 *
 * Section 7.1 of the spec: a single interface (`listen` / `speak`) that the
 * rest of the app depends on, so the Bhashini fallback (or any future
 * provider) can be swapped in later without touching any screen component.
 *
 * IMPORTANT: this must keep working with zero network. Web Speech API's
 * speechSynthesis works fully offline on most Android/Chrome builds once a
 * Tamil voice is installed on-device; SpeechRecognition typically requires
 * network on Chrome (no good fully-offline browser STT exists today) — see
 * README "Known limitation" section for how the rest of the app degrades
 * if recognition isn't available.
 */

export interface VoiceEngine {
  speak(text: string, lang?: "ta" | "en"): Promise<void>;
  listen(lang?: "ta" | "en"): Promise<string>;
  cancelSpeaking(): void;
  isListening(): boolean;
}

const PRERECORDED_PHRASES: Record<string, string> = {
  // Maps fixed system phrases to pre-recorded Tamil audio clips for devices
  // with no usable Tamil TTS voice installed. Keys must match i18n string
  // values exactly. Drop matching .mp3 files into public/audio/.
  "வணக்கம்! உங்க இடத்தைக் கண்டுபிடிக்க அனுமதி கொடுங்க.": "/audio/greeting_ta.mp3",
};

class WebSpeechVoiceEngine implements VoiceEngine {
  private recognition: any = null;
  private listening = false;
  private currentAudio: HTMLAudioElement | null = null;

  private getTamilVoice(): SpeechSynthesisVoice | null {
    const voices = window.speechSynthesis?.getVoices() ?? [];
    return (
      voices.find((v) => v.lang === "ta-IN") ??
      voices.find((v) => v.lang.startsWith("ta")) ??
      null
    );
  }

  async speak(text: string, lang: "ta" | "en" = "ta"): Promise<void> {
    this.cancelSpeaking();

    if (lang === "ta") {
      const voice = this.getTamilVoice();
      const fallbackClip = PRERECORDED_PHRASES[text];

      if (!voice && fallbackClip) {
        return this.playClip(fallbackClip);
      }
    }

    return new Promise((resolve) => {
      if (!("speechSynthesis" in window)) {
        resolve();
        return;
      }
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang === "ta" ? "ta-IN" : "en-IN";
      const voice = lang === "ta" ? this.getTamilVoice() : null;
      if (voice) utterance.voice = voice;
      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();
      window.speechSynthesis.speak(utterance);
    });
  }

  private playClip(src: string): Promise<void> {
    return new Promise((resolve) => {
      this.currentAudio = new Audio(src);
      this.currentAudio.onended = () => resolve();
      this.currentAudio.onerror = () => resolve();
      this.currentAudio.play().catch(() => resolve());
    });
  }

  cancelSpeaking(): void {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    this.currentAudio?.pause();
    this.currentAudio = null;
  }

  isListening(): boolean {
    return this.listening;
  }

  async listen(lang: "ta" | "en" = "ta"): Promise<string> {
    const SpeechRecognitionImpl =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionImpl) {
      // No STT available on this device/browser — caller should fall back
      // to a typed-text input. Never throw; always resolve so the UI can
      // degrade gracefully instead of crashing.
      return "";
    }

    return new Promise((resolve) => {
      const recognition = new SpeechRecognitionImpl();
      this.recognition = recognition;
      recognition.lang = lang === "ta" ? "ta-IN" : "en-IN";
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      this.listening = true;
      recognition.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript ?? "";
        resolve(transcript);
      };
      recognition.onerror = () => resolve("");
      recognition.onend = () => {
        this.listening = false;
      };
      recognition.start();
    });
  }
}

export const voiceEngine: VoiceEngine = new WebSpeechVoiceEngine();
