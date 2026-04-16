/**
 * /programmes — Programme management page.
 *
 * Server component renders data. Client island handles CRUD interactions.
 */

import { requirePermission }   from "@/lib/auth/rbac";
import { getProgrammes }       from "@/actions/crud/programmes";
import { ProgrammesClient }    from "./_components/programmes-client";

export default async function ProgrammesPage() {
  await requirePermission("manage_programmes");
  const programmes = await getProgrammes();

  return <ProgrammesClient initial={programmes} />;
}
