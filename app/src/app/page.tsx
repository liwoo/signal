import { Paywall } from "@/components/game/Paywall";
import { landingCurriculum } from "@/data/landing";
import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata({
  title: "SIGNAL — Learn to code by escaping",
  description:
    "Learn to code by escaping. SIGNAL is a narrative coding game where you write real Go, Python, or JavaScript to help Maya Chen break out of a locked-down research facility. Act I is free in all three languages.",
  path: "/",
});

export default function Home() {
  return <Paywall curriculum={landingCurriculum()} />;
}
