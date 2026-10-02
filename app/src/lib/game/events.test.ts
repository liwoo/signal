import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createEventScheduler } from "./events";
import type { TimedEvent } from "@/types/game";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

const makeEvent = (seconds: number, type: TimedEvent["type"] = "story", message = "test"): TimedEvent => ({
  triggerAtSeconds: seconds,
  type,
  message,
});

describe("createEventScheduler", () => {
  it("fires events at correct times", () => {
    const scheduler = createEventScheduler();
    const callback = vi.fn();
    const events = [makeEvent(5), makeEvent(10), makeEvent(20)];

    scheduler.start(events, callback);

    expect(callback).not.toHaveBeenCalled();

    vi.advanceTimersByTime(5000);
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(events[0]);

    vi.advanceTimersByTime(5000);
    expect(callback).toHaveBeenCalledTimes(2);
    expect(callback).toHaveBeenCalledWith(events[1]);

    vi.advanceTimersByTime(10000);
    expect(callback).toHaveBeenCalledTimes(3);
    expect(callback).toHaveBeenCalledWith(events[2]);
  });

  it("does not fire events before their time", () => {
    const scheduler = createEventScheduler();
    const callback = vi.fn();
    const events = [makeEvent(10)];

    scheduler.start(events, callback);

    vi.advanceTimersByTime(9999);
    expect(callback).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("stop() cancels pending events", () => {
    const scheduler = createEventScheduler();
    const callback = vi.fn();
    const events = [makeEvent(5), makeEvent(10)];

    scheduler.start(events, callback);

    vi.advanceTimersByTime(5000);
    expect(callback).toHaveBeenCalledTimes(1);

    scheduler.stop();

    vi.advanceTimersByTime(10000);
    expect(callback).toHaveBeenCalledTimes(1); // no more calls
  });

  it("start() clears previous events", () => {
    const scheduler = createEventScheduler();
    const callback1 = vi.fn();
    const callback2 = vi.fn();

    scheduler.start([makeEvent(5, "story", "first")], callback1);
    scheduler.start([makeEvent(5, "story", "second")], callback2);

    vi.advanceTimersByTime(5000);
    expect(callback1).not.toHaveBeenCalled(); // cleared by second start
    expect(callback2).toHaveBeenCalledTimes(1);
  });

  it("handles empty event list", () => {
    const scheduler = createEventScheduler();
    const callback = vi.fn();

    scheduler.start([], callback);
    vi.advanceTimersByTime(60000);
    expect(callback).not.toHaveBeenCalled();
  });

  it("handles event at 0 seconds", () => {
    const scheduler = createEventScheduler();
    const callback = vi.fn();

    scheduler.start([makeEvent(0)], callback);
    vi.advanceTimersByTime(0);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("passes correct event data to callback", () => {
    const scheduler = createEventScheduler();
    const callback = vi.fn();
    const event = makeEvent(1, "rush", "GUARD APPROACHING");

    scheduler.start([event], callback);
    vi.advanceTimersByTime(1000);

    expect(callback).toHaveBeenCalledWith({
      triggerAtSeconds: 1,
      type: "rush",
      message: "GUARD APPROACHING",
    });
  });

  it("stop() is safe to call multiple times", () => {
    const scheduler = createEventScheduler();
    scheduler.stop();
    scheduler.stop();
    // No errors thrown
  });

  it("stop() is safe to call before start", () => {
    const scheduler = createEventScheduler();
    scheduler.stop();
    // No errors thrown
  });
});

describe("createEventScheduler pause/resume", () => {
  it("freezes the clock while paused and resumes with remaining time", () => {
    const scheduler = createEventScheduler();
    const callback = vi.fn();
    scheduler.start([makeEvent(10)], callback);

    vi.advanceTimersByTime(4000);
    scheduler.pause();

    // Paused: a long wait must not fire anything
    vi.advanceTimersByTime(60000);
    expect(callback).not.toHaveBeenCalled();

    scheduler.resume();
    vi.advanceTimersByTime(5999);
    expect(callback).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("preserves relative spacing between several pending events", () => {
    const scheduler = createEventScheduler();
    const callback = vi.fn();
    const events = [makeEvent(10, "system", "a"), makeEvent(12, "rush", "b")];
    scheduler.start(events, callback);

    vi.advanceTimersByTime(1000);
    scheduler.pause();
    vi.advanceTimersByTime(30000);
    scheduler.resume();

    vi.advanceTimersByTime(9000);
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenLastCalledWith(events[0]);
    vi.advanceTimersByTime(2000);
    expect(callback).toHaveBeenCalledTimes(2);
    expect(callback).toHaveBeenLastCalledWith(events[1]);
  });

  it("can be paused immediately after start (events scheduled during a talk pause)", () => {
    const scheduler = createEventScheduler();
    const callback = vi.fn();
    scheduler.start([makeEvent(10)], callback);
    scheduler.pause();

    vi.advanceTimersByTime(20000);
    expect(callback).not.toHaveBeenCalled();

    scheduler.resume();
    vi.advanceTimersByTime(10000);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("pause/resume are idempotent and safe before start", () => {
    const scheduler = createEventScheduler();
    scheduler.pause();
    scheduler.pause();
    scheduler.resume();
    scheduler.resume();

    const callback = vi.fn();
    scheduler.start([makeEvent(1)], callback);
    scheduler.pause();
    scheduler.pause();
    scheduler.resume();
    scheduler.resume();
    vi.advanceTimersByTime(1000);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("stop() while paused discards pending events", () => {
    const scheduler = createEventScheduler();
    const callback = vi.fn();
    scheduler.start([makeEvent(5)], callback);
    scheduler.pause();
    scheduler.stop();
    scheduler.resume();
    vi.advanceTimersByTime(10000);
    expect(callback).not.toHaveBeenCalled();
  });

  it("already-fired events are not replayed after a pause cycle", () => {
    const scheduler = createEventScheduler();
    const callback = vi.fn();
    scheduler.start([makeEvent(2), makeEvent(8)], callback);
    vi.advanceTimersByTime(3000);
    expect(callback).toHaveBeenCalledTimes(1);
    scheduler.pause();
    scheduler.resume();
    vi.advanceTimersByTime(5000);
    expect(callback).toHaveBeenCalledTimes(2);
  });
});
