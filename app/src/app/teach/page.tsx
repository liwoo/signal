import type { Metadata } from "next";
import { TeacherConsole } from "@/components/teacher/TeacherConsole";

export const metadata: Metadata = {
  title: "SIGNAL for Teachers",
  description: "Create classes, onboard students with a join code, and track every student's progress through SIGNAL.",
};

export default function TeachPage() {
  return <TeacherConsole />;
}
