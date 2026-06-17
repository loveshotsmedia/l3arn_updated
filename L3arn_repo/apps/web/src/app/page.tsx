import { redirect } from "next/navigation";

// Root page redirects to parent auth
export default function RootPage() {
  redirect("/parent/auth/signup");
}
