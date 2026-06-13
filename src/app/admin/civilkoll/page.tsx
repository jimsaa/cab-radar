import { redirect } from "next/navigation";

/** Legacy route — Civilkoll lookup lives in the Tesla Command Center. */
export default function AdminCivilkollPage() {
  redirect("/admin");
}
