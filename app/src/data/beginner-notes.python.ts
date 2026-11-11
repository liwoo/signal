// ── Beginner Notes · Python ──
// Reeves' "PYTHON: A Field Manual" chapters for Acts I and II (and Kira's loose
// pages for Act III, with Reeves back for boss 3), under the shared
// challenge ids. Same shape as the Go notes (beginner-notes.ts) — `blocks` is
// the book (BookReader), `notesBlocks` is the in-game NOTES quick reference.
// No `beginnerBlocks` / diagram blocks: those animations are Go-specific.
// Names and wording agree with data/challenges/python/act-1.ts, boss-01.ts, act-2.ts + act-3.ts.

import type { BeginnerNotes } from "./beginner-notes";

export const PYTHON_BEGINNER_NOTES: Record<string, BeginnerNotes> = {
  "chapter-01": {
    title: "PYTHON BASICS",
    subtitle: "WHAT YOU NEED FOR THIS LEVEL",
    blocks: [
      // Section 0: the file is the program
      {
        type: "text",
        section: 0,
        content:
          "a python file is the program. python reads it from the top line to the bottom and runs each line as it gets there. some languages make you build a skeleton first — a package, a main function — before anything runs. python doesn't. one line is a whole program.",
      },
      {
        type: "code",
        section: 0,
        content: `print("Hello World")`,
        hotspots: [
          { text: "print", tip: "a builtin function — always there, nothing to import. it writes what's in the brackets to the terminal, then starts a new line." },
          { text: `"Hello World"`, tip: "a string — text wrapped in quotes. single or double quotes both work, as long as they match." },
        ],
      },
      {
        type: "text",
        section: 0,
        important: true,
        content:
          "text always goes in quotes. without them python reads Hello World as names, not text, and stops with an error.",
      },

      // Section 1: variables + constants
      {
        type: "text",
        section: 1,
        content:
          "a variable is a label stuck on a value. write the name, an equals sign, then the value. no keyword, no type — python works out what kind of value it is.",
      },
      {
        type: "code",
        section: 1,
        content: `cell = "B-09"     # text, in quotes
sublevel = 3      # a number, no quotes

print(cell)       # B-09
print(sublevel)   # 3`,
        hotspots: [
          { text: `cell = "B-09"`, tip: "creates the label cell and sticks it on the text B-09. use the name later and python swaps the value in." },
          { text: "# text, in quotes", tip: "a comment. python ignores everything from # to the end of the line — it's a note for humans." },
          { text: "print(cell)", tip: "no quotes around cell, so python looks the name up and prints its value: B-09." },
        ],
      },
      {
        type: "text",
        section: 1,
        content:
          "some values should never change — maya's cell number, say. python has no keyword to lock a value. instead, a name written in capitals means \"this is a constant, leave it alone.\" it's a convention every python programmer follows, not a rule python enforces.",
      },
      {
        type: "code",
        section: 1,
        content: `CELL = "B-09"
SUBLEVEL = 3`,
        hotspots: [
          { text: "CELL", tip: "upper case = constant, by convention. python would let you change it — the capitals are a promise you won't." },
        ],
      },

      // Section 2: import
      {
        type: "text",
        section: 2,
        content:
          "the terminal ships a file called cellblock.py that already holds maya's location. a python file you can borrow from is called a module. import it once at the top, then reach inside with a dot.",
      },
      {
        type: "code",
        section: 2,
        content: `import cellblock

print(cellblock.CELL)       # B-09
print(cellblock.SUBLEVEL)   # 3`,
        hotspots: [
          { text: "import cellblock", tip: "loads cellblock.py and gives you its name. no .py on the end — just the module's name." },
          { text: "cellblock.CELL", tip: "module name, dot, the value you want. the dot means \"the CELL that lives inside cellblock\"." },
        ],
      },
      {
        type: "text",
        section: 2,
        content:
          "read the values from cellblock — don't type B-09 yourself. the terminal checks that your program actually asks the module, so a typed-in answer won't open anything.",
      },

      // Section 3: f-strings
      {
        type: "text",
        section: 3,
        content:
          "the terminal wants one line: CELL B-09 - SUBLEVEL 3. to mix text and values, use an f-string — put an f right before the opening quote, then drop any value into the text inside curly braces.",
      },
      {
        type: "code",
        section: 3,
        content: `import cellblock

print(f"CELL {cellblock.CELL} - SUBLEVEL {cellblock.SUBLEVEL}")
# CELL B-09 - SUBLEVEL 3`,
        hotspots: [
          { text: `f"`, tip: "the f turns the string into a template. without it, the braces would print as plain text." },
          { text: "{cellblock.CELL}", tip: "python replaces the braces with the value inside them — B-09." },
          { text: "{cellblock.SUBLEVEL}", tip: "works for numbers too — 3 becomes text automatically. no conversion needed." },
        ],
      },
      {
        type: "text",
        section: 3,
        content:
          "f-strings are the python way to build a line of text. you can glue pieces together with + instead, but then every number has to be turned into text by hand. the f-string reads like the output it makes.",
      },
    ],

    notesBlocks: [
      { type: "text", section: 0, important: true, content: "the file is the program — it runs top to bottom." },
      { type: "code", section: 0, content: `print("Hello World")` },
      { type: "text", section: 1, content: "store a value." },
      {
        type: "code",
        section: 1,
        content: `cell = "B-09"   # a variable
SUBLEVEL = 3    # capitals = constant, by convention`,
      },
      { type: "text", section: 2, content: "use another file's values." },
      {
        type: "code",
        section: 2,
        content: `import cellblock

cellblock.CELL   # B-09`,
      },
      { type: "text", section: 3, content: "drop values into text." },
      { type: "code", section: 3, content: `print(f"CELL {cellblock.CELL}")   # CELL B-09` },
    ],
  },

  "chapter-02": {
    title: "LOOPS & BRANCHES",
    subtitle: "CONTROLLING THE FLOW",
    blocks: [
      // Section 0: scaffold recap
      {
        type: "text",
        section: 0,
        content:
          "same start as last time: no skeleton, the file runs from the top. the keypad needs a loop, but first get its terminal live with the one line you already know.",
      },
      {
        type: "code",
        section: 0,
        content: `print("Hello World")`,
        hotspots: [
          { text: `print("Hello World")`, tip: "the whole program. once the terminal answers, the keypad listens." },
        ],
      },

      // Section 1: for + range + indentation
      {
        type: "text",
        section: 1,
        content:
          "the keypad cycles codes 1 to 10. a for loop repeats the same lines once for every value you hand it. range makes the values: range(1, 11) counts 1, 2, 3 ... up to 10.",
      },
      {
        type: "code",
        section: 1,
        content: `for i in range(1, 11):
    print(i)`,
        hotspots: [
          { text: "for i in", tip: "each pass, python puts the next value in i and runs the body. i is just a name — short is fine for a counter." },
          { text: "range(1, 11):", tip: "start at 1, stop BEFORE 11. the colon at the end says \"the loop's body comes next\"." },
          { text: "    print(i)", tip: "indented four spaces, so it's inside the loop. it runs ten times, once per number." },
        ],
      },
      {
        type: "text",
        section: 1,
        important: true,
        content:
          "range stops before its end number. range(1, 10) gives 1 to 9 and never reaches 10 — the classic off-by-one. to count to 10, write 11. give range one number and it starts at 0: range(4) is 0, 1, 2, 3.",
      },
      {
        type: "text",
        section: 1,
        content:
          "there are no curly braces in python. the colon opens a block, and the indentation is the block — every line indented under the for belongs to the loop. use four spaces. the first line that isn't indented is outside the loop again.",
      },

      // Section 2: if / elif / else
      {
        type: "text",
        section: 2,
        content:
          "next the keypad sorts each code into an access level:\n\ncodes 1-3 → DENY\ncodes 4-6 → WARN\ncodes 7-9 → GRANT\ncode 10 → OVERRIDE\n\nif, elif (short for else if) and else pick one path. python checks them top to bottom and runs only the first one that's true.",
      },
      {
        type: "code",
        section: 2,
        content: `for i in range(1, 11):
    if i <= 3:
        print(i, "DENY")
    elif i <= 6:
        print(i, "WARN")
    elif i <= 9:
        print(i, "GRANT")
    else:
        print(i, "OVERRIDE")`,
        hotspots: [
          { text: "if i <= 3:", tip: "<= means less than or equal to. true for 1, 2 and 3. colon, then an indented body — same as the loop." },
          { text: "elif i <= 6:", tip: "only checked when the if above was false, so it catches just 4, 5 and 6." },
          { text: "elif i <= 9:", tip: "only reached when i is above 6 — catches 7, 8 and 9." },
          { text: "else:", tip: "no condition. runs when nothing above matched — here, only code 10." },
          { text: `print(i, "DENY")`, tip: "give print several values, separated by commas, and it puts a space between them: 1 DENY." },
        ],
      },
      {
        type: "text",
        section: 2,
        content:
          "notice the two levels of indent: four spaces for inside the loop, eight for inside a branch. the indentation is how python knows which lines belong to what.",
      },

      // Section 3: the rewrite — a dict lookup table
      {
        type: "text",
        section: 3,
        content:
          "the redundancy step wants the same answers built a second way. look at the chain — every branch just picks a word. that's not really a decision, it's a table. python's table is the dict: like a coat check, you hand over a ticket (the key) and get back the coat (the value).",
      },
      {
        type: "code",
        section: 3,
        content: `levels = {
    1: "DENY", 2: "DENY", 3: "DENY",
    4: "WARN", 5: "WARN", 6: "WARN",
    7: "GRANT", 8: "GRANT", 9: "GRANT",
    10: "OVERRIDE",
}

for i in range(1, 11):
    print(i, levels[i])`,
        hotspots: [
          { text: "levels = {", tip: "curly braces make a dict. it's built once, above the loop." },
          { text: `1: "DENY"`, tip: "one entry: key, colon, value. the commas between entries keep them apart." },
          { text: "levels[i]", tip: "square brackets look a key up. levels[4] gives back \"WARN\". the loop body is one line — the dict does the deciding." },
        ],
      },
      {
        type: "text",
        section: 3,
        important: true,
        content:
          "data instead of branches. all ten codes are listed, one entry each, so there are no conditions left to get wrong. changing a level means changing one word in the table.",
      },
      {
        type: "text",
        section: 3,
        content:
          "python also has match and case for choosing between many options (python 3.10 and newer). it's worth knowing it exists, but this level wants the dict.",
      },

      // Section 4: zen recap
      {
        type: "text",
        section: 4,
        content:
          "three habits for this level. let range do the counting instead of keeping a counter yourself. order your elif conditions so each one only catches what's left. and when every branch just picks a value, a dict says it shorter. the keypad expects:\n\n1 DENY, 2 DENY, 3 DENY, 4 WARN, 5 WARN, 6 WARN, 7 GRANT, 8 GRANT, 9 GRANT, 10 OVERRIDE",
      },
    ],

    notesBlocks: [
      { type: "text", section: 0, important: true, content: "count — range stops before its end." },
      {
        type: "code",
        section: 0,
        content: `for i in range(1, 11):   # 1 to 10
    print(i)`,
      },
      { type: "text", section: 1, content: "branch — the first true condition wins." },
      {
        type: "code",
        section: 1,
        content: `if i <= 3:
    print(i, "DENY")   # 1 DENY
elif i <= 6:
    print(i, "WARN")
elif i <= 9:
    print(i, "GRANT")
else:
    print(i, "OVERRIDE")`,
      },
      { type: "text", section: 2, content: "look it up — data instead of branches." },
      {
        type: "code",
        section: 2,
        content: `levels = {1: "DENY", 10: "OVERRIDE"}
print(10, levels[10])   # 10 OVERRIDE`,
      },
    ],
  },

  "chapter-03": {
    title: "FUNCTIONS",
    subtitle: "BUILDING BLOCKS",
    blocks: [
      // Section 0: scaffold recap
      {
        type: "text",
        section: 0,
        content:
          "same one-line start: get the junction panel live with Hello World. then you'll write functions — named pieces of code you can run again whenever you need them. reeves' margin note says it best: a function is a door you can open twice.",
      },
      {
        type: "code",
        section: 0,
        content: `print("Hello World")`,
      },

      // Section 1: def + return
      {
        type: "text",
        section: 1,
        content:
          "def makes a function. give it a name, list what it takes in the brackets, end the line with a colon, and indent the body underneath — just like a loop.",
      },
      {
        type: "code",
        section: 1,
        content: `def double(n):
    return n * 2

print(double(4))    # 8
print(double(21))   # 42`,
        hotspots: [
          { text: "def double(n):", tip: "def, the name, then the parameters in brackets. n is a name for whatever value the caller passes in." },
          { text: "return n * 2", tip: "return hands a value back to whoever called the function, and the function stops there." },
          { text: "double(4)", tip: "calling the function: its name with a value in the brackets. n becomes 4 and the call is replaced by 8." },
        ],
      },
      {
        type: "text",
        section: 1,
        important: true,
        content:
          "return is not print. print shows a value on the screen. return gives it back so other code can use it. your function should return — the shaft terminal does the printing.",
      },
      {
        type: "text",
        section: 1,
        content:
          "python names functions in snake_case: lowercase words joined by underscores. sum_codes, not sumCodes. and the def has to run before the line that calls it, so functions go near the top of the file.",
      },

      // Section 2: *codes
      {
        type: "text",
        section: 2,
        content:
          "each junction sends a different number of codes — four at one, three at the next. put a star before the parameter and the function takes any number of values. the star gathers them all into one tuple: a fixed list of values in round brackets, like (25, 30, 50, 10).",
      },
      {
        type: "code",
        section: 2,
        content: `def sum_codes(*codes):
    total = 0
    for c in codes:
        total += c
    return total

print(sum_codes(25, 30, 50, 10))   # 115
print(sum_codes(1, 2, 3))          # 6`,
        hotspots: [
          { text: "*codes", tip: "the star collects every argument into a tuple named codes. sum_codes(1, 2, 3) means codes is (1, 2, 3)." },
          { text: "for c in codes:", tip: "the same for you used with range — but now it walks the tuple, one value at a time." },
          { text: "total += c", tip: "adds c to what's already in total. short for total = total + c." },
          { text: "return total", tip: "one job: add up and hand back. no printing in here." },
        ],
      },
      {
        type: "text",
        section: 2,
        content:
          "python also has a builtin that does the adding for you: sum(codes) adds up everything in the tuple. the whole body can be return sum(codes) — either version opens the junction.",
      },

      // Section 3: two return values + unpacking
      {
        type: "text",
        section: 3,
        content:
          "the junction also needs to know if the codes pass: is the total over 100? a function can hand back two values at once — separate them with a comma and python packs them into a tuple. the caller unpacks them into two names, left to right.",
      },
      {
        type: "code",
        section: 3,
        content: `def sum_codes(*codes):
    return sum(codes)

def validate_code(*codes):
    total = sum_codes(*codes)
    return total, total > 100

s, v = validate_code(25, 30, 50, 10)
print(f"Result: {s}, Valid: {v}")
# Result: 115, Valid: True`,
        hotspots: [
          { text: "total = sum_codes(*codes)", tip: "the star works the other way in a call: it unpacks the tuple back into separate values. without it, sum_codes would get one value — the whole tuple — and fail." },
          { text: "return total, total > 100", tip: "two values, one comma. the caller gets the tuple (115, True)." },
          { text: "s, v =", tip: "unpacking — s gets the first value, v the second. the number of names must match the number of values." },
        ],
      },
      {
        type: "text",
        section: 3,
        important: true,
        content:
          "a comparison is already a yes-or-no value — a bool. total > 100 is either True or False, and python prints them with a capital letter. you don't need an if to produce it.",
      },

      // Section 4: zen recap
      {
        type: "text",
        section: 4,
        content:
          "four habits for this level. name functions in snake_case. keep each one to a single job — sum_codes sums, validate_code checks, neither prints. reuse what you built instead of writing the adding twice. and return a comparison directly instead of wrapping it in if and else.",
      },
      {
        type: "code",
        section: 4,
        content: `# direct — clean
return total, total > 100

# wrapped — works, but four extra lines
if total > 100:
    return total, True
else:
    return total, False`,
        hotspots: [
          { text: "return total, total > 100", tip: "the comparison already is the bool. return it as it is." },
          { text: "return total, True", tip: "works, but the if and else spell out what the comparison already says." },
        ],
      },
    ],

    notesBlocks: [
      { type: "text", section: 0, important: true, content: "a function — def it, return a value." },
      {
        type: "code",
        section: 0,
        content: `def double(n):
    return n * 2

double(4)   # 8`,
      },
      { type: "text", section: 1, content: "*args — any number of values, gathered into a tuple." },
      {
        type: "code",
        section: 1,
        content: `def sum_codes(*codes):
    total = 0
    for c in codes:
        total += c
    return total`,
      },
      { type: "text", section: 2, content: "two values out, unpacked into two names." },
      {
        type: "code",
        section: 2,
        content: `def validate_code(*codes):
    total = sum_codes(*codes)
    return total, total > 100

s, v = validate_code(60, 50)   # 110, True`,
      },
    ],
  },

  "boss-01": {
    title: "WEAPON SYSTEMS",
    subtitle: "PYTHON SURVIVAL GUIDE FOR THE LOCKMASTER",
    blocks: [
      // Section 0: tactics
      {
        type: "text",
        section: 0,
        content:
          "the lockmaster fights in real time. your weapon fires on its own whenever you have a clear line to it and it's in range. its shots cost hearts and land where you're standing, so keep moving. a server rack between you breaks its line of sight — and yours.",
      },
      {
        type: "text",
        section: 0,
        important: true,
        content:
          "when it hardens and your weapon goes cold, duck to a lit pad. the fight freezes while you're in cover. fix the weapon, rearm, step back out. three covers, three upgrades — every one built from what you already know.",
      },

      // Section 1: sight — variables + print
      {
        type: "text",
        section: 1,
        content:
          "first cover: sight. a cold weapon is useless. give it damage 12, fire rate 500 and range 6, then print the spec line. three variables and one print — chapter one.",
      },
      {
        type: "code",
        section: 1,
        content: `damage = 12
fire_rate = 500
reach = 6
print("DMG", damage, "RATE", fire_rate, "RANGE", reach)
# DMG 12 RATE 500 RANGE 6`,
        hotspots: [
          { text: "damage = 12", tip: "the starter sets every trait to 0. change the value, keep the name." },
          { text: `print("DMG", damage, "RATE"`, tip: "print puts a space between each value, so the words and numbers line up into the spec line." },
        ],
      },

      // Section 2: charge — counting loop
      {
        type: "text",
        section: 2,
        content:
          "second cover: charge. single shots stop landing, so overclock the rate: loop over the four capacitors, adding 90 each pass. chapter two's loop, building a total.",
      },
      {
        type: "code",
        section: 2,
        content: `rate = 0
for i in range(4):
    rate += 90
print(rate)   # 360`,
        hotspots: [
          { text: "range(4)", tip: "one number: start at 0, stop before 4. that's 0, 1, 2, 3 — four passes, not five." },
          { text: "rate += 90", tip: "adds to what's already there. rate = 90 would just overwrite it four times and leave 90." },
        ],
      },
      {
        type: "text",
        section: 2,
        content:
          "the starter's loop body is pass — python's \"nothing here yet\" placeholder, since a block can't be empty. replace it with rate += 90, still indented four spaces.",
      },

      // Section 3: combo — *mods
      {
        type: "text",
        section: 3,
        content:
          "last cover: combo. sum the three modules into one overload shot. combo has the same shape as sum_codes from chapter three — the star gathers the modules into a tuple, and you add each one to total.",
      },
      {
        type: "code",
        section: 3,
        content: `def combo(*mods):
    total = 0
    for m in mods:
        total += m
    return total

damage = combo(8, 7, 7)
print("DMG", damage, "RATE", 260, "RANGE", 8)
# DMG 22 RATE 260 RANGE 8`,
        hotspots: [
          { text: "*mods", tip: "combo(8, 7, 7) makes mods the tuple (8, 7, 7)." },
          { text: "for m in mods:", tip: "walk the modules one at a time and add each one in." },
          { text: "return total", tip: "hand the sum back. return sum(mods) works too." },
        ],
      },

      // Section 4: recap
      {
        type: "text",
        section: 4,
        content:
          "three things carry you through: print puts spaces between its values. range stops before its end. the star gathers arguments into a tuple. keep moving, take cover when it hardens, and end it.",
      },
    ],

    notesBlocks: [
      { type: "text", section: 0, important: true, content: "cold weapon → lit pad → fight freezes → fix → rearm." },
      { type: "text", section: 1, content: "sight — set three values, print the spec." },
      { type: "code", section: 1, content: `print("DMG", damage, "RATE", fire_rate, "RANGE", reach)` },
      { type: "text", section: 2, content: "charge — range(4) is four passes." },
      {
        type: "code",
        section: 2,
        content: `for i in range(4):
    rate += 90   # 360`,
      },
      { type: "text", section: 3, content: "combo — sum every argument." },
      {
        type: "code",
        section: 3,
        content: `def combo(*mods):
    return sum(mods)`,
      },
    ],
  },
  "chapter-04": {
    title: "DICTS & SETS",
    subtitle: "KEYS, VALUES, AND WHO'S WHERE",
    blocks: [
      // Section 0: scaffold
      {
        type: "text",
        section: 0,
        content:
          "same first line as always: wake the surveillance terminal with Hello World. nothing to import this chapter — dictionaries and sets are built into python, ready the moment the file runs.",
      },
      {
        type: "code",
        section: 0,
        content: `print("Hello World")`,
      },

      // Section 1: dict literal + lookup
      {
        type: "text",
        section: 1,
        content:
          "you met the dict at the keypad: a ticket in, a coat out. this time the tickets are names. each guard is a key, their floor is the value, and a colon sits between them. curly braces hold the whole thing, commas separate the pairs.",
      },
      {
        type: "code",
        section: 1,
        content: `guards = {
    "Chen": "Floor 1",
    "Volkov": "Floor 2",
    "Park": "Floor 3",
}

print(guards["Volkov"])   # Floor 2
print(len(guards))        # 3`,
        hotspots: [
          { text: `"Chen": "Floor 1",`, tip: "one pair: the key, a colon, the value, a comma. names and floors are text, so both go in quotes." },
          { text: `guards["Volkov"]`, tip: "a lookup. square brackets with a key hand back its value — no searching, python jumps straight to it." },
          { text: "len(guards)", tip: "len counts the pairs — one per key." },
        ],
      },
      {
        type: "text",
        section: 1,
        content:
          "with more than a couple of pairs, give each its own line and end every line with a comma — even the last one. add a guard later and only one line changes. dicts also remember the order you wrote them in, though you'll always look things up by key.",
      },
      {
        type: "text",
        section: 1,
        important: true,
        content:
          "each key appears once. write the same name twice and python keeps the last value without a word of warning — and len comes up one short. ask for a key that isn't there and python raises a KeyError; guards.get(\"Nobody\") hands back None instead.",
      },

      // Section 2: returning a dict
      {
        type: "text",
        section: 2,
        content:
          "the terminal won't read a dict you leave lying around. it calls a function and looks guards up in whatever comes back. a function can return a dict like any other value — and the literal can go straight after return.",
      },
      {
        type: "code",
        section: 2,
        content: `def build_roster():
    return {
        "Chen": "Floor 1",
        "Alvarez": "Floor 2",
        "Volkov": "Floor 2",
        "Park": "Floor 3",
        "Santos": "Floor 1",
    }

r = build_roster()
print(r["Chen"])   # Floor 1`,
        hotspots: [
          { text: "def build_roster():", tip: "empty brackets — it needs nothing from the caller. the roster is the same every time." },
          { text: "return {", tip: "the dict literal is the return value. no need to name it first." },
          { text: "r = build_roster()", tip: "the caller gets the whole dict back and can look anyone up." },
        ],
      },

      // Section 3: looping over a dict
      {
        type: "text",
        section: 3,
        content:
          "a for loop walks a dict too. on its own it hands you the keys. ask for .values() and you get the values instead, or .items() for both at once, as pairs.",
      },
      {
        type: "code",
        section: 3,
        content: `for name in guards:
    print(name)            # Chen, Volkov, Park

for floor in guards.values():
    print(floor)           # Floor 1, Floor 2, Floor 3

for name, floor in guards.items():
    print(name, floor)     # Chen Floor 1 ...`,
        hotspots: [
          { text: "for name in guards:", tip: "looping over the dict itself gives you the keys — the names." },
          { text: "guards.values()", tip: "just the values — the floors. use it when you don't care who's there, only where." },
          { text: "guards.items()", tip: "key and value together. two names after for, a comma between them." },
        ],
      },

      // Section 4: sets
      {
        type: "text",
        section: 4,
        content:
          "to find an empty floor, first collect every floor that has a guard. a set is made for that: it holds each value once, drops the repeats, keeps no order, and answers in or not in at once instead of checking item by item like a list would.",
      },
      {
        type: "code",
        section: 4,
        content: `occupied = set(guards.values())
print(occupied)   # {'Floor 1', 'Floor 2', 'Floor 3'} — in any order

print("Floor 2" in occupied)      # True
print("Floor 4" not in occupied)  # True`,
        hotspots: [
          { text: "set(guards.values())", tip: "set() takes any group of values and keeps one of each. two guards on floor 2 still means one Floor 2." },
          { text: `"Floor 2" in occupied`, tip: "membership — True or False. a set answers without looking at every item." },
          { text: "not in", tip: "the opposite test, written as one operator. reads like english." },
        ],
      },
      {
        type: "text",
        section: 4,
        important: true,
        content:
          "go has no set type — you fake one with a map from each value to true. python has the real thing. one trap: {} on its own is an empty dict, not a set. an empty set is set().",
      },

      // Section 5: finding the gap
      {
        type: "text",
        section: 5,
        content:
          "now walk the floors from 1 to the top and stop at the first one nobody's on. range stops before its end, so add one to reach the top floor. build each floor's name with an f-string so it matches the roster exactly.",
      },
      {
        type: "code",
        section: 5,
        content: `def find_clear_floor(guards, max_floor):
    occupied = set(guards.values())
    for i in range(1, max_floor + 1):
        name = f"Floor {i}"
        if name not in occupied:
            return name

print(find_clear_floor(build_roster(), 4))   # Floor 4`,
        hotspots: [
          { text: "range(1, max_floor + 1)", tip: "1 up to and including max_floor. without the + 1, the top floor never gets checked." },
          { text: `f"Floor {i}"`, tip: "capital F, one space, the number — exactly how the roster writes it, or nothing will match." },
          { text: "return name", tip: "the first gap wins. return stops the loop right there." },
        ],
      },
      {
        type: "text",
        section: 5,
        content:
          "max_floor comes in as a parameter. the terminal tries a four-floor building and a three-floor one, so the loop has to use it — not a number you picked.",
      },

      // Section 6: zen recap
      {
        type: "text",
        section: 6,
        content:
          "habits for this level. write the dict as one literal, one pair per line, trailing commas. ask for exactly what you need — .values() when the names don't matter. put things you'll test with in into a set. and write name not in occupied, not not name in occupied.",
      },
      {
        type: "code",
        section: 6,
        content: `# one literal — clean
roster = {
    "Chen": "Floor 1",
    "Park": "Floor 3",
}

# filled in by hand — works, but noisier
roster = {}
roster["Chen"] = "Floor 1"
roster["Park"] = "Floor 3"`,
        hotspots: [
          { text: `roster = {}`, tip: "an empty dict, filled one assignment at a time. fine when you're building it as you go — not when you already know every pair." },
        ],
      },
    ],

    notesBlocks: [
      { type: "text", section: 0, important: true, content: "a dict — keys to values, looked up by key." },
      {
        type: "code",
        section: 0,
        content: `guards = {
    "Chen": "Floor 1",
    "Volkov": "Floor 2",
}
guards["Volkov"]   # Floor 2
len(guards)        # 2`,
      },
      { type: "text", section: 1, content: "the values, gathered into a set." },
      {
        type: "code",
        section: 1,
        content: `occupied = set(guards.values())
"Floor 3" not in occupied   # True`,
      },
      { type: "text", section: 2, content: "walk the floors, return the first gap." },
      {
        type: "code",
        section: 2,
        content: `for i in range(1, max_floor + 1):
    name = f"Floor {i}"
    if name not in occupied:
        return name`,
      },
    ],
  },

  "chapter-04.2": {
    title: "STRINGS & SLICES",
    subtitle: "THE CIPHER, AND WHAT TO DO WHEN IT BREAKS",
    blocks: [
      // Section 0: scaffold
      {
        type: "text",
        section: 0,
        content:
          "bring the relay online with Hello World. other languages need three imports for this chapter's work. python needs none: slicing, split, join, int and str are all built in.",
      },
      {
        type: "code",
        section: 0,
        content: `print("Hello World")`,
      },

      // Section 1: strings are sequences
      {
        type: "text",
        section: 1,
        content:
          "a string is a sequence of characters, and you can reach into it by position. positions start at 0. negative positions count from the end, so -1 is always the last character.",
      },
      {
        type: "code",
        section: 1,
        content: `word = "relay"
print(word[0])     # r
print(word[-1])    # y
print(len(word))   # 5`,
        hotspots: [
          { text: "word[0]", tip: "the first character. python counts from 0, so the fifth one is word[4]." },
          { text: "word[-1]", tip: "the last character, whatever the length. -2 is the one before it." },
        ],
      },
      {
        type: "text",
        section: 1,
        important: true,
        content:
          "strings can't be changed in place. word[0] = \"R\" stops with a TypeError. to change a string you build a new one — every trick in this chapter returns a fresh string and leaves the old one alone.",
      },

      // Section 2: slicing
      {
        type: "text",
        section: 2,
        content:
          "a slice takes a piece of the string: [start:stop]. like range, it stops before stop. leave start empty to begin at the front, leave stop empty to run to the end. a third number is the step — and a step of -1 walks backwards.",
      },
      {
        type: "code",
        section: 2,
        content: `word = "hello"
print(word[1:4])    # ell
print(word[:3])     # hel
print(word[::2])    # hlo
print(word[::-1])   # olleh`,
        hotspots: [
          { text: "word[1:4]", tip: "from position 1 up to, but not including, position 4." },
          { text: "word[::2]", tip: "the whole word, every second character." },
          { text: "word[::-1]", tip: "empty start, empty stop, step -1: the whole word, back to front. that's the cipher." },
        ],
      },
      {
        type: "code",
        section: 2,
        content: `def reverse_word(s):
    return s[::-1]

print(reverse_word("relay"))   # yaler`,
        hotspots: [
          { text: "return s[::-1]", tip: "a new, reversed string. s itself is untouched." },
        ],
      },
      {
        type: "text",
        section: 2,
        content:
          "python strings hold whole unicode characters, not raw bytes, so a slice never cuts an accented letter in half. there's also reversed(s), but it hands back an iterator you'd have to glue together again — the slice is shorter.",
      },

      // Section 3: lists, split, join
      {
        type: "text",
        section: 3,
        content:
          "a whole message needs each word reversed on its own. split() breaks a string into a list — an ordered row of values in square brackets. unlike a tuple, a list can grow: append adds to the end. join does the opposite of split: the string you call it on goes between every item.",
      },
      {
        type: "code",
        section: 3,
        content: `words = "floor is clear".split()
print(words)              # ['floor', 'is', 'clear']

flipped = []
for w in words:
    flipped.append(reverse_word(w))

print(" ".join(flipped))  # roolf si raelc`,
        hotspots: [
          { text: ".split()", tip: "empty brackets split on any run of spaces and never hand back an empty word. split(\" \") would, wherever there's a double space." },
          { text: "flipped.append(reverse_word(w))", tip: "adds one reversed word to the end of the list." },
          { text: `" ".join(flipped)`, tip: "one string, with a single space between each word — and none on the ends." },
        ],
      },
      {
        type: "text",
        section: 3,
        content:
          "that loop builds a list from another list — common enough that python has a one-line form, the comprehension: the expression, then the for, inside square brackets. inside join you can even drop the brackets.",
      },
      {
        type: "code",
        section: 3,
        content: `flipped = [reverse_word(w) for w in words]

def encode(msg):
    return " ".join(reverse_word(w) for w in msg.split())

print(encode(encode("round trip")))   # round trip`,
        hotspots: [
          { text: "[reverse_word(w) for w in words]", tip: "a list comprehension: what to make, then where it comes from. same list as the append loop." },
          { text: "encode(encode(", tip: "reverse every word twice and you're back where you started. that's how reeves decodes." },
        ],
      },

      // Section 4: int and str
      {
        type: "text",
        section: 4,
        content:
          "text and numbers are different things, even when they look alike. \"50\" is two characters; 50 is a number. int() reads text as a number, str() writes a number as text. an f-string does the str() part for you.",
      },
      {
        type: "code",
        section: 4,
        content: `code = "50"
n = int(code)
print(n * 2)       # 100
print(code * 2)    # 5050
print(f"F{2}-C{n * 2}")   # F2-C100`,
        hotspots: [
          { text: "int(code)", tip: "text in, number out. now arithmetic works." },
          { text: "code * 2", tip: "text times 2 repeats the text. no error — just the wrong answer. convert first." },
        ],
      },
      {
        type: "text",
        section: 4,
        important: true,
        content:
          "int(\"abc\") can't work, so python raises a ValueError. if nothing catches it, the program stops right there with a traceback — the whole relay goes down over one bad code.",
      },

      // Section 5: try / except
      {
        type: "text",
        section: 5,
        content:
          "python's answer is try and except. put the risky line under try. if it raises, python skips the rest of the try and jumps to the except that names that error. if it doesn't, the except never runs. python people call this easier to ask forgiveness than permission: just try it, and handle the failure.",
      },
      {
        type: "code",
        section: 5,
        content: `def relay_header(floor, code):
    try:
        n = int(code)
    except ValueError:
        return f"F{floor}-ERR"
    return f"F{floor}-C{n * 2}"

print(relay_header(2, "50"))    # F2-C100
print(relay_header(3, "abc"))   # F3-ERR`,
        hotspots: [
          { text: "n = int(code)", tip: "the only line that can fail, so it's the only line inside the try." },
          { text: "except ValueError:", tip: "catches exactly the error int raises on bad text. anything else still crashes loudly, where you can see it." },
          { text: `return f"F{floor}-C{n * 2}"`, tip: "the happy path, after the try. you only get here if the conversion worked." },
        ],
      },
      {
        type: "text",
        section: 5,
        content:
          "name the error you expect. a bare except: catches everything — a typo, a wrong name — and quietly turns it into ERR. the zen of python: errors should never pass silently, unless explicitly silenced.",
      },

      // Section 6: three error models
      {
        type: "text",
        section: 6,
        content:
          "reeves' last margin note compares three languages on the same bad input. go hands the error back: the conversion returns two values, the number and an error, and you check the error before going on. python raises it: the failure jumps out of the normal flow until an except catches it. javascript does neither — Number(\"abc\") quietly hands back NaN, \"not a number\", and you have to notice it yourself.",
      },
      {
        type: "text",
        section: 6,
        important: true,
        content:
          "returned, raised, or quietly poisoned — three answers to the same question: what happens when the input is garbage. in python, if you don't catch it, it stops you. that's a feature.",
      },

      // Section 7: zen recap
      {
        type: "text",
        section: 7,
        content:
          "habits for this level. slice instead of looping when a slice says it. split() with no argument. join the words instead of gluing with +=. a comprehension when you're turning one list into another. keep the try small and catch the one error you expect. and build text with f-strings.",
      },
      {
        type: "code",
        section: 7,
        content: `# narrow — clean
try:
    n = int(code)
except ValueError:
    return f"F{floor}-ERR"

# bare — hides every mistake as ERR
try:
    n = int(code)
except:
    return f"F{floor}-ERR"`,
        hotspots: [
          { text: "except ValueError:", tip: "only bad numbers land here." },
          { text: "except:", tip: "everything lands here, typos included. avoid it." },
        ],
      },
    ],

    notesBlocks: [
      { type: "text", section: 0, important: true, content: "slice backwards — [start:stop:step]." },
      {
        type: "code",
        section: 0,
        content: `def reverse_word(s):
    return s[::-1]`,
      },
      { type: "text", section: 1, content: "split into a list, reverse each, join with spaces." },
      {
        type: "code",
        section: 1,
        content: `def encode(msg):
    return " ".join(reverse_word(w) for w in msg.split())`,
      },
      { type: "text", section: 2, content: "int() raises ValueError on bad text — catch it." },
      {
        type: "code",
        section: 2,
        content: `try:
    n = int(code)
except ValueError:
    return f"F{floor}-ERR"
return f"F{floor}-C{n * 2}"`,
      },
    ],
  },
  // ── Act III: Kira's pages ──
  // Reeves' manual ends at chapter six. These chapters are loose sheets in
  // Kira's hand — sharp, and priced. The boss chapter is Reeves again.

  "chapter-07": {
    title: "CLOSURES & RECURSION",
    subtitle: "KIRA'S PAGES · THE ARCHIVE, AND WHAT IT HIDES",
    blocks: [
      // Section 0: scaffold
      {
        type: "text",
        section: 0,
        content:
          "these pages aren't reeves'. the hand is sharper, the margins are full of prices. first line across the top: wake the archive terminal. you know how. — k.",
      },
      {
        type: "code",
        section: 0,
        content: `print("Hello World")`,
      },

      // Section 1: the archive
      {
        type: "text",
        section: 1,
        content:
          "the archive is a dict. each key is a directory, each value is a list of what's inside it. a name ending in / is another directory — look it up by the same name without the slash. anything else is a file. you've seen every piece of this already: dicts in chapter four, slices in chapter six.",
      },
      {
        type: "code",
        section: 1,
        content: `archive = {
    "root": ["config.dat", "logs/", "servers/"],
    "logs": ["access.log", "error.log"],
}

for entry in archive["root"]:
    if entry.endswith("/"):
        print("directory:", entry[:-1])
    else:
        print("file:", entry)`,
        hotspots: [
          { text: `entry.endswith("/")`, tip: "true when the last character is a slash. reads like the question you're asking." },
          { text: "entry[:-1]", tip: "everything except the last character — \"logs/\" becomes \"logs\", the key you look up next." },
        ],
      },
      {
        type: "text",
        section: 1,
        content:
          "kira, in the margin: a list goes one level deep. this archive goes as deep as whoever built it wanted. you need something that keeps going.",
      },

      // Section 2: closures
      {
        type: "text",
        section: 2,
        content:
          "a function can be defined inside another function. the inner one can read every name the outer one has — archive, root, count — without them being passed in. a function that remembers where it was made is called a closure.",
      },
      {
        type: "code",
        section: 2,
        content: `def scan_archive(archive, root):
    count = 0

    def scan(d):
        nonlocal count
        count += len(archive[d])

    scan(root)
    return count`,
        hotspots: [
          { text: "def scan(d):", tip: "defined inside scan_archive, so it can see archive and count." },
          { text: "nonlocal count", tip: "i mean the count one level up — not a new one of my own." },
        ],
      },
      {
        type: "text",
        section: 2,
        important: true,
        content:
          "reading an outer name is free. changing one is not. the moment scan says count += 1, python decides count belongs to scan — a brand-new variable with no value yet — and stops with UnboundLocalError. nonlocal count is how scan says: the one outside. other languages let a closure change the outer variable silently. python makes you say it.",
      },
      {
        type: "text",
        section: 2,
        content:
          "a list is different. errors.append(...) changes the list but never gives the name errors a new value, so it needs no nonlocal. the old trick of keeping a counter in a one-item list, count[0] += 1, comes from before nonlocal existed. don't pay for a workaround you don't need. — k.",
      },

      // Section 3: recursion
      {
        type: "text",
        section: 3,
        content:
          "recursion is a function calling itself. scan(\"root\") finds servers/ and calls scan(\"servers\"), which finds alpha/ and calls scan(\"alpha\"). each call has its own d, finishes its own directory, and hands control back to the one that called it. a directory with nothing but files makes no further calls — that's where it stops.",
      },
      {
        type: "code",
        section: 3,
        content: `def scan(d):
    nonlocal count
    for entry in archive[d]:
        if entry.endswith("/"):
            scan(entry[:-1])
        else:
            count += 1`,
        hotspots: [
          { text: "scan(entry[:-1])", tip: "the function calling itself, one level deeper. it returns when that whole directory is done." },
          { text: "count += 1", tip: "a file. the only thing that actually gets counted." },
        ],
      },
      {
        type: "text",
        section: 3,
        content:
          "root starts first and finishes last — everything inside it has to finish before it can. hold on to that order. it's the whole trick of the next section.",
      },

      // Section 4: try / finally
      {
        type: "text",
        section: 4,
        content:
          "finally is the part of a try that always runs as the block is left — when it finishes normally, when it returns, when something inside raises. put the log there and every directory reports on its way out.",
      },
      {
        type: "code",
        section: 4,
        content: `def scan(d):
    nonlocal count
    try:
        for entry in archive[d]:
            if entry.endswith("/"):
                scan(entry[:-1])
            else:
                count += 1
    finally:
        print("scanned:", d)

# scanned: logs
# scanned: alpha
# ...
# scanned: root`,
        hotspots: [
          { text: "try:", tip: "the work. whatever happens in here, finally runs after it." },
          { text: `print("scanned:", d)`, tip: "runs on the way out, so the deepest directories log first and root logs last." },
        ],
      },
      {
        type: "text",
        section: 4,
        content:
          "go has a word for this — defer — and puts the cleanup at the top of the function. python wraps the body instead. different shape, same order out.",
      },

      // Section 5: raise and except
      {
        type: "text",
        section: 5,
        content:
          "ghost booby-trapped the archive: one directory's value is None instead of a list. raise is how a function says something is wrong. it stops the function on the spot and travels back up the calls until an except catches it. if nothing does, the program dies.",
      },
      {
        type: "code",
        section: 5,
        content: `def scan(d):
    nonlocal count
    try:
        if archive[d] is None:
            raise RuntimeError("corrupted directory")
        for entry in archive[d]:
            ...
    except Exception as e:
        errors.append(f"{d}: {e}")
    finally:
        print("scanned:", d)`,
        hotspots: [
          { text: "archive[d] is None", tip: "is None, not == None. there's only one None — pep 8 says check it by identity." },
          { text: `raise RuntimeError("corrupted directory")`, tip: "a named error, with the message the log will carry." },
          { text: "except Exception as e:", tip: "catches it and names it e. f\"{e}\" is the message." },
          { text: "finally:", tip: "still runs — the trapped directory logs too, after the except has recorded it." },
        ],
      },
      {
        type: "text",
        section: 5,
        important: true,
        content:
          "where you catch decides what you lose. wrap the whole scan in one try and the first trap ends everything. catch inside scan and each call guards itself: the vault's call catches the vault's error and returns normally, and root's loop moves on to the next entry. catch at the edge of one unit of work.",
      },
      {
        type: "text",
        section: 5,
        content:
          "a note for anyone who reads go too: go's panic is for disasters, and catching one is rare and awkward. python is the other way round. exceptions are the normal error path — int(\"abc\") raised one back in chapter six — and except is an everyday word. use it like one. — k.",
      },

      // Section 6: zen recap
      {
        type: "text",
        section: 6,
        content:
          "habits for this level. say nonlocal when a closure changes a name. put cleanup in finally. ask endswith instead of counting from the end. raise a specific error, check for None with is, and catch where one piece of work ends — not around the whole job.",
      },
      {
        type: "code",
        section: 6,
        content: `# a workaround
count = [0]
count[0] += 1

# the real thing
count = 0
nonlocal count
count += 1`,
        hotspots: [
          { text: "count[0] += 1", tip: "works, but it's hiding what you mean." },
          { text: "nonlocal count", tip: "says exactly which variable the closure changes." },
        ],
      },
    ],

    notesBlocks: [
      { type: "text", section: 0, important: true, content: "a closure changing an outer name needs nonlocal." },
      {
        type: "code",
        section: 0,
        content: `count = 0

def scan(d):
    nonlocal count
    count += 1`,
      },
      { type: "text", section: 1, content: "call yourself for each directory; finally logs on the way out." },
      {
        type: "code",
        section: 1,
        content: `try:
    for entry in archive[d]:
        if entry.endswith("/"):
            scan(entry[:-1])
        else:
            count += 1
finally:
    print("scanned:", d)`,
      },
      { type: "text", section: 2, content: "raise on the trap, catch per call, keep walking." },
      {
        type: "code",
        section: 2,
        content: `if archive[d] is None:
    raise RuntimeError("corrupted directory")
...
except Exception as e:
    errors.append(f"{d}: {e}")`,
      },
    ],
  },

  "chapter-08": {
    title: "TASKS & GATHER",
    subtitle: "KIRA'S PAGES · FOUR HANDS, ONE MOMENT",
    blocks: [
      // Section 0: scaffold
      {
        type: "text",
        section: 0,
        content:
          "another sheet, taped behind breaker four. first line: bring the console online. after that, everything on this page happens at once. — k.",
      },
      {
        type: "code",
        section: 0,
        content: `print("Hello World")`,
      },
      {
        type: "text",
        section: 0,
        content:
          "everything new in this chapter lives in one module, asyncio. import it in the step that first uses it — not before.",
      },

      // Section 1: async def and coroutines
      {
        type: "text",
        section: 1,
        content:
          "put async in front of def and calling the function changes meaning. cut(\"North\") no longer runs anything. it hands you a coroutine — a plan for the work, waiting for someone to carry it out. await carries it out and waits for it to finish.",
      },
      {
        type: "code",
        section: 1,
        content: `import asyncio


async def cut(name):
    print(f"{name} circuit: DOWN")


plan = cut("North")    # nothing printed yet
await plan             # North circuit: DOWN`,
        hotspots: [
          { text: "async def cut(name):", tip: "an async function. calling it makes a coroutine; it doesn't run the body." },
          { text: `plan = cut("North")`, tip: "just a plan. if nobody awaits it, python warns: coroutine was never awaited." },
          { text: "await plan", tip: "runs it, and waits here until it's done." },
        ],
      },
      {
        type: "text",
        section: 1,
        important: true,
        content:
          "await only works inside an async def. the terminal is the exception — it lets you write await at the top level, the way a python shell started with python -m asyncio does. in your own functions, if it awaits, it's async def.",
      },

      // Section 2: the event loop
      {
        type: "text",
        section: 2,
        content:
          "asyncio does many things at once with one thread, by taking turns. an event loop holds every task that wants to run. whenever the running one pauses at an await, the loop hands the turn to the next. nothing runs at the exact same instant — but nothing waits idle either.",
      },
      {
        type: "code",
        section: 2,
        content: `async def trip(name, seconds):
    await asyncio.sleep(seconds)    # step aside
    return f"{name} circuit: DOWN"`,
        hotspots: [
          { text: "await asyncio.sleep(seconds)", tip: "pause this one task. the loop runs the others meanwhile. seconds, not milliseconds." },
        ],
      },
      {
        type: "text",
        section: 2,
        important: true,
        content:
          "never time.sleep inside async code. it doesn't pause a task — it freezes the whole program, loop and all, and every other breaker waits with it. kira's margin: one wrong sleep and four hands become one.",
      },

      // Section 3: create_task
      {
        type: "text",
        section: 3,
        content:
          "asyncio.create_task puts a coroutine on the loop's schedule and hands back a task straight away. the caller doesn't wait — it carries on with the next line. the task runs the next time anyone pauses.",
      },
      {
        type: "code",
        section: 3,
        content: `def cut_async(name):
    return asyncio.create_task(cut(name))


cut_async("South")
print("orders sent")
await asyncio.sleep(0.1)

# orders sent
# South circuit: DOWN`,
        hotspots: [
          { text: "def cut_async(name):", tip: "a plain def. it never waits, so it doesn't need to be async." },
          { text: "return asyncio.create_task(cut(name))", tip: "schedule it and hand the task back. keep a reference — the loop only holds tasks loosely." },
          { text: "await asyncio.sleep(0.1)", tip: "the first pause. that's when south finally gets its turn." },
        ],
      },
      {
        type: "text",
        section: 3,
        important: true,
        content:
          "a task nobody waits for never finishes. when the program ends, unfinished tasks are cancelled, the way asyncio.run does it. go does the same to its unfinished work when main returns. if the work matters, something has to wait for it.",
      },

      // Section 4: gather
      {
        type: "text",
        section: 4,
        content:
          "four breakers, all at once, and you need to know every one confirmed. asyncio.gather takes coroutines, runs them together, waits until all of them are done, and returns their results as a list — in the order you passed them, not the order they finished.",
      },
      {
        type: "code",
        section: 4,
        content: `async def trip(name):
    return f"{name} circuit: DOWN"


async def cut_all(circuits):
    return await asyncio.gather(*(trip(n) for n in circuits))`,
        hotspots: [
          { text: "(trip(n) for n in circuits)", tip: "one coroutine per circuit — the same for-inside-brackets shape as the join in chapter six." },
          { text: "*(", tip: "the star spreads them out into separate arguments. gather won't take a single list." },
          { text: "return await asyncio.gather", tip: "start them all, wait once, hand back the list." },
        ],
      },
      {
        type: "text",
        section: 4,
        content:
          "go needs two tools for this — a counter of who's still running and a slice to put results in. gather is both, in one call. awaiting each coroutine in a for loop would also work, one after another — and that's exactly the problem in the next section.",
      },

      // Section 5: zip
      {
        type: "text",
        section: 5,
        content:
          "each breaker takes its own time to trip. the names are in one list, the delays in another, in the same order. zip walks both side by side and hands you a pair each time round.",
      },
      {
        type: "code",
        section: 5,
        content: `circuits = ["North", "South"]
delays = [300, 150]

for n, d in zip(circuits, delays):
    print(n, d)
# North 300
# South 150`,
        hotspots: [
          { text: "zip(circuits, delays)", tip: "pairs item 0 with item 0, item 1 with item 1. stops at the shorter list." },
          { text: "for n, d in", tip: "each pair unpacks straight into two names, like a tuple from a function." },
        ],
      },

      // Section 6: the window
      {
        type: "text",
        section: 6,
        content:
          "one power cycle is 1100 milliseconds. the four delays — 300, 150, 450, 200 — add up to exactly that. so the order you wait in decides everything.",
      },
      {
        type: "code",
        section: 6,
        content: `async def cut_timed(circuits, delays):
    async def trip_timed(n, d):
        await asyncio.sleep(d / 1000)
        return f"{n} circuit: DOWN ({d}ms)"

    return await asyncio.gather(*(trip_timed(n, d) for n, d in zip(circuits, delays)))`,
        hotspots: [
          { text: "d / 1000", tip: "milliseconds to seconds. one slash — d // 1000 would round 300 down to 0." },
          { text: "asyncio.gather", tip: "all four sleep at the same time, so the whole thing takes as long as the slowest: 450ms." },
        ],
      },
      {
        type: "text",
        section: 6,
        important: true,
        content:
          "await each sleep in a loop and the delays queue up end to end: 1100ms, two power cycles, alarm. gather them and they overlap: 450ms, one cycle, grid blind. same code inside each breaker — the only difference is whether you wait in a line or all at once.",
      },

      // Section 7: zen recap
      {
        type: "text",
        section: 7,
        content:
          "habits for this level. async def only for what awaits. asyncio.sleep, never time.sleep. keep a reference to every task you create. gather instead of awaiting in a loop, and take its list as it comes. zip lists that belong together.",
      },
      {
        type: "code",
        section: 7,
        content: `# one at a time — the sum
for n, d in zip(circuits, delays):
    lines.append(await trip_timed(n, d))

# all at once — the slowest
lines = await asyncio.gather(*(trip_timed(n, d) for n, d in zip(circuits, delays)))`,
        hotspots: [
          { text: "lines.append(await trip_timed(n, d))", tip: "waits for each breaker before starting the next." },
          { text: "lines = await asyncio.gather(", tip: "starts every breaker, then waits once." },
        ],
      },
    ],

    notesBlocks: [
      { type: "text", section: 0, important: true, content: "calling an async def makes a plan. create_task starts it." },
      {
        type: "code",
        section: 0,
        content: `async def cut(name):
    print(f"{name} circuit: DOWN")


def cut_async(name):
    return asyncio.create_task(cut(name))`,
      },
      { type: "text", section: 1, content: "gather: run all, wait once, results in order." },
      {
        type: "code",
        section: 1,
        content: `return await asyncio.gather(*(trip(n) for n in circuits))`,
      },
      { type: "text", section: 2, content: "sleep inside each one — asyncio.sleep, in seconds." },
      {
        type: "code",
        section: 2,
        content: `await asyncio.sleep(d / 1000)`,
      },
    ],
  },

  "chapter-09": {
    title: "RACING TASKS",
    subtitle: "KIRA'S PAGES · FIRST VOICE WINS",
    blocks: [
      // Section 0: scaffold
      {
        type: "text",
        section: 0,
        content:
          "under the antenna housing. her hand again, and a heading underlined twice: listen to everyone, wait on no one. first, power the array. — k.",
      },
      {
        type: "code",
        section: 0,
        content: `print("Hello World")`,
      },

      // Section 1: a task holds its answer
      {
        type: "text",
        section: 1,
        content:
          "a task does more than run — it keeps what its coroutine returned. await the task and you get that value. if it already finished, you get it straight away. it holds exactly one answer, like a mailbox with room for one letter.",
      },
      {
        type: "code",
        section: 1,
        content: `import asyncio


def hail(team, delay_ms):
    async def respond():
        await asyncio.sleep(delay_ms / 1000)
        return f"{team} responding"

    return asyncio.create_task(respond())


t = hail("Bravo", 100)
print("hailing Bravo...")
print(await t)    # Bravo responding`,
        hotspots: [
          { text: "def hail(team, delay_ms):", tip: "a plain def. it schedules the call and returns — it never waits." },
          { text: "async def respond():", tip: "the team's side. a closure: it sees team and delay_ms from hail." },
          { text: "return asyncio.create_task(respond())", tip: "the call is already on its way when hail returns." },
          { text: "print(await t)", tip: "waiting is awaiting. you get what respond returned." },
        ],
      },
      {
        type: "text",
        section: 1,
        content:
          "because hail returns at once, you can hail three teams in three lines and they all start answering together. only then do you decide how to listen.",
      },

      // Section 2: first completed
      {
        type: "text",
        section: 2,
        content:
          "asyncio.wait takes a list of tasks and gives back two sets: done, the ones that finished, and pending, the ones still running. tell it return_when=asyncio.FIRST_COMPLETED and it comes back the moment any one finishes. remember sets from chapter four — no order, each thing once.",
      },
      {
        type: "code",
        section: 2,
        content: `async def first_responder(alpha, bravo, charlie):
    done, pending = await asyncio.wait(
        [alpha, bravo, charlie], return_when=asyncio.FIRST_COMPLETED
    )
    return done.pop().result()`,
        hotspots: [
          { text: "done, pending = await asyncio.wait(", tip: "two sets back, unpacked into two names." },
          { text: "return_when=asyncio.FIRST_COMPLETED", tip: "come back on the first finish. leave it out and wait waits for all of them." },
          { text: "done.pop().result()", tip: "take the finished task out of the set, read what it returned." },
        ],
      },
      {
        type: "text",
        section: 2,
        content:
          "await alpha would wait for alpha, however long alpha takes — even with bravo already on the line. gather would wait for all three. wait with FIRST_COMPLETED is the only one that listens to everyone and goes with the first voice.",
      },

      // Section 3: cancel the losers
      {
        type: "text",
        section: 3,
        important: true,
        content:
          "the losers don't stop because you stopped listening. a task runs until it finishes or someone cancels it. if you're done with them, say so.",
      },
      {
        type: "code",
        section: 3,
        content: `for t in pending:
    t.cancel()`,
        hotspots: [
          { text: "t.cancel()", tip: "asks the task to stop at its next pause. a task you've stopped caring about shouldn't keep working." },
        ],
      },
      {
        type: "text",
        section: 3,
        content:
          "kira, in the margin: i always know who i stopped listening to. you should too.",
      },

      // Section 4: timeouts
      {
        type: "text",
        section: 4,
        content:
          "if every frequency is jammed, wait would wait forever — the terminal sees that nothing can ever wake it and calls it a deadlock. give it a deadline: timeout= in seconds. when the time runs out, wait comes back anyway, and done is empty.",
      },
      {
        type: "code",
        section: 4,
        content: `async def await_contact(alpha, bravo, charlie, timeout_ms):
    done, pending = await asyncio.wait(
        [alpha, bravo, charlie],
        timeout=timeout_ms / 1000,
        return_when=asyncio.FIRST_COMPLETED,
    )
    for t in pending:
        t.cancel()
    if not done:
        return "NO CONTACT"
    return done.pop().result()`,
        hotspots: [
          { text: "timeout=timeout_ms / 1000", tip: "the deadline comes from the caller, converted to seconds." },
          { text: "if not done:", tip: "an empty set is false. nobody answered in time." },
        ],
      },

      // Section 5: looking without waiting
      {
        type: "text",
        section: 5,
        content:
          "sometimes you can't afford to wait at all — just glance at a channel and move on. task.done() answers at once: true if the task has its answer, false if not. then task.result() reads it. ask for result() too early and python raises InvalidStateError.",
      },
      {
        type: "code",
        section: 5,
        content: `def sweep(task):
    if task.done():
        return task.result()
    return "channel silent"`,
        hotspots: [
          { text: "def sweep(task):", tip: "not async. an async def exists so it can pause — sweep never may." },
          { text: "task.done()", tip: "a look, not a wait. true or false, right now." },
        ],
      },
      {
        type: "text",
        section: 5,
        important: true,
        content:
          "in python, never waits and isn't async are the same promise. if a function has no reason to pause, don't give it the ability to.",
      },

      // Section 6: python and go
      {
        type: "text",
        section: 6,
        content:
          "go builds this from channels — pipes one task writes into and another reads from — and a statement called select that waits on several at once. python gets there with tasks: a task holds its one answer the way a channel with room for one would, and asyncio.wait is the select. a timeout is a deadline on the wait; a non-blocking look is done().",
      },

      // Section 7: zen recap
      {
        type: "text",
        section: 7,
        content:
          "habits for this level. only async what awaits — hail and sweep stay plain def. convert milliseconds with one slash. name both halves of the wait. cancel the tasks you've stopped waiting for. take the deadline from the caller. and let an empty set be false.",
      },
      {
        type: "code",
        section: 7,
        content: `# waits on alpha, whoever's first
return await alpha

# listens to all three
done, pending = await asyncio.wait([alpha, bravo, charlie], return_when=asyncio.FIRST_COMPLETED)`,
        hotspots: [
          { text: "return await alpha", tip: "bravo answered first. nobody heard it." },
          { text: "asyncio.wait([alpha, bravo, charlie]", tip: "one list, every team, first voice wins." },
        ],
      },
    ],

    notesBlocks: [
      { type: "text", section: 0, important: true, content: "hail returns a task at once — it holds the one answer." },
      {
        type: "code",
        section: 0,
        content: `def hail(team, delay_ms):
    async def respond():
        await asyncio.sleep(delay_ms / 1000)
        return f"{team} responding"

    return asyncio.create_task(respond())`,
      },
      { type: "text", section: 1, content: "first to finish wins; cancel the rest." },
      {
        type: "code",
        section: 1,
        content: `done, pending = await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
for t in pending:
    t.cancel()
return done.pop().result()`,
      },
      { type: "text", section: 2, content: "a deadline on the wait; a glance with done()." },
      {
        type: "code",
        section: 2,
        content: `timeout=timeout_ms / 1000   # empty done → NO CONTACT

def sweep(task):
    return task.result() if task.done() else "channel silent"`,
      },
    ],
  },

  "boss-03": {
    title: "READING CODE",
    subtitle: "REEVES · READ BEFORE YOU RUN",
    blocks: [
      // Section 0: the situation
      {
        type: "text",
        section: 0,
        content:
          "my hand again. i wrote this one for tonight. kira's encoder is supposed to mask your thesis before it crosses bravo's open frequency. five lines. it reads clean. that is not the same as being clean.",
      },
      {
        type: "text",
        section: 0,
        important: true,
        content:
          "this is not a fight. there are no hearts and no countdown. study her code against my loopback log, mark the lines you don't trust, then say what she is — trust or reject — and explain why in plain words. if you're right, you may get the chance to fix it.",
      },

      // Section 1: bytearray
      {
        type: "text",
        section: 1,
        content:
          "the thesis travels as raw bytes — numbers from 0 to 255, usually written in hex: 0x10 is sixteen. bytes can't be changed. a bytearray can: you can set one byte in place. ^ is xor, and xor with 0xFF flips every bit of a byte — that's kira's mask.",
      },
      {
        type: "code",
        section: 1,
        content: `data = bytearray([0x10, 0x20, 0x30, 0x40])
data[0] ^= 0xFF
print(data.hex(" "))    # ef 20 30 40`,
        hotspots: [
          { text: "bytearray([0x10, 0x20, 0x30, 0x40])", tip: "four bytes you're allowed to change." },
          { text: "data[0] ^= 0xFF", tip: "flip every bit of byte 0, in place. 0x10 becomes 0xef." },
        ],
      },

      // Section 2: slicing copies
      {
        type: "text",
        section: 2,
        content:
          "you learned in chapter six that a slice hands you a new string. a bytearray slice is the same: data[1:] is a fresh bytearray with its own bytes. change data afterwards and the slice doesn't notice.",
      },
      {
        type: "code",
        section: 2,
        content: `data = bytearray([0x10, 0x20, 0x30])
part = data[1:]
data[1] ^= 0xFF
print(part.hex(" "))    # 20 30 — untouched`,
        hotspots: [
          { text: "part = data[1:]", tip: "a copy. its bytes are its own." },
        ],
      },

      // Section 3: memoryview
      {
        type: "text",
        section: 3,
        content:
          "copying costs time on a big file, so python offers a way not to: memoryview. a memoryview is a window onto the same bytes, not a copy of them. slice the view and you get a smaller window — still onto the same bytes. change data, and everything looking through the window sees the change.",
      },
      {
        type: "code",
        section: 3,
        content: `data = bytearray([0x10, 0x20, 0x30])
view = memoryview(data)[1:]
data[1] ^= 0xFF
print(bytes(view).hex(" "))    # df 30 — it changed`,
        hotspots: [
          { text: "memoryview(data)[1:]", tip: "no copy. a window starting at byte 1 of data itself." },
          { text: "bytes(view)", tip: "bytes(...) copies what the window shows right now into new, frozen bytes." },
        ],
      },
      {
        type: "text",
        section: 3,
        important: true,
        content:
          "every language has a way to look at data without copying it, and it is always fast and always dangerous. the question to ask is never is this a copy. it's who else can still change what i'm looking at.",
      },

      // Section 4: her code
      {
        type: "text",
        section: 4,
        content:
          "now read hers. ch is a queue — put drops a frame in for the receiver to take later. a frame is sent the moment it's put, but the receiver doesn't read it until afterwards.",
      },
      {
        type: "code",
        section: 4,
        content: `def transmit(data, ch):
    view = memoryview(data)
    for i in range(len(data)):
        data[i] ^= 0xFF
        ch.put(view[i:])`,
        hotspots: [
          { text: "view = memoryview(data)", tip: "a window onto the thesis itself. no copy anywhere." },
          { text: "data[i] ^= 0xFF", tip: "the mask, applied in place — to the bytes every earlier frame is looking at." },
          { text: "ch.put(view[i:])", tip: "sends a window, not a snapshot. the next pass of the loop rewrites what this frame shows." },
        ],
      },
      {
        type: "text",
        section: 4,
        content:
          "walk it with four bytes, 10 20 30 40. frame 0 goes out showing ef 20 30 40. then the loop flips byte 1, and frame 0 — already sent — now shows ef df 30 40. by the time the receiver reads, every frame but the last has been rewritten under it. my loopback log shows it: the checksums taken at send time don't match what arrives.",
      },

      // Section 5: the fix
      {
        type: "text",
        section: 5,
        content:
          "the fix is one word: copy at the moment you send. bytes(data[i:]) freezes those bytes into a new object nobody else can change. later flips touch data, not the frame.",
      },
      {
        type: "code",
        section: 5,
        content: `def transmit_safe(data, ch):
    for i in range(len(data)):
        data[i] ^= 0xFF
        ch.put(bytes(data[i:]))

# frame 0: EF 20 30 40
# frame 1: DF 30 40
# frame 2: CF 40
# frame 3: BF`,
        hotspots: [
          { text: "bytes(data[i:])", tip: "a frozen copy, taken at send time. the frame can never change after it leaves." },
        ],
      },

      // Section 6: how to read code you didn't write
      {
        type: "text",
        section: 6,
        content:
          "three questions for any code someone hands you. what does it change in place? what does it hand to someone else? and is what it hands over a copy, or a window onto the thing it keeps changing? a mutation, a send, and a missing copy — find all three and you've found the problem.",
      },
      {
        type: "text",
        section: 6,
        important: true,
        content:
          "whether she meant it is a separate question, and the code can't answer it. the code can only tell you what it does. decide what she is from that, not from how clean it looks. — e.r.",
      },
    ],

    notesBlocks: [
      { type: "text", section: 0, important: true, content: "a memoryview is a window, not a copy. a bytearray slice is a copy." },
      {
        type: "code",
        section: 0,
        content: `part = data[1:]              # copy — safe
view = memoryview(data)[1:]  # window — sees every later change`,
      },
      { type: "text", section: 1, content: "mutation + send + no copy = frames rewritten after they leave." },
      {
        type: "code",
        section: 1,
        content: `data[i] ^= 0xFF
ch.put(view[i:])    # sends a window`,
      },
      { type: "text", section: 2, content: "the fix: freeze a copy at send time." },
      {
        type: "code",
        section: 2,
        content: `ch.put(bytes(data[i:]))`,
      },
    ],
  },
};
