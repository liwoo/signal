import type { Metadata } from "next";
import { JoinClassroom } from "@/components/classroom/JoinClassroom";

export const metadata: Metadata = {
  title: "Join a class — SIGNAL",
  description: "Enter your teacher's class code to join their class on SIGNAL.",
};

export default function JoinPage() {
  return <JoinClassroom />;
}
