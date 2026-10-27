import type { Metadata } from "next";
import { JoinClassroom } from "@/components/classroom/JoinClassroom";

export const metadata: Metadata = {
  title: "Join a class — SIGNAL",
  description: "You've been invited to a class on SIGNAL. Sign in with Google to join.",
};

export default async function JoinCodePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <JoinClassroom initialCode={code} />;
}
