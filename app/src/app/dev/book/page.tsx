"use client";

import { Suspense, useState } from "react";
import { notFound, useSearchParams } from "next/navigation";
import { BookReader } from "@/components/book/BookReader";
import { BookCover } from "@/components/book/BookCover";
import { getBeginnerNotes } from "@/data/beginner-notes";
import { BOOK_CHAPTERS, bookChapterFor } from "@/data/book";
import { LanguageProvider } from "@/components/game/LanguageContext";
import { isLanguageId } from "@/lib/lang/registry";

// Development-only field-manual preview:
//   /dev/book?chapter=chapter-03          → the reader, opened on chapter III
//   /dev/book?chapter=chapter-03&cover=1  → the closed cover with the chapter slip
//   /dev/book?chapter=chapter-03&lang=python → the same chapter from the python manual

function BookPreview() {
  const params = useSearchParams();
  const [fontScale, setFontScale] = useState(2);
  const [closed, setClosed] = useState(false);

  if (process.env.NODE_ENV === "production") notFound();

  const chapterId = params.get("chapter") ?? "chapter-01";
  const rawLang = params.get("lang");
  const language = isLanguageId(rawLang) ? rawLang : "go";
  const notes = getBeginnerNotes(chapterId, language);
  const chapter = bookChapterFor(chapterId, language);

  if (params.get("cover") === "1" || !notes) {
    return (
      <div className="book-desk min-h-dvh flex flex-col items-center justify-center gap-6">
        <BookCover chapter={chapter} width={260} />
        <div className="flex flex-wrap justify-center gap-2 text-[8px] tracking-[2px]">
          {BOOK_CHAPTERS.map((c) => (
            <a key={c.challengeId} href={`/dev/book?chapter=${c.challengeId}&lang=${language}`} style={{ color: "var(--color-signal)" }}>
              {c.numeral} · {c.title}
            </a>
          ))}
        </div>
        {!notes && <div className="text-[9px]" style={{ color: "var(--color-danger)" }}>NO NOTES FOR {chapterId}</div>}
      </div>
    );
  }

  if (closed) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-4 text-xs" style={{ color: "var(--color-foreground)" }}>
        <div className="tracking-[4px]" style={{ color: "var(--color-dim)" }}>BOOK CLOSED</div>
        <button type="button" onClick={() => setClosed(false)} className="border-2 bg-transparent px-8 py-3 font-[family-name:var(--font-display)] tracking-[4px]" style={{ borderColor: "var(--color-signal)", color: "var(--color-signal)" }}>
          OPEN AGAIN
        </button>
      </div>
    );
  }

  return (
    <BookReader
      notes={notes}
      chapter={chapter}
      chapterId={chapterId}
      fontScale={fontScale}
      onFontScaleChange={setFontScale}
      onReady={() => setClosed(true)}
      onHotspotXP={() => {}}
      soundEnabled={params.get("sound") !== "0"}
    />
  );
}

function BookPreviewWithLanguage() {
  const params = useSearchParams();
  const rawLang = params.get("lang");
  return (
    <LanguageProvider language={isLanguageId(rawLang) ? rawLang : "go"}>
      <BookPreview />
    </LanguageProvider>
  );
}

export default function BookPreviewPage() {
  return (
    <Suspense fallback={null}>
      <BookPreviewWithLanguage />
    </Suspense>
  );
}
