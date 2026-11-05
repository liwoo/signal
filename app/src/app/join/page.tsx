import { JoinClassroom } from "@/components/classroom/JoinClassroom";
import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata({
  title: "Join a class — SIGNAL",
  description: "Enter your teacher's class code to join their class on SIGNAL and start learning to code.",
  path: "/join",
});

export default function JoinPage() {
  return <JoinClassroom />;
}
