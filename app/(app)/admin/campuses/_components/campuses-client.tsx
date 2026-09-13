"use client";

import { useState } from "react";
import {
    createCampusAction, updateCampusAction,
    toggleCampusActiveAction, type Campus,
} from "@/actions/crud/campuses";
import {
    PageHeader, Button, Badge, EmptyState,
    Table, Thead, Th, Tbody, Tr, Td,
    Modal, Field, Input, useToast,
} from "@/components/ui";
import { Pagination, usePagination } from "@/components/ui/pagination";

const IDLE = { status: "idle" } as const;

export function CampusesClient({ initial }: { initial: Campus[] }) {
    const toast = useToast();
    const [campuses, setCampuses] = useState(initial);
    const [showCreate, setShowCreate] = useState(false);
    const [editing, setEditing] = useState<Campus | null>(null);

    const { page, perPage, total, totalPages, paginated, setPage, setPerPage } =
        usePagination(campuses);

    async function handleCreate(formData: FormData) {
        const r = await createCampusAction(IDLE, formData);
        if (r.status === "success") {
            toast.success("Campus created"); setShowCreate(false); window.location.reload();
        } else if (r.status === "error") toast.error(r.error);
    }

    async function handleEdit(formData: FormData) {
        const r = await updateCampusAction(IDLE, formData);
        if (r.status === "success") {
            toast.success("Campus updated"); setEditing(null); window.location.reload();
        } else if (r.status === "error") toast.error(r.error);
    }

    async function handleToggle(campus: Campus) {
        const r = await toggleCampusActiveAction(campus.id);
        if (r.status === "success") {
            setCampuses(prev => prev.map(c => c.id === campus.id ? { ...c, isActive: !c.isActive } : c));
            toast.success(`Campus ${campus.isActive ? "deactivated" : "activated"}`);
        } else if (r.status === "error") toast.error(r.error);
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Campuses"
                description={`${campuses.length} campus${campuses.length !== 1 ? "es" : ""}`}
                action={<Button variant="primary" onClick={() => setShowCreate(true)} icon={<PlusIcon />}>New campus</Button>}
            />

            {campuses.length === 0 ? (
                <EmptyState title="No campuses yet"
                    description="Create campuses to assign students and admins to them"
                    action={<Button variant="primary" onClick={() => setShowCreate(true)}>Create campus</Button>} />
            ) : (
                <div className="space-y-3">
                    <Table>
                        <Thead>
                            <tr>
                                <Th>Campus name</Th>
                                <Th>Code</Th>
                                <Th>Address</Th>
                                <Th>Status</Th>
                                <Th className="text-right">Actions</Th>
                            </tr>
                        </Thead>
                        <Tbody>
                            {paginated.map((campus) => (
                                <Tr key={campus.id}>
                                    <Td className="font-semibold text-gray-900 dark:text-gray-100">{campus.name}</Td>
                                    <Td>
                                        <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs dark:bg-gray-800">
                                            {campus.code}
                                        </code>
                                    </Td>
                                    <Td className="text-gray-500 dark:text-gray-400">{campus.address ?? "—"}</Td>
                                    <Td>
                                        <Badge variant={campus.isActive ? "green" : "gray"}>
                                            {campus.isActive ? "Active" : "Inactive"}
                                        </Badge>
                                    </Td>
                                    <Td className="text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <Button size="sm" variant="ghost" onClick={() => setEditing(campus)}>Edit</Button>
                                            <Button size="sm" variant="ghost" onClick={() => handleToggle(campus)}>
                                                {campus.isActive ? "Deactivate" : "Activate"}
                                            </Button>
                                        </div>
                                    </Td>
                                </Tr>
                            ))}
                        </Tbody>
                    </Table>
                    <Pagination page={page} perPage={perPage} total={total} totalPages={totalPages}
                        onPage={setPage} onPerPage={setPerPage} />
                </div>
            )}

            {/* Create modal */}
            <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create campus"
                footer={<>
                    <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
                    <Button variant="primary" type="submit" form="create-campus-form">Create</Button>
                </>}>
                <form id="create-campus-form" action={handleCreate} className="space-y-4">
                    <Field label="Campus name" required>
                        <Input name="name" placeholder="Main Campus" required />
                    </Field>
                    <Field label="Campus code" required hint="Short unique identifier e.g. MAIN, NORTH">
                        <Input name="code" placeholder="MAIN" required />
                    </Field>
                    <Field label="Address">
                        <Input name="address" placeholder="P.O. Box 25, Winneba" />
                    </Field>
                </form>
            </Modal>

            {/* Edit modal */}
            <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit campus"
                footer={<>
                    <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
                    <Button variant="primary" type="submit" form="edit-campus-form">Save changes</Button>
                </>}>
                {editing && (
                    <form id="edit-campus-form" action={handleEdit} className="space-y-4">
                        <input type="hidden" name="id" value={editing.id} />
                        <Field label="Campus name" required>
                            <Input name="name" defaultValue={editing.name} required />
                        </Field>
                        <Field label="Campus code" required>
                            <Input name="code" defaultValue={editing.code} required />
                        </Field>
                        <Field label="Address">
                            <Input name="address" defaultValue={editing.address ?? ""} />
                        </Field>
                    </form>
                )}
            </Modal>
        </div>
    );
}

function PlusIcon() {
    return <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>;
}