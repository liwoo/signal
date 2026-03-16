# Chapter 5 — Access Struct

**Act II · Floor 3 · Patrol Analysis**

## Go Concepts

- Structs (definition, instantiation, field access)
- Methods (value receivers, pointer receivers)
- Pointers (basic `*` and `&`)
- Enums via `iota` (const block pattern)
- Struct embedding (composition)

## Story Context

Maya needs to model the building's security system. Guards have clearance levels (an enum), patrol windows, and equipment. Senior guards carry radios that embed base equipment specs. By modeling all of this as structs with methods, Maya can predict exactly when each floor is vulnerable and which guards can call for backup.

## Challenge

Build a guard model with clearance enums, embedded equipment structs, and patrol-window methods.

### Steps

#### Step 0: Scaffold

Same as always — `package main`, `import`, `func main()`, print "ready".

Imports needed: `"fmt"`

#### Step 1: Clearance Enum

Define a `Clearance` type (based on `int`) and use `iota` to create clearance levels.

Key teaching moment: Go doesn't have an `enum` keyword. Instead, you use a `const` block with `iota` — a counter that starts at 0 and increments for each line. This is THE Go pattern for enums.

```go
type Clearance int

const (
    Visitor   Clearance = iota // 0
    Staff                      // 1
    Security                   // 2
    Executive                  // 3
)

func (c Clearance) String() string {
    names := []string{"Visitor", "Staff", "Security", "Executive"}
    if int(c) < len(names) {
        return names[c]
    }
    return "Unknown"
}
```

Test harness:
```go
func main() {
    fmt.Println(Visitor)
    fmt.Println(Security)
    fmt.Println(Executive)
    fmt.Println(Clearance(5))
}
```

Expected output:
```
Visitor
Security
Executive
Unknown
```

#### Step 2: Guard Struct with Methods

Define a `Guard` struct with Name, Floor, ShiftStart, ShiftHours, and Level (Clearance). Add methods for EndHour and IsOnDuty.

Teaching moment: methods attach to types via receivers. Value receiver `(g Guard)` gets a copy. Pointer receiver `(g *Guard)` gets the original (needed when modifying fields).

```go
type Guard struct {
    Name       string
    Floor      int
    ShiftStart int
    ShiftHours int
    Level      Clearance
}

func (g Guard) EndHour() int {
    return (g.ShiftStart + g.ShiftHours) % 24
}

func (g Guard) IsOnDuty(hour int) bool {
    end := g.EndHour()
    if end > g.ShiftStart {
        return hour >= g.ShiftStart && hour < end
    }
    return hour >= g.ShiftStart || hour < end
}
```

Test harness:
```go
func main() {
    guards := []Guard{
        {Name: "Chen", Floor: 1, ShiftStart: 8, ShiftHours: 6, Level: Staff},
        {Name: "Alvarez", Floor: 2, ShiftStart: 14, ShiftHours: 8, Level: Security},
        {Name: "Park", Floor: 3, ShiftStart: 22, ShiftHours: 6, Level: Executive},
    }

    currentHour := 20
    for _, g := range guards {
        fmt.Printf("%s (%s, Floor %d): ends at %d, on duty: %t\n",
            g.Name, g.Level, g.Floor, g.EndHour(), g.IsOnDuty(currentHour))
    }
}
```

Expected output:
```
Chen (Staff, Floor 1): ends at 14, on duty: false
Alvarez (Security, Floor 2): ends at 22, on duty: true
Park (Executive, Floor 3): ends at 4, on duty: false
```

#### Step 3: Struct Embedding

Define an `Equipment` struct and a `RadioEquipment` struct that embeds it. Then add Equipment to the Guard struct.

Teaching moment: struct embedding is Go's version of composition (not inheritance). When you embed a struct, its fields and methods are "promoted" — you can access them directly on the outer struct. `RadioEquipment` embeds `Equipment` and adds radio-specific fields.

```go
type Equipment struct {
    Flashlight bool
    Keycard    bool
}

func (e Equipment) Gear() string {
    gear := ""
    if e.Flashlight {
        gear += "flashlight "
    }
    if e.Keycard {
        gear += "keycard "
    }
    if gear == "" {
        return "none"
    }
    return gear
}

type RadioEquipment struct {
    Equipment
    Channel int
}

func (r RadioEquipment) Gear() string {
    base := r.Equipment.Gear()
    return fmt.Sprintf("%s+ radio ch%d", base, r.Channel)
}
```

