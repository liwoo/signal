// Go reference solutions for Act III — what a player plausibly types, with
// their own func main left in (the harness replaces it). Run against the real
// Go toolchain by act3-go.test.ts when `go` is installed.

const CH07_SCAN = `package main

import "fmt"

func scanArchive(archive map[string][]string, root string) int {
	count := 0
	var scan func(dir string)
	scan = func(dir string) {
		defer fmt.Println("scanned:", dir)
		for _, entry := range archive[dir] {
			if entry[len(entry)-1] == '/' {
				scan(entry[:len(entry)-1])
			} else {
				count++
			}
		}
	}
	scan(root)
	return count
}`;

const CH08_CUT = `func cut(name string) {
	fmt.Println(name + " circuit: DOWN")
}

func cutAsync(name string) {
	go cut(name)
}`;

const CH08_CUTALL = `func cutAll(circuits []string) []string {
	results := make([]string, len(circuits))
	var wg sync.WaitGroup
	for i, name := range circuits {
		wg.Add(1)
		go func(idx int, n string) {
			defer wg.Done()
			results[idx] = n + " circuit: DOWN"
		}(i, name)
	}
	wg.Wait()
	return results
}`;

const CH09_HAIL = `func hail(team string, delayMs int) chan string {
	ch := make(chan string, 1)
	go func() {
		time.Sleep(time.Duration(delayMs) * time.Millisecond)
		ch <- team + " responding"
	}()
	return ch
}`;

const CH09_FIRST = `func firstResponder(alpha, bravo, charlie chan string) string {
	select {
	case msg := <-alpha:
		return msg
	case msg := <-bravo:
		return msg
	case msg := <-charlie:
		return msg
	}
}`;

export const GO_ACT3_SOLUTIONS: Record<string, string> = {
  "chapter-07:scaffold": `package main

import "fmt"

func main() {
	fmt.Println("Hello World")
}`,
  "chapter-07:scan": `${CH07_SCAN}

func main() {
	fmt.Println(scanArchive(map[string][]string{"root": {"a.txt"}}, "root"))
}`,
  "chapter-07:recover": `${CH07_SCAN}

func safeScan(archive map[string][]string, root string) (int, []string) {
	count := 0
	errs := []string{}
	var scan func(dir string)
	scan = func(dir string) {
		defer func() {
			if r := recover(); r != nil {
				errs = append(errs, fmt.Sprintf("%s: %v", dir, r))
			}
		}()
		defer fmt.Println("scanned:", dir)
		entries := archive[dir]
		if entries == nil {
			panic("corrupted directory")
		}
		for _, entry := range entries {
			if entry[len(entry)-1] == '/' {
				scan(entry[:len(entry)-1])
			} else {
				count++
			}
		}
	}
	scan(root)
	return count, errs
}

func main() {
	fmt.Println(safeScan(map[string][]string{"root": nil}, "root"))
}`,
  "chapter-08:scaffold": `package main

import "fmt"

func main() {
	fmt.Println("Hello World")
}`,
  "chapter-08:goroutine": `package main

import (
	"fmt"
	"time"
)

${CH08_CUT}

func main() {
	cut("North")
	cutAsync("South")
	time.Sleep(100 * time.Millisecond)
	fmt.Println("power cycle complete")
}`,
  "chapter-08:fanout": `package main

import (
	"fmt"
	"sync"
	"time"
)

${CH08_CUT}

${CH08_CUTALL}

func main() {
	start := time.Now()
	fmt.Println(cutAll([]string{"North"}), time.Since(start) >= 0)
}`,
  "chapter-08:window": `package main

import (
	"fmt"
	"sync"
	"time"
)

${CH08_CUT}

${CH08_CUTALL}

func cutTimed(circuits []string, delays []int) []string {
	results := make([]string, len(circuits))
	var wg sync.WaitGroup
	for i, name := range circuits {
		wg.Add(1)
		go func(idx int, n string, d int) {
			defer wg.Done()
			time.Sleep(time.Duration(d) * time.Millisecond)
			results[idx] = fmt.Sprintf("%s circuit: DOWN (%dms)", n, d)
		}(i, name, delays[i])
	}
	wg.Wait()
	return results
}

func main() {
	fmt.Println(cutTimed([]string{"North"}, []int{10}))
}`,
  "chapter-09:scaffold": `package main

import "fmt"

func main() {
	fmt.Println("Hello World")
}`,
  "chapter-09:hail": `package main

import (
	"fmt"
	"time"
)

${CH09_HAIL}

func main() {
	fmt.Println(<-hail("Bravo", 100))
}`,
  "chapter-09:first": `package main

import (
	"fmt"
	"time"
)

${CH09_HAIL}

${CH09_FIRST}

func main() {
	fmt.Println(firstResponder(hail("A", 20), hail("B", 10), hail("C", 30)))
}`,
  "chapter-09:timeout": `package main

import (
	"fmt"
	"time"
)

${CH09_HAIL}

${CH09_FIRST}

func awaitContact(alpha, bravo, charlie chan string, timeoutMs int) string {
	select {
	case msg := <-alpha:
		return msg
	case msg := <-bravo:
		return msg
	case msg := <-charlie:
		return msg
	case <-time.After(time.Duration(timeoutMs) * time.Millisecond):
		return "NO CONTACT"
	}
}

func sweep(ch chan string) string {
	select {
	case msg := <-ch:
		return msg
	default:
		return "channel silent"
	}
}

func main() {
	fmt.Println(sweep(hail("Bravo", 10)))
}`,
};

/** The shortcut each Go step exists to catch — must not pass. */
export const GO_ACT3_WRONG: Record<string, string> = {
  // Synchronous "goroutine": same output, but no `go`.
  "chapter-08:goroutine": GO_ACT3_SOLUTIONS["chapter-08:goroutine"].replace("go cut(name)", "cut(name)"),
  // Sequential cuts: the harness measures two power cycles.
  "chapter-08:window": GO_ACT3_SOLUTIONS["chapter-08:window"].replace(
    /func cutTimed[\s\S]*?\n}\n/,
    `func cutTimed(circuits []string, delays []int) []string {
	results := []string{}
	var wg sync.WaitGroup
	wg.Wait()
	for i, n := range circuits {
		time.Sleep(time.Duration(delays[i]) * time.Millisecond)
		results = append(results, fmt.Sprintf("%s circuit: DOWN (%dms)", n, delays[i]))
	}
	go func() {}()
	return results
}
`,
  ),
  // Receiving in turn instead of select: Alpha (200ms) is read before Bravo.
  "chapter-09:first": GO_ACT3_SOLUTIONS["chapter-09:first"].replace(
    CH09_FIRST,
    `func firstResponder(alpha, bravo, charlie chan string) string {
	// select case
	msg := <-alpha
	return msg
}`,
  ),
};
