# Analogy Extensions — Advanced Go Concepts

When a new concept is introduced, use this file to find its physical description
before writing any code. The description here is what goes in the narrative text
of the card and the office animation.

---

## struct

**Physical object:** A manila **folder** with labelled slots printed on the cover.
Each slot has a field name and a colour-coded small envelope inside it.

**Card:** Draw a folder below the main envelope. Each field is a labelled slot
with a dashed underline. The learner fills in a small envelope in each slot.

**Office:** Zainab reaches into a filing drawer and pulls out a blank folder
template. She writes the struct name on the tab, then creates a small envelope
for each field and slots them in. The whole folder is what gets passed around,
not the individual envelopes.

**Go mapping:**
```go
type Person struct {      // ← folder template with name
    Name string           // ← blue string slot
    Age  int              // ← red int slot
}
```

---

## interface

**Physical object:** A **job description card** pinned to the noticeboard.
It lists tasks that must be performed. Any worker who can do all listed tasks
qualifies — regardless of which department they're in.

**Card:** A small card with a list of required tasks (method signatures).
Workers get a checkmark badge if they can perform all tasks.

**Office:** Zainab checks a noticeboard. She doesn't care who does the job — she
just posts an envelope labelled "anyone who can do X". The right worker picks it up.

**Go mapping:**
```go
type Printer interface {   // ← job description card
    Print(s string)        // ← required task
}
```

---

## goroutine

**Physical object:** A **second worker hired on the spot**, given a copy of an
envelope to process in the background. The original worker doesn't wait — they
move on immediately to the next instruction.

**Card:** The main envelope body shows a ⚡ badge next to an instruction line.
That line spawns a ghost copy of an envelope that moves to a second worker's
station.

**Office:** Zainab reads the `go` instruction. Instead of posting and waiting,
she hands a copy of the envelope to a newly-hired temp worker who processes it
independently at a spare desk. Zainab immediately reads the next instruction.

**Go mapping:**
```go
go fmt.Println(name)   // ← ⚡ hire temp, hand them the envelope, don't wait
```

---

## channel

**Physical object:** A **shared pigeonhole tray** bolted to the dividing wall
between two workers. Either worker can drop a sticker in; the other picks it up.
The tray has a capacity (buffered) or requires both workers present (unbuffered).

**Card:** Draw a tray on the dividing wall. Arrows show stickers going in from
one side and out from the other. The type label shows what sticker colour fits.

**Office:** Zainab creates a tray and bolts it to the wall. She sends stickers
into it from her side; Jijo picks them up from his side. For unbuffered channels,
Zainab must wait at the tray until Jijo picks up — neither can move until the
handoff happens.

**Go mapping:**
```go
ch := make(chan string)   // ← install a tray, string stickers only
ch <- name               // ← Zainab drops sticker in
result := <-ch           // ← Jijo picks sticker out
```

---

## slice

**Physical object:** A **numbered stack of same-colour envelopes** held together
with a rubber band, with a capacity label and a length label on the band.

**Card:** Show a fan of envelopes. The rubber band has two numbers: `len` (how
many filled) and `cap` (total space). `append` adds a new envelope to the stack;
if capacity is full, a bigger rubber band replaces the old one.

**Office:** Zainab pulls a stack from the drawer. She can add more envelopes to
the right end of the stack. If the stack grows past the rubber band limit, she
gets a bigger band from the shelf.

**Go mapping:**
```go
names := []string{"Zainab", "Jijo"}   // ← stack of 2 blue envelopes
names = append(names, "Carol")      // ← add a 3rd envelope to the stack
names[0]                            // ← read the first envelope in the stack
```

---

## map

**Physical object:** A **filing cabinet** with labelled drawers. Each drawer
has a key label and holds a sticker (value). Drawers can be added or removed.
Looking up a drawer that doesn't exist returns an empty sticker plus a "not
found" flag.

**Card:** Draw a mini filing cabinet. Two of its drawers are labelled and open,
showing stickers inside. A lookup operation is shown as Zainab pulling a drawer
by its label.

**Office:** Zainab opens a filing cabinet. To store a value, she writes a label
on a new drawer and drops a sticker in. To retrieve, she calls the label — the
drawer slides open. If the drawer doesn't exist, she gets back an empty sticker
and a red "ok = false" flag sticker.

