import { describe, test, expect } from "vitest";
import {
  INITIAL_HEARTS,
  MAX_HEARTS,
  HEART_COST_XP,
  loseHeart,
  canBuyHeart,
  buyHeart,
  hasLives,
} from "./hearts";

describe("hearts system", () => {
  test("initial hearts is 3", () => {
    expect(INITIAL_HEARTS).toBe(3);
  });

  test("max hearts is 5", () => {
    expect(MAX_HEARTS).toBe(5);
  });

  test("heart cost is 500 XP", () => {
    expect(HEART_COST_XP).toBe(500);
  });

  describe("loseHeart", () => {
    test("decrements by 1", () => {
      expect(loseHeart(3)).toBe(2);
      expect(loseHeart(1)).toBe(0);
    });

    test("never goes below 0", () => {
      expect(loseHeart(0)).toBe(0);
    });
  });

  describe("canBuyHeart", () => {
    test("true when under max and enough XP", () => {
      expect(canBuyHeart(2, 500)).toBe(true);
      expect(canBuyHeart(4, 1000)).toBe(true);
    });

    test("false when at max hearts", () => {
      expect(canBuyHeart(5, 10000)).toBe(false);
    });

    test("false when not enough XP", () => {
      expect(canBuyHeart(2, 499)).toBe(false);
    });
  });

  describe("buyHeart", () => {
    test("returns new hearts and xp on success", () => {
      const result = buyHeart(2, 600);
      expect(result).toEqual({ hearts: 3, xp: 100 });
    });

    test("returns null when cannot buy", () => {
      expect(buyHeart(5, 1000)).toBeNull();
      expect(buyHeart(2, 100)).toBeNull();
    });

    test("deducts exactly HEART_COST_XP", () => {
      const result = buyHeart(1, 500);
      expect(result).toEqual({ hearts: 2, xp: 0 });
    });
  });

  describe("hasLives", () => {
    test("true when hearts > 0", () => {
      expect(hasLives(3)).toBe(true);
      expect(hasLives(1)).toBe(true);
    });

    test("false when hearts === 0", () => {
      expect(hasLives(0)).toBe(false);
    });
  });
});
