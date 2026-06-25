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

const IDLE = { status: "idle" } as const;

export function SemestersClient({ initial }: { initial: Semester[] }) {
  const toast = useToast();
  const [semesters, setSemesters] = useState(initial);
  const [showCreate, setShowCreate] = useState(false);
  const [deleting, setDeleting] = useState<Semester | null>(null);
  const [delLoading, setDelLoading] = useState(false);

  // Derive current year for the default value
  const currentYear = new Date().getFullYear();

  async function handleCreate(formData: FormData) {
    const r = await createSemesterAction(IDLE, formData);
    if (r.status === "success") {
      toast.success("Semester created");
      setShowCreate(false);
      // Reload data - in production use revalidatePath or router.refresh()
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
      toast.error(r.error);
    }
  }

  // Group by year for display
  const byYear = semesters.reduce<Record<number, Semester[]>>((acc, s) => {
    (acc[s.year] ??= []).push(s);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <PageHeader
        title="Semesters"
        description="Academic periods — each grade entry references a semester"
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
        <div className="space-y-4">
          {Object.entries(byYear)
            .sort(([a], [b]) => Number(b) - Number(a))
            .map(([year, sems]) => (
              <div key={year} className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
                <div className="border-b border-gray-100 bg-gray-50 px-5 py-3 dark:border-gray-800 dark:bg-gray-800/50">
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Academic year {year}/{Number(year) + 1}
                  </span>
                </div>
                <table className="min-w-full divide-y divide-gray-100 text-sm dark:divide-gray-800">
                  <thead className="bg-gray-50 dark:bg-gray-800/30">
                    <tr>
                      <Th>Semester</Th>
                      <Th>Year</Th>
                      <Th>Label</Th>
                      <Th>Created</Th>
                      <Th className="text-right">Actions</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                    {sems.map((s) => (
                      <Tr key={s.id}>
                        <Td>
                          <Badge variant={s.semester === "FIRST" ? "blue" : "purple"}>
                            {s.semester === "FIRST" ? "First" : "Second"}
                          </Badge>
                        </Td>
                        <Td className="font-mono tabular-nums">{s.year}</Td>
                        <Td className="text-gray-600 dark:text-gray-400">
                          {s.year}/{s.year + 1} — {s.semester === "FIRST" ? "First" : "Second"} Semester
                        </Td>
                        <Td className="text-gray-500">
                          {new Date(s.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                        </Td>
                        <Td className="text-right">
                          <Button size="sm" variant="ghost" onClick={() => setDeleting(s)}
                            className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950">
                            Delete
                          </Button>
                        </Td>
                      </Tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
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
          <Field label="Academic year" required hint={`e.g. ${currentYear} for the ${currentYear}/${currentYear + 1} session`}>
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
        message={`Delete the ${deleting?.semester === "FIRST" ? "First" : "Second"} Semester of ${deleting?.year}? This is blocked if grades exist for this semester.`}
        confirmLabel="Delete" danger loading={delLoading}
      />
    </div>
  );
}

function PlusIcon() {
  return <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>;
}
