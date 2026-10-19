// ── Beginner Notes · Python ──
// Reeves' "PYTHON: A Field Manual" chapters for Act I, under the shared
// challenge ids. Same shape as the Go notes (beginner-notes.ts) — `blocks` is
// the book (BookReader), `notesBlocks` is the in-game NOTES quick reference.
// No `beginnerBlocks` / diagram blocks: those animations are Go-specific.
// Names and wording agree with data/challenges/python/act-1.ts + boss-01.ts.

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
          "the terminal wants one line: CELL B-09 · SUBLEVEL 3. to mix text and values, use an f-string — put an f right before the opening quote, then drop any value into the text inside curly braces.",
      },
      {
        type: "code",
        section: 3,
        content: `import cellblock

print(f"CELL {cellblock.CELL} · SUBLEVEL {cellblock.SUBLEVEL}")
# CELL B-09 · SUBLEVEL 3`,
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
};