Test harness:
```go
func main() {
    basic := Equipment{Flashlight: true, Keycard: false}
    fmt.Println("Basic:", basic.Gear())

    radio := RadioEquipment{
        Equipment: Equipment{Flashlight: true, Keycard: true},
        Channel:   7,
    }
    fmt.Println("Radio:", radio.Gear())
    fmt.Println("Has keycard:", radio.Keycard) // promoted field access
}
```

Expected output:
```
Basic: flashlight
Radio: flashlight keycard + radio ch7
Has keycard: true
```

The last line is the key insight — `radio.Keycard` works without `radio.Equipment.Keycard` because embedding promotes the field.

### Acceptance Criteria

- `Clearance` type uses `iota` in a const block
- `String()` method on Clearance for readable output
- `Guard` struct includes Clearance field
- `EndHour()` correctly handles mod 24 (wrapping past midnight)
- `IsOnDuty()` correctly handles overnight shifts
- `Equipment` struct with a `Gear()` method
- `RadioEquipment` embeds `Equipment` (promoted field access works)
- `RadioEquipment.Gear()` overrides `Equipment.Gear()` while calling it

## XP

- **Step 0 (scaffold):** 40 base, +20 first-try
- **Step 1 (clearance enum):** 80 base, +40 first-try
- **Step 2 (guard struct):** 100 base, +50 first-try
- **Step 3 (embedding):** 100 base, +50 first-try
- **Par time:** 180s total

## Hints

### Step 1
1. "`type Clearance int` creates a new type based on int. use it in a `const ( ... )` block." (−5 energy)
2. "`iota` starts at 0 and increments. first const gets 0, second gets 1, etc." (−8 energy)
3. "add a `String()` method: index into a `[]string{\"Visitor\", \"Staff\", ...}` slice using `c` as the index." (−12 energy)

### Step 2
1. "`type Guard struct { Name string; Floor int; Level Clearance }` — Clearance is just another type." (−5 energy)
2. "`func (g Guard) EndHour() int` — value receiver. `(g.ShiftStart + g.ShiftHours) % 24`" (−8 energy)
3. "overnight: `if end > g.ShiftStart { return hour >= start && hour < end }` else `return hour >= start || hour < end`" (−12 energy)

### Step 3
1. "embedding: put a type name inside a struct with no field name. `type RadioEquipment struct { Equipment; Channel int }`" (−5 energy)
2. "promoted fields: `radio.Keycard` accesses `radio.Equipment.Keycard` automatically." (−8 energy)
3. "override by defining the same method name on the outer struct. call the inner one with `r.Equipment.Gear()`." (−12 energy)

## Timed Events

| Time | Event |
| --- | --- |
| T+10s | Maya message: "every guard has a clearance level. if we can model that, we know exactly who can open what." |
| T+45s | System message: "PATROL ROTATION IMMINENT" |
| T+90s | Rush Mode — "Shift Change Incoming" |

## Rush Mode

- **Duration:** 60 seconds
- **Speed bonus:** Up to +70 XP
- **On expiry:** Jeopardy — Hint Burned (one hint randomly consumed)

## Twist

None — story beat happens at end of chapter:

Maya runs the model and discovers Park (Executive clearance, Floor 3) has an overnight shift with a gap at hour 20. That's their window. Reeves confirms: "Floor 3, hour 20. That's when we move."

## UI State

- **Location label:** FLOOR 3 · PATROL ANALYSIS
- **Concept label:** Structs · Methods · Enums · Embedding
- **Visual state:** Guard roster overlay, patrol timeline visualization

## Teaching Notes

### Enums via iota — Go's unconventional approach

Most languages have `enum` keywords. Go uses `const` blocks with `iota`. It's unusual but powerful — `iota` can be used in expressions (`1 << iota` for bit flags), and the custom type gives you type safety. The `String()` method pattern is how you make enums printable.

### Struct embedding is NOT inheritance

This is critical. Go has no classes, no inheritance. Embedding is composition — the inner struct's fields and methods are promoted to the outer struct for convenience, but the relationship is "has a", not "is a". `RadioEquipment` HAS Equipment, it's not a subclass of Equipment.

### Method override pattern

When `RadioEquipment` defines its own `Gear()`, it shadows `Equipment.Gear()`. But you can still reach the inner one explicitly via `r.Equipment.Gear()`. This is how you "extend" behavior in Go — call the embedded method, add your stuff.

### Pointer receivers preview

Step 2 uses value receivers for simplicity. Mention that pointer receivers (`func (g *Guard) Promote()`) exist for when you need to modify the struct. Full pointer mechanics come naturally in later chapters.
