/**
 * /admin/campuses — Campus management (SUPER_ADMIN only)
 */
import { requirePermission } from "@/lib/auth/rbac";
import { getCampuses } from "@/actions/crud/campuses";
import { CampusesClient } from "./_components/campuses-client";

export const metadata = { title: "Campuses — TMS" };

export default async function CampusesPage() {
    await requirePermission("manage_institution");
    const campuses = await getCampuses();
    return <CampusesClient initial={campuses} />;
}