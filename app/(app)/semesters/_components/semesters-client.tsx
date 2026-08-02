"use client";

import { useState } from "react";
import {
  createSemesterAction, deleteSemesterAction, type Semester,
} from "@/actions/crud/semesters";
import {
  PageHeader, Button, Badge, EmptyState,
  Table, Thead, Th, Tbody, Tr, Td,
  Modal, ConfirmDialog, Field, Input, Select,
  useToast,
} from "@/components/ui";
import { Pagination, usePagination } from "@/components/ui/pagination";

const IDLE = { status: "idle" } as const;

export function SemestersClient({ initial }: { initial: Semester[] }) {
  const toast = useToast();
  const [semesters, setSemesters] = useState(initial);
  const [showCreate, setShowCreate] = useState(false);
  const [deleting, setDeleting] = useState<Semester | null>(null);
  const [delLoading, setDelLoading] = useState(false);
  const currentYear = new Date().getFullYear();

  // Sort all semesters newest-first for pagination
  const sorted = [...semesters].sort((a, b) =>
    b.year !== a.year ? b.year - a.year : a.semester.localeCompare(b.semester)
  );

  const { page, perPage, total, totalPages, paginated, setPage, setPerPage } =
    usePagination(sorted);

  async function handleCreate(formData: FormData) {
    const r = await createSemesterAction(IDLE, formData);
    if (r.status === "success") {
      toast.success("Semester created");
      setShowCreate(false);
      window.location.reload();
    } else if (r.status === "error") {
      toast.error(r.error);
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    setDelLoading(true);
    const r = await deleteSemesterAction(deleting.id);
    setDelLoading(false);
    setDeleting(null);
    if (r.status === "success") {
      toast.success("Semester deleted");
      setSemesters((prev) => prev.filter((s) => s.id !== deleting.id));
    } else if (r.status === "error") {
      toast.error(r.error || "Failed to delete semester");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Semesters"
        description={`${semesters.length} semester${semesters.length !== 1 ? "s" : ""} — each grade entry references a semester`}
        action={
          <Button variant="primary" onClick={() => setShowCreate(true)} icon={<PlusIcon />}>
            New semester
          </Button>
        }
      />

      {semesters.length === 0 ? (
        <EmptyState
          title="No semesters yet"
          description="Create at least one semester before uploading grades"
          action={<Button variant="primary" onClick={() => setShowCreate(true)}>Create semester</Button>}
        />
      ) : (
        <div className="space-y-3">
          <Table>
            <Thead>
              <tr>
                <Th>Academic year</Th>
                <Th>Semester</Th>
                <Th>Label</Th>
                <Th>Created</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </Thead>
            <Tbody>
              {paginated.map((s) => (
                <Tr key={s.id}>
                  <Td className="font-mono tabular-nums font-medium text-gray-900 dark:text-gray-100">
                    {s.year}/{s.year + 1}
                  </Td>
                  <Td>
                    <Badge variant={s.semester === "FIRST" ? "blue" : "purple"}>
                      {s.semester === "FIRST" ? "First" : "Second"}
                    </Badge>
                  </Td>
                  <Td className="text-gray-600 dark:text-gray-400">
                    {s.year}/{s.year + 1} — {s.semester === "FIRST" ? "First" : "Second"} Semester
                  </Td>
                  <Td className="text-gray-500 dark:text-gray-400">
                    {new Date(s.createdAt).toLocaleDateString("en-GB", {
                      day: "numeric", month: "short", year: "numeric",
                    })}
                  </Td>
                  <Td className="text-right">
                    <Button
                      size="sm" variant="ghost"
                      onClick={() => setDeleting(s)}
                      className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                    >
                      Delete
                    </Button>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>

          <Pagination
            page={page} perPage={perPage} total={total} totalPages={totalPages}
            onPage={setPage} onPerPage={setPerPage}
          />
        </div>
      )}

      {/* Create modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create semester"
        footer={<>
          <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
          <Button variant="primary" type="submit" form="create-sem-form">Create</Button>
        </>}
      >
        <form id="create-sem-form" action={handleCreate} className="space-y-4">
          <Field label="Academic year" required
            hint={`e.g. ${currentYear} for the ${currentYear}/${currentYear + 1} session`}>
            <Input name="year" type="number" min={1990} max={2100} defaultValue={currentYear} required />
          </Field>
          <Field label="Semester" required>
            <Select name="semester">
              <option value="FIRST">First Semester</option>
              <option value="SECOND">Second Semester</option>
            </Select>
          </Field>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleting} onClose={() => setDeleting(null)} onConfirm={handleDelete}
        title="Delete semester"
        message={`Delete the ${deleting?.semester === "FIRST" ? "First" : "Second"} Semester of ${deleting?.year}? Blocked if grades exist for this period.`}
        confirmLabel="Delete" danger loading={delLoading}
      />
    </div>
  );
}

function PlusIcon() {
  return <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>;
}