import { TeacherConsole } from "@/components/teacher/TeacherConsole";
import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata({
  title: "SIGNAL for Teachers — classes, join codes and progress tracking",
  description:
    "Create classes, onboard students with a 6-letter join code, and see who's progressing and who's stuck as they learn Go, Python, JavaScript or Rust in SIGNAL.",
  path: "/teach",
});

export default function TeachPage() {
  return <TeacherConsole />;
}
