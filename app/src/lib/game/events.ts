import type { TimedEvent } from "@/types/game";

export type EventCallback = (event: TimedEvent) => void;

export interface EventScheduler {
  start: (events: TimedEvent[], onEvent: EventCallback) => void;
  stop: () => void;
}

export function createEventScheduler(): EventScheduler {
  const timers: ReturnType<typeof setTimeout>[] = [];

  function stop() {
    timers.forEach(clearTimeout);
    timers.length = 0;
  }

  function start(events: TimedEvent[], onEvent: EventCallback) {
    stop();
    for (const event of events) {
      const timer = setTimeout(
        () => onEvent(event),
        event.triggerAtSeconds * 1000
      );
      timers.push(timer);
    }
  }

  return { start, stop };
}
