import React, { useRef, useEffect } from 'react';
import { Mic, MicOff, AlertCircle, Radio, Sparkles, Globe } from 'lucide-react';
import { useVoiceTyping } from '../hooks/useVoiceTyping';

/**
 * VoiceTypingButton Component
 *
 * Provides one-click voice recording and real-time accurate English speech-to-text
 * transcription into any input field or textarea.
 *
 * Props:
 * - currentValue: string (existing text in the target input)
 * - onTextUpdate: (fullUpdatedText) => void (callback to directly update state in real time)
 * - onTranscript: (newChunk) => void (callback with recognized speech)
 * - compact: boolean (if true, renders a small circular button for search inputs)
 * - label: string (custom label for standard button)
 * - disabled: boolean
 */
export default function VoiceTypingButton({
  currentValue = '',
  onTextUpdate,
  onTranscript,
  compact = false,
  label = 'Voice Typing',
  disabled = false,
  style = {}
}) {
  // Remembers the text in the input when recording started so we append smoothly
  const baseTextRef = useRef('');

  const handleSpeechUpdate = (speechText) => {
    if (!speechText) return;

    if (onTranscript) {
      onTranscript(speechText);
    }

    if (onTextUpdate) {
      const base = baseTextRef.current ? baseTextRef.current.trim() : '';
      const updated = base ? `${base} ${speechText}` : speechText;
      onTextUpdate(updated);
    }
  };

  const {
    isListening,
    interimTranscript,
    error,
    isSupported,
    startListening,
    stopListening,
    toggleListening: baseToggleListening,
    activeLang,
    setActiveLang,
    clearError
  } = useVoiceTyping({
    lang: 'en-US',
    continuous: true,
    interimResults: true,
    onSpeechUpdate: handleSpeechUpdate
  });

  const handleToggle = () => {
    if (disabled) return;

    if (!isListening) {
      // Capture what is currently in the text box before new speech begins
      baseTextRef.current = currentValue || '';
      startListening();
    } else {
      stopListening();
    }
  };

  if (!isSupported) {
    return (
      <span
        title="Voice typing requires Google Chrome, Edge, or Safari"
        style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
      >
        <MicOff size={14} style={{ opacity: 0.5 }} /> Mic N/A
      </span>
    );
  }

  // Compact Mode (For search inputs & tight spaces)
  if (compact) {
    return (
      <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
        <button
          type="button"
          onClick={handleToggle}
          disabled={disabled}
          className={`theme-toggle-btn ${isListening ? 'voice-typing-pulse' : ''}`}
          style={{
            padding: '0.45rem',
            borderRadius: '50%',
            width: '34px',
            height: '34px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: isListening
              ? 'linear-gradient(135deg, #ef4444, #dc2626)'
              : 'var(--surface-card)',
            color: isListening ? '#ffffff' : 'var(--text-secondary)',
            borderColor: isListening ? '#f87171' : 'var(--surface-border)',
            boxShadow: isListening ? '0 0 14px rgba(239, 68, 68, 0.5)' : 'none',
            cursor: disabled ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
            ...style
          }}
          title={isListening ? 'Listening... Speak in English (click to stop)' : 'Click to voice type in English'}
          aria-label={isListening ? 'Stop voice recording' : 'Start voice typing'}
        >
          {isListening ? (
            <Mic size={16} className="animate-pulse" />
          ) : (
            <Mic size={16} />
          )}
        </button>

        {/* Live Interim Transcript Bubble */}
        {isListening && interimTranscript && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              right: 0,
              zIndex: 999,
              background: 'var(--modal-bg)',
              border: '1px solid var(--accent-color)',
              padding: '0.4rem 0.75rem',
              borderRadius: '8px',
              fontSize: '0.76rem',
              color: 'var(--accent-color)',
              boxShadow: 'var(--card-shadow)',
              whiteSpace: 'nowrap',
              maxWidth: '240px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
          >
            <Radio size={12} className="animate-pulse" />
            <span>"{interimTranscript}"</span>
          </div>
        )}

        {/* Error notification */}
        {error && (
          <div
            onClick={clearError}
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              right: 0,
              zIndex: 999,
              background: 'rgba(239, 68, 68, 0.95)',
              color: '#ffffff',
              padding: '0.4rem 0.65rem',
              borderRadius: '6px',
              fontSize: '0.74rem',
              boxShadow: 'var(--card-shadow)',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              cursor: 'pointer'
            }}
            title="Click to dismiss"
          >
            <AlertCircle size={13} /> {error}
          </div>
        )}
      </div>
    );
  }

  // Standard Pill / Toolbar Mode (For Audit Notes & Clinical Textareas)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={handleToggle}
          disabled={disabled}
          className={`theme-toggle-btn ${isListening ? 'voice-typing-pulse' : ''}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.35rem 0.75rem',
            borderRadius: '8px',
            fontSize: '0.78rem',
            fontWeight: 600,
            cursor: disabled ? 'not-allowed' : 'pointer',
            background: isListening
              ? 'linear-gradient(135deg, #ef4444, #dc2626)'
              : 'var(--surface-card)',
            color: isListening ? '#ffffff' : 'var(--accent-color)',
            borderColor: isListening ? '#f87171' : 'var(--surface-border)',
            boxShadow: isListening ? '0 0 14px rgba(239, 68, 68, 0.4)' : 'none',
            transition: 'all 0.2s ease'
          }}
          title={isListening ? 'Click to stop recording' : 'Click to dictate notes via microphone in English'}
        >
          {isListening ? (
            <>
              <Radio size={14} className="animate-pulse" />
              <span>Recording... (Click to Stop)</span>
            </>
          ) : (
            <>
              <Mic size={14} />
              <span>{label}</span>
            </>
          )}
        </button>

        {/* English Dialect Toggle (US vs Indian English for medical terms) */}
        <button
          type="button"
          onClick={() => setActiveLang(activeLang === 'en-US' ? 'en-IN' : 'en-US')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.3rem',
            padding: '0.3rem 0.55rem',
            borderRadius: '6px',
            border: '1px solid var(--surface-border)',
            background: 'var(--surface-card-subtle)',
            color: 'var(--text-muted)',
            fontSize: '0.72rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
          title="Toggle English Dialect Optimization"
        >
          <Globe size={12} />
          <span>{activeLang === 'en-IN' ? 'English (India)' : 'English (US)'}</span>
        </button>

        {/* Listening live feedback status */}
        {isListening && (
          <span
            style={{
              fontSize: '0.74rem',
              color: '#ef4444',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontWeight: 600
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#ef4444',
                boxShadow: '0 0 8px #ef4444'
              }}
              className="animate-pulse"
            />
            Listening & Transcribing...
          </span>
        )}
      </div>

      {/* Real-time Interim Words Floating Indicator */}
      {isListening && interimTranscript && (
        <div
          style={{
            padding: '0.35rem 0.65rem',
            borderRadius: '6px',
            background: 'rgba(59, 130, 246, 0.12)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            color: 'var(--accent-color)',
            fontSize: '0.75rem',
            fontStyle: 'italic',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem'
          }}
        >
          <Sparkles size={12} />
          <span>Transcribing: "{interimTranscript}..."</span>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div
          style={{
            padding: '0.35rem 0.65rem',
            borderRadius: '6px',
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: 'var(--error-color)',
            fontSize: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.5rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <AlertCircle size={13} /> {error}
          </div>
          <button
            type="button"
            onClick={clearError}
            style={{ background: 'none', border: 'none', color: 'var(--error-color)', cursor: 'pointer', fontSize: '0.72rem', textDecoration: 'underline' }}
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