**Go mapping:**
```go
ages := map[string]int{"Zainab": 30}   // ← filing cabinet, string keys, int stickers
ages["Jijo"] = 25                       // ← add a drawer labelled "Jijo"
age, ok := ages["Zainab"]              // ← pull drawer "Zainab"; ok tells if it existed
```

---

## error

**Physical object:** A **red-flagged envelope** — any envelope can have a red
flag sticker on its back. When Jijo sends a reply back through the postal slot,
the back of the envelope may carry either a result sticker or a red flag sticker
(but not both). Zainab checks the back before trusting the result.

**Card:** The "Expected Information" section on the back of the envelope gets
a second row: a red flag slot labelled "Error". If the error slot is filled,
the result is invalid.

**Office:** Jijo finishes processing. He checks: did something go wrong? If yes,
he writes an error description on a red flag sticker and attaches it to the back
of the reply envelope. Zainab receives the reply, flips it over, and checks for
the flag before reading the result sticker.

**Go mapping:**
```go
result, err := doSomething()   // ← result sticker + possible red flag
if err != nil {                // ← is there a red flag?
    fmt.Println(err)           // ← read the red flag
    return
}
```

---

## pointer

**Physical object:** A **locker number sticker** — instead of carrying the
actual envelope, Zainab writes down the locker number where the envelope is
stored. She hands the locker number to someone else; they can go to the locker
and read or change the sticker directly.

**Card:** Show a small envelope with a locker number printed on it (e.g. `0x1a2`).
An arrow points from the locker number to the actual envelope in the locker bank.

**Office:** Instead of copying an envelope and handing it over, Zainab writes the
locker number on a slip of paper and hands that. Jijo receives the slip, walks to
the locker bank, opens the locker, and reads or modifies the sticker directly.
Changes affect the original — not a copy.

**Go mapping:**
```go
name := "Zainab"      // ← envelope in locker
ptr := &name         // ← locker number slip
*ptr = "Jijo"         // ← Jijo walks to locker, swaps the sticker
```

---

## defer

**Physical object:** A **"do this last" sticky note** pinned to the outside of
the main envelope. Zainab reads it at the start, but does not act on it until the
envelope is otherwise completely finished.

**Card:** A yellow sticky note on the corner of the envelope that says "do last".
The deferred instruction is written in lighter ink.

**Office:** Zainab opens the envelope and immediately spots a sticky note on the
inside of the flap. She reads it, pins it to the corkboard above her desk, and
continues with the main instructions. Only after the last instruction is complete
does she take the sticky note down and carry it out — just before pressing the
complete button.

**Go mapping:**
```go
func main() {
    defer fmt.Println("goodbye")   // ← sticky note pinned to corkboard
    fmt.Println("hello")           // ← main instructions
}
// Output: hello → goodbye
```

---

## for loop

**Physical object:** Zainab walking the **same path repeatedly** — from the
worktable, to the shelf, back to the worktable — once for each item in a stack
or until a condition changes.

**Card:** A circular arrow drawn around the instructions section of the envelope,
with a counter showing the current iteration.

**Office:** A floor marking appears — a circuit path painted on the ground.
Zainab starts at one end, follows the path, completes one action, then checks a
sign at the end: "go back?" If yes, she retraces. A lap counter on the wall ticks
up each time. When the counter reaches the limit, she stops and continues to the
next instruction.

**Go mapping:**
```go
for i := 0; i < 3; i++ {       // ← lap counter: 0, 1, 2
    fmt.Println(names[i])       // ← action on each lap
}
```

---

## if / else

**Physical object:** A **decision sign** on the floor, like a fork in a corridor.
An arrow points left (true path) or right (false path) depending on the condition.

**Card:** Two branching paths drawn below the instructions section. The condition
is written on the sign. Each path leads to a different set of instructions.

**Office:** Zainab walks toward the sign. She reads the condition — checks a
sticker value, compares numbers. The sign's arrow swings left or right. She
follows whichever path it points to, carries out those instructions, then rejoins
the main corridor.

**Go mapping:**
```go
if age > 18 {           // ← sign: is the number sticker > 18?
    fmt.Println("adult") // ← left path
} else {
    fmt.Println("minor") // ← right path
}
```
