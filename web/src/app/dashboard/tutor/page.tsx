// Next.js App Router - Server Redirect for legacy path
import { redirect } from "next/navigation";

export default function LegacyTutorRedirect() {
  redirect("/dashboard");
}


