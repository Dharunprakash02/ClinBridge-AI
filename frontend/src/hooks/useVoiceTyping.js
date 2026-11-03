import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Custom React hook for Voice Typing (Speech-to-Text).
 * Uses the Web Speech API (supported natively in Chrome, Edge, Safari, Android Chrome).
 *
 * Real-time continuous streaming: words appear in the text field immediately as spoken.
 */
export function useVoiceTyping({
  lang = 'en-US',
  continuous = true,
  interimResults = true,
  onSpeechUpdate = null, // Called on every spoken word (both interim & final)
  onFinalTranscript = null // Called when a phrase is finalized
} = {}) {
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState(null);
  const [activeLang, setActiveLang] = useState(lang);

  const recognitionRef = useRef(null);
  const latestSpeechRef = useRef('');
  const onSpeechUpdateRef = useRef(onSpeechUpdate);
  const onFinalTranscriptRef = useRef(onFinalTranscript);

  // Keep callback refs synchronized to avoid stale closures
  useEffect(() => {
    onSpeechUpdateRef.current = onSpeechUpdate;
    onFinalTranscriptRef.current = onFinalTranscript;
  }, [onSpeechUpdate, onFinalTranscript]);

  const isSupported = typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  // Cleanly stop listening and ensure latest words are saved
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        // ignore
      }
    }

    // Flush any pending spoken words
    if (latestSpeechRef.current) {
      if (onFinalTranscriptRef.current) {
        onFinalTranscriptRef.current(latestSpeechRef.current);
      }
      if (onSpeechUpdateRef.current) {
        onSpeechUpdateRef.current(latestSpeechRef.current);
      }
    }

    setIsListening(false);
    setInterimTranscript('');
  }, []);

  // Start listening with microphone
  const startListening = useCallback((overrideLang) => {
    setError(null);
    setInterimTranscript('');
    latestSpeechRef.current = '';

    if (!isSupported) {
      setError('Voice typing is not supported in this browser. Please use Google Chrome, Microsoft Edge, or Safari.');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    // Abort any lingering instance
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {
        // ignore
      }
    }

    try {
      const recognition = new SpeechRecognition();
      const targetLang = overrideLang || activeLang || 'en-US';

      recognition.continuous = continuous;
      recognition.interimResults = interimResults;
      recognition.lang = targetLang;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
      };

      recognition.onresult = (event) => {
        let finalStr = '';
        let interimStr = '';

        // Iterate through all results from the beginning of this session
        for (let i = 0; i < event.results.length; i++) {
          const res = event.results[i];
          const textChunk = res[0]?.transcript || '';

          if (res.isFinal) {
            finalStr += (finalStr ? ' ' : '') + textChunk.trim();
          } else {
            interimStr += (interimStr ? ' ' : '') + textChunk.trim();
          }
        }

        const combined = (finalStr + (interimStr ? (finalStr ? ' ' : '') + interimStr : '')).trim();
        latestSpeechRef.current = combined;
        setInterimTranscript(interimStr);

        // Immediately update text bar with live spoken words!
        if (combined && onSpeechUpdateRef.current) {
          onSpeechUpdateRef.current(combined);
        }

        if (finalStr && onFinalTranscriptRef.current) {
          onFinalTranscriptRef.current(finalStr);
        }
      };

      recognition.onerror = (event) => {
        console.warn('[VoiceTyping Notice]', event.error);
        if (event.error === 'not-allowed') {
          setError('Microphone access blocked. Click the lock/camera icon in your browser URL bar and select "Allow".');
        } else if (event.error === 'no-speech') {
          setError('No voice detected. Please speak closer to your microphone.');
        } else if (event.error === 'audio-capture') {
          setError('No microphone found on this device. Please connect an audio input.');
        } else if (event.error === 'network') {
          setError('Speech service network error. Please check your internet connection.');
        } else if (event.error !== 'aborted') {
          setError(`Microphone notice: ${event.error}`);
        }
        setIsListening(false);
        setInterimTranscript('');
      };

      recognition.onend = () => {
        // Ensure any finalized speech is delivered before closing
        if (latestSpeechRef.current && onSpeechUpdateRef.current) {
          onSpeechUpdateRef.current(latestSpeechRef.current);
        }
        setIsListening(false);
        setInterimTranscript('');
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Failed to initialize speech recognition:', err);
      setError('Unable to activate microphone. Please check browser permissions.');
      setIsListening(false);
    }
  }, [isSupported, activeLang, continuous, interimResults]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  return {
    isListening,
    interimTranscript,
    error,
    isSupported,
    startListening,
    stopListening,
    toggleListening,
    activeLang,
    setActiveLang,
    clearError: () => setError(null)
  };
}
