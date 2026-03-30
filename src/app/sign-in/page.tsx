import { redirect } from "next/navigation";

// BUG-03: /sign-in was returning 404. Redirect all traffic to /login.
export default function SignInPage() {
  redirect("/login");
}
