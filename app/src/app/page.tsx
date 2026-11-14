import { Paywall } from "@/components/game/Paywall";
import {
  LANDING_DEMO,
  landingCurriculum,
  landingOutcomes,
  numberWord,
  pricePerChapter,
} from "@/data/landing";
import { PRICE_SINGLE, pageMetadata } from "@/lib/site";

export const metadata = pageMetadata({
  title: "SIGNAL — Learn to code by escaping",
  description:
    "Learn to code by breaking someone out. SIGNAL is a narrative coding game where you write real Go, Python, JavaScript, or Rust to help Maya Chen escape a locked-down research facility. Act I is free in all four languages.",
  path: "/",
});

export default function Home() {
  const curriculum = landingCurriculum();
  return (
    <Paywall
      pitch={{
        curriculum,
        outcomes: landingOutcomes(curriculum),
        demo: LANDING_DEMO,
        actsWord: numberWord(curriculum.actCount),
        perChapter: pricePerChapter(PRICE_SINGLE, curriculum.chapterCount),
      }}
    />
  );
}
