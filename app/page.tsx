import { redirect } from "next/navigation";

/**
 * Bare-domain visitors land on the customer-facing portal directly. The
 * dashboard lives at /dashboard; login lives at /login. There is no
 * marketing page — this deployment IS the business's intake portal.
 */
export default function RootPage() {
  redirect("/portal");
}
