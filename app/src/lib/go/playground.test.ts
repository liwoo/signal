import { describe, it, expect } from "vitest";
import { compileGo } from "./playground";

describe("Go Playground API", () => {
  it("compiles valid hello world", async () => {
    const result = await compileGo(`package main
import "fmt"
func main() {
    fmt.Println("hello from signal")
}`);
    expect(result.success).toBe(true);
    expect(result.errors).toBe("");
    expect(result.output).toContain("hello from signal");
  }, 10000);

  it("returns compile error for undefined function", async () => {
    const result = await compileGo(`package main
import "fmt"
func main() {
    fmt.WriteLine("test")
}`);
    expect(result.success).toBe(false);
    expect(result.errors).toContain("undefined");
    expect(result.errors).toContain("fmt.WriteLine");
  }, 10000);

  it("returns compile error for syntax error", async () => {
    const result = await compileGo(`package main
func main() {
    x := 5
    if x > 3
        fmt.Println(x)
    }
}`);
    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  }, 10000);

  it("returns compile error for type mismatch", async () => {
    const result = await compileGo(`package main
func main() {
    var x int = "hello"
    _ = x
}`);
    expect(result.success).toBe(false);
    expect(result.errors).toContain("cannot use");
  }, 10000);

  it("returns compile error for unused variable", async () => {
    const result = await compileGo(`package main
func main() {
    x := 5
}`);
    expect(result.success).toBe(false);
    expect(result.errors).toContain("declared and not used");
  }, 10000);

  it("captures multi-line output", async () => {
    const result = await compileGo(`package main
import "fmt"
func main() {
    for i := 1; i <= 3; i++ {
        fmt.Println(i)
    }
}`);
    expect(result.success).toBe(true);
    expect(result.output).toContain("1");
    expect(result.output).toContain("2");
    expect(result.output).toContain("3");
  }, 10000);
});
