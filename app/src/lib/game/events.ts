import type { TimedEvent } from "@/types/game";

export type EventCallback = (event: TimedEvent) => void;

export interface EventScheduler {
  start: (events: TimedEvent[], onEvent: EventCallback) => void;
  /**
   * Freeze the event clock. Pending events keep their remaining time and
   * resume counting down on resume(). Used while Maya is talking so a step's
   * hazards land N seconds into the player's *active* time, not the moment
   * the editor unlocks.
   */
  pause: () => void;
  resume: () => void;
  stop: () => void;
}

interface Pending {
  event: TimedEvent;
  remainingMs: number;
}

export function createEventScheduler(): EventScheduler {
  const timers: ReturnType<typeof setTimeout>[] = [];
  let pending: Pending[] = [];
  let onEvent: EventCallback | null = null;
  let armedAt = 0;
  let paused = false;

  function clearTimers() {
    timers.forEach(clearTimeout);
    timers.length = 0;
  }

  function arm() {
    armedAt = Date.now();
    for (const item of pending) {
      const timer = setTimeout(() => {
        pending = pending.filter((p) => p !== item);
        onEvent?.(item.event);
      }, item.remainingMs);
      timers.push(timer);
    }
  }

  function stop() {
    clearTimers();
    pending = [];
    onEvent = null;
    paused = false;
  }

  function start(events: TimedEvent[], callback: EventCallback) {
    stop();
    onEvent = callback;
    pending = events.map((event) => ({
      event,
      remainingMs: event.triggerAtSeconds * 1000,
    }));
    arm();
  }

  function pause() {
    if (paused) return;
    paused = true;
    clearTimers();
    const elapsed = Date.now() - armedAt;
    for (const item of pending) {
      item.remainingMs = Math.max(0, item.remainingMs - elapsed);
    }
  }

  function resume() {
    if (!paused) return;
    paused = false;
    arm();
  }

  return { start, pause, resume, stop };
}
