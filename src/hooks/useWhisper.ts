import { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

export interface VoiceQuota {
  used_seconds: number;
  limit_seconds: number;
  remaining_seconds: number;
  warning_level: 'none' | 'warning' | 'urgent' | 'exceeded';
  resets_on: string;
  is_admin: boolean;
}

const DEFAULT_QUOTA: VoiceQuota = {
  used_seconds: 0,
  limit_seconds: 900,
  remaining_seconds: 900,
  warning_level: 'none',
  resets_on: '',
  is_admin: false,
};

// 30-second hard auto-stop limit
const RECORDING_LIMIT_SECONDS = 30;

export const playSensorySound = (type: 'success' | 'error') => {
  try {
    const isMuted = localStorage.getItem('tailor_sound_muted') === 'true';
    if (isMuted) return;

    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'success') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime);
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } else {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(120, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(80, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    }
  } catch (e) {
    console.warn('Audio Context not supported or allowed yet.', e);
  }
};

export const useWhisper = () => {
  const { token } = useAuth();
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  // Restore quota from localStorage on mount so mic state is correct instantly
  const [voiceQuota, setVoiceQuota] = useState<VoiceQuota>(() => {
    try {
      const stored = localStorage.getItem('voice_quota');
      if (stored) return JSON.parse(stored) as VoiceQuota;
    } catch {}
    return DEFAULT_QUOTA;
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (autoStopRef.current) {
      clearTimeout(autoStopRef.current);
      autoStopRef.current = null;
    }
  };

  const stopRecording = () => {
    clearTimers();
    setRecordingSeconds(0);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsListening(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });

        // Guard against accidental taps (< 1KB = no real audio)
        if (audioBlob.size < 1000) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        setIsTranscribing(true);
        await sendToWhisper(audioBlob);
        setIsTranscribing(false);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsListening(true);
      setError(null);
      setRecordingSeconds(0);

      // Live 1-second tick counter
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);

      // 30-second hard auto-stop — protects quota on slow networks
      autoStopRef.current = setTimeout(() => {
        stopRecording();
      }, RECORDING_LIMIT_SECONDS * 1000);
    } catch (err) {
      playSensorySound('error');
      setError('Microphone access denied');
      setIsListening(false);
    }
  };

  const sendToWhisper = async (audioBlob: Blob) => {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');

    // 35-second frontend timeout — backend Whisper timeout is 30s,
    // so the backend always responds first with a proper error if it times out
    const controller = new AbortController();
    const abortTimer = setTimeout(() => controller.abort(), 35000);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/transcribe`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(abortTimer);
      const data = await response.json();

      // Always update quota — success, failure, or 429
      if (data.quota) {
        setVoiceQuota(data.quota as VoiceQuota);
        localStorage.setItem('voice_quota', JSON.stringify(data.quota));
      }

      // Quota exceeded
      if (response.status === 429) {
        playSensorySound('error');
        return;
      }

      // Redis is down — voice temporarily unavailable (Fail Closed)
      if (response.status === 503 || data.error === 'voice_service_unavailable') {
        playSensorySound('error');
        setError('Voice is temporarily unavailable. Please use the manual keypad.');
        return;
      }

      // Whisper timed out on the backend (pre-charge already applied)
      if (data.error === 'whisper_timeout') {
        playSensorySound('error');
        setError('Voice took too long to process. Try again or use the manual keypad.');
        return;
      }

      // Whisper returned empty (silence, cough, background noise)
      if (data.error === 'transcription_empty') {
        playSensorySound('error');
        setError('Nothing was captured. Please speak clearly and try again.');
        return;
      }

      if (!response.ok) throw new Error('Transcription failed');

      if (data.text) setTranscript(data.text);
    } catch (err: any) {
      clearTimeout(abortTimer);
      if (err?.name === 'AbortError') {
        // Frontend 35s timeout fired — backend might still be processing
        playSensorySound('error');
        setError('Voice took too long. Check your connection and try again.');
      } else {
        playSensorySound('error');
        setError('Whisper error: Connection to backend failed');
      }
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopRecording();
    } else {
      setTranscript('');
      startRecording();
    }
  };

  return {
    isListening,
    isTranscribing,
    transcript,
    error,
    voiceQuota,
    recordingSeconds,
    recordingLimit: RECORDING_LIMIT_SECONDS,
    toggleListening,
    clearTranscript: () => setTranscript(''),
  };
};
