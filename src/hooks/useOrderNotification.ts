import { useEffect, useRef, useCallback } from 'react';

// Generate a pleasant notification chime using Web Audio API
function playNotificationSound() {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Create a pleasant two-tone chime
    const notes = [
      { frequency: 587.33, start: 0, duration: 0.15 },      // D5
      { frequency: 880, start: 0.15, duration: 0.25 },       // A5
    ];

    notes.forEach(({ frequency, start, duration }) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime + start);

      gainNode.gain.setValueAtTime(0, audioContext.currentTime + start);
      gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + start + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + start + duration);

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.start(audioContext.currentTime + start);
      oscillator.stop(audioContext.currentTime + start + duration);
    });
  } catch (e) {
    console.warn('Could not play notification sound:', e);
  }
}

// Play an urgent alert sound for waiter calls
function playWaiterCallSound() {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    const notes = [
      { frequency: 1046.5, start: 0, duration: 0.1 },      // C6
      { frequency: 1318.51, start: 0.12, duration: 0.1 },   // E6
      { frequency: 1046.5, start: 0.24, duration: 0.1 },    // C6
      { frequency: 1318.51, start: 0.36, duration: 0.15 },  // E6
    ];

    notes.forEach(({ frequency, start, duration }) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime + start);

      gainNode.gain.setValueAtTime(0, audioContext.currentTime + start);
      gainNode.gain.linearRampToValueAtTime(0.25, audioContext.currentTime + start + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + start + duration);

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.start(audioContext.currentTime + start);
      oscillator.stop(audioContext.currentTime + start + duration);
    });
  } catch (e) {
    console.warn('Could not play waiter call sound:', e);
  }
}

export function useOrderNotification(orderCount: number, isMuted: boolean) {
  const prevCount = useRef(orderCount);

  useEffect(() => {
    if (prevCount.current !== undefined && orderCount > prevCount.current && !isMuted) {
      playNotificationSound();
    }
    prevCount.current = orderCount;
  }, [orderCount, isMuted]);
}

export function useWaiterCallNotification(callCount: number, isMuted: boolean) {
  const prevCount = useRef(callCount);

  useEffect(() => {
    if (prevCount.current !== undefined && callCount > prevCount.current && !isMuted) {
      playWaiterCallSound();
    }
    prevCount.current = callCount;
  }, [callCount, isMuted]);
}
