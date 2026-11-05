import { JoinClassroom } from "@/components/classroom/JoinClassroom";
import { pageMetadata } from "@/lib/site";

export const metadata = {
  ...pageMetadata({
    title: "You're invited to a class — SIGNAL",
    description: "You've been invited to a class on SIGNAL. Sign in with Google to join and start coding.",
    path: "/join",
  }),
  // Invite links are per-class; keep them out of search results.
  robots: { index: false },
};

export default async function JoinCodePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <JoinClassroom initialCode={code} />;
}
