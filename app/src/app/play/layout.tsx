import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata({
  title: "Play SIGNAL — write code, get Maya out",
  description:
    "Start the escape: sign in with Google, pick Go, Python, JavaScript or Rust, and write your first line of code to reach Maya. Act I is free.",
  path: "/play",
});

export default function PlayLayout({ children }: { children: React.ReactNode }) {
  return children;
}
