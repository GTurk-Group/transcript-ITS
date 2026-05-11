"use client";
import React from "react";

import { useState, useMemo } from "react";
import {
  createStudentAction, updateStudentAction,
  updateStudentStatusAction, deleteStudentAction,
} from "@/actions/crud/students";
import type { Programme } from "@/actions/crud/programmes";
import {
  PageHeader, Button, Badge, SearchBar, EmptyState,
  Table, Thead, Th, Tbody, Tr, Td,
  Modal, ConfirmDialog, Field, Input, Select,
  useToast,
} from "@/components/ui";

type Student = {
  id: string; indexNumber: string; firstName: string; lastName: string;
  level: number; entryYear: number; status: string;
  programmeId: string; programmeName: string | null;
};

const IDLE = { status: "idle" } as const;

const STATUS_BADGE: Record<string, "green" | "blue" | "gray"> = {
  ACTIVE: "green", GRADUATED: "blue", WITHDRAWN: "gray",
};

export function StudentsClient({
  initial, programmes,
}: {
  initial: Student[];
  programmes: Programme[];
}) {
  const toast = useToast();
  const [students] = useState(initial);
  const [search, setSearch] = useState("");
  const [progFilter, setProgFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [deleting, setDeleting] = useState<Student | null>(null);
  const [delLoading, setDelLoading] = useState(false);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return students.filter((s) => {
      const matchSearch =
        s.indexNumber.toLowerCase().includes(q) ||
        `${s.firstName} ${s.lastName}`.toLowerCase().includes(q);
      const matchProg = progFilter === "all" || s.programmeId === progFilter;
      const matchStatus = statusFilter === "all" || s.status === statusFilter;
      return matchSearch && matchProg && matchStatus;
    });
  }, [students, search, progFilter, statusFilter]);

  async function handleCreate(formData: FormData) {
    const r = await createStudentAction(IDLE, formData);
    if (r.status === "success") { toast.success("Student created"); setShowCreate(false); window.location.reload(); }
    else if (r.status === "error") toast.error(r.error);
  }

  async function handleEdit(formData: FormData) {
    const r = await updateStudentAction(IDLE, formData);
    if (r.status === "success") { toast.success("Student updated"); setEditing(null); window.location.reload(); }
    else if (r.status === "error") toast.error(r.error);
  }

  async function handleDelete() {
    if (!deleting) return;
    setDelLoading(true);
    const r = await deleteStudentAction(deleting.id);
    setDelLoading(false);
    setDeleting(null);
    if (r.status === "success") { toast.success("Student deleted"); window.location.reload(); }
    else if (r.status === "error") toast.error(r.error);
  }

  const currentYear = new Date().getFullYear();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Students"
        description={`${students.length} student${students.length !== 1 ? "s" : ""} registered`}
        action={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => window.location.href = "/bulk/upload"}>
              Bulk upload
            </Button>
            <Button variant="primary" onClick={() => setShowCreate(true)} icon={<PlusIcon />}>
              New student
            </Button>
          </div>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 max-w-xs">
          <SearchBar value={search} onChange={setSearch} placeholder="Search by name or index…" />
        </div>
        <Select value={progFilter} onChange={(e) => setProgFilter(e.target.value)} className="w-auto">
          <option value="all">All programmes</option>
          {programmes.map((p) => (
            <option key={p.id} value={p.id}>{p.code}</option>
          ))}
        </Select>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-auto">
          <option value="all">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="GRADUATED">Graduated</option>
          <option value="WITHDRAWN">Withdrawn</option>
        </Select>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {filtered.length} result{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={search || progFilter !== "all" || statusFilter !== "all" ? "No matching students" : "No students yet"}
          action={!search && progFilter === "all" && statusFilter === "all" && (
            <Button variant="primary" onClick={() => setShowCreate(true)}>Add student</Button>
          )}
        />
      ) : (
        <Table>
          <Thead>
            <tr>
              <Th>Index no.</Th>
              <Th>Name</Th>
              <Th>Programme</Th>
              <Th>Level</Th>
              <Th>Entry yr.</Th>
              <Th>Status</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </Thead>
          <Tbody>
            {filtered.map((s) => (
              <Tr key={s.id} onClick={() => window.location.href = `/transcripts/${s.id}`}>
                <Td><code className="text-xs font-mono">{s.indexNumber}</code></Td>
                <Td className="font-medium text-gray-900 dark:text-gray-100">
                  {s.firstName} {s.lastName}
                </Td>
                <Td className="text-gray-600 dark:text-gray-400">{s.programmeName ?? "—"}</Td>
                <Td className="tabular-nums">{s.level}</Td>
                <Td className="tabular-nums">{s.entryYear}</Td>
                <Td>
                  <Badge variant={STATUS_BADGE[s.status] ?? "gray"}>{s.status}</Badge>
                </Td>
                <Td className="text-right" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setEditing(s)}>Edit</Button>
                    <Button size="sm" variant="ghost" onClick={() => setDeleting(s)}
                      className="text-red-600 hover:bg-red-50 dark:text-red-400">
                      Delete
                    </Button>
                  </div>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}

      {/* Create modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Add student" size="lg"
        footer={<>
          <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
          <Button variant="primary" type="submit" form="create-student-form">Create student</Button>
        </>}
      >
        <form id="create-student-form" action={handleCreate} className="grid grid-cols-2 gap-4">
          <div className="col-span-2"><Field label="Index number" required>
            <Input name="indexNumber" placeholder="CS/2024/001" required />
          </Field></div>
          <Field label="First name" required>
            <Input name="firstName" placeholder="Ama" required />
          </Field>
          <Field label="Last name" required>
            <Input name="lastName" placeholder="Mensah" required />
          </Field>
          <Field label="Programme" required>
            <Select name="programmeId" required>
              <option value="">Select programme…</option>
              {programmes.filter((p) => p.isActive).map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
              ))}
            </Select>
          </Field>
          <Field label="Level" required>
            <Select name="level" required>
              {[100, 200, 300, 400, 500, 600, 700, 800].map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </Select>
          </Field>
          <Field label="Entry year" required>
            <Input name="entryYear" type="number" min={1990} max={currentYear + 1} defaultValue={currentYear} required />
          </Field>
          <Field label="Graduation year" hint="Leave blank for current students">
            <Input name="graduationYear" type="number" min={1990} max={2100} />
          </Field>
        </form>
      </Modal>

      {/* Edit modal */}
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit student" size="lg"
        footer={<>
          <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
          <Button variant="primary" type="submit" form="edit-student-form">Save changes</Button>
        </>}
      >
        {editing && (
          <form id="edit-student-form" action={handleEdit} className="grid grid-cols-2 gap-4">
            <input type="hidden" name="id" value={editing.id} />
            <Field label="Index number" required>
              <Input name="indexNumber" defaultValue={editing.indexNumber} required />
            </Field>
            <Field label="First name" required>
              <Input name="firstName" defaultValue={editing.firstName} required />
            </Field>
            <Field label="Last name" required>
              <Input name="lastName" defaultValue={editing.lastName} required />
            </Field>
            <Field label="Programme" required>
              <Select name="programmeId" defaultValue={editing.programmeId} required>
                {programmes.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                ))}
              </Select>
            </Field>
            <Field label="Level" required>
              <Select name="level" defaultValue={editing.level}>
                {[100, 200, 300, 400, 500, 600, 700, 800].map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </Select>
            </Field>
            <Field label="Status" required>
              <Select name="status" defaultValue={editing.status}>
                <option value="ACTIVE">Active</option>
                <option value="GRADUATED">Graduated</option>
                <option value="WITHDRAWN">Withdrawn</option>
              </Select>
            </Field>
            <Field label="Entry year" required>
              <Input name="entryYear" type="number" defaultValue={editing.entryYear} required />
            </Field>
          </form>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleting} onClose={() => setDeleting(null)} onConfirm={handleDelete}
        title="Delete student"
        message={`Delete ${deleting?.firstName} ${deleting?.lastName} (${deleting?.indexNumber})? Blocked if grade records exist — set status to Withdrawn instead.`}
        confirmLabel="Delete student" danger loading={delLoading}
      />
    </div>
  );
}

function PlusIcon() {
  return <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>;
}
