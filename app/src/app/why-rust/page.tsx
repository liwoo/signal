import { WhyLanguagePage, type WhyLink, type WhyReason } from "@/components/why/WhyLanguagePage";
import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata({
  title: "Why learn Rust? — SIGNAL",
  description:
    "Why learn Rust with SIGNAL: a compiler that explains every mistake, memory safety without a garbage collector, and speed for systems, the web and the tools developers use every day. Act I is free.",
  path: "/why-rust",
});

const reasons: WhyReason[] = [
  {
    title: "A COMPILER THAT TEACHES",
    text: "Rust checks your program before it runs, and its error messages are famous for being helpful: they point at the exact spot, explain what went wrong, and often suggest the fix. In SIGNAL, Maya turns them into one plain sentence.",
  },
  {
    title: "SAFE AND FAST",
    text: "Rust gives you the speed of C and C++ without the classic crashes. Its ownership rules catch whole families of memory bugs at compile time, so there's no garbage collector slowing things down.",
  },
  {
    title: "LOVED BY DEVELOPERS",
    text: "For years, Stack Overflow's developer survey has ranked Rust as the language developers most want to keep using. People who learn it tend to stay.",
  },
  {
    title: "USED WHERE IT COUNTS",
    text: "Rust runs in browsers, operating systems, cloud infrastructure, and command-line tools. It's now accepted in the Linux kernel and used inside Android, Windows, and Firefox.",
  },
  {
    title: "NOTHING TO INSTALL",
    text: "In SIGNAL, your Rust compiles on the official Rust Playground, so you get the real compiler and real output with no setup. When you're ready, rustup installs it on your own machine in one command.",
    statLabel: "REAL COMPILER",
  },
];

const usedBy: WhyLink[] = [
  { title: "rust-lang.org", url: "https://www.rust-lang.org/" },
  { title: "The Rust Book", url: "https://doc.rust-lang.org/book/" },
  { title: "Rust by Example", url: "https://doc.rust-lang.org/rust-by-example/" },
  { title: "Rust Playground", url: "https://play.rust-lang.org/" },
];

export default function WhyRustPage() {
  return (
    <WhyLanguagePage
      language="rust"
      name="Rust"
      subtitle="why learn Rust with SIGNAL"
      intro={
        <p>
          Rust is the language for building software that has to be fast and can&apos;t afford to crash. It has a
          reputation for being hard, but its compiler is a patient teacher. In SIGNAL, you write real Rust to get Maya
          out of the facility. Act I is free, and more is coming.
        </p>
      }
      reasons={reasons}
      usedBy={usedBy}
      usedByLabel="LEARN MORE ABOUT RUST"
    />
  );
}
