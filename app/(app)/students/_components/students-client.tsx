"use client";

import { useState } from "react";
import {
  updateStudentAction,
  updateStudentStatusAction,
  deleteStudentAction,
} from "@/actions/crud/students";
import type { Programme } from "@/actions/crud/programmes";
import {
  Button, Badge, Field, Input, Select,
  Modal, ConfirmDialog, useToast, PageHeader,
} from "@/components/ui";

type Student = {
  id: string; indexNumber: string; firstName: string; lastName: string;
  level: number; entryYear: number; graduationYear?: number | null;
  status: string; programmeId: string; programmeName: string;
  dateOfBirth?: string | null; gender?: string | null;
  email?: string | null; phoneNumber?: string | null;
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
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [deleting, setDeleting] = useState<Student | null>(null);
  const [delLoading, setDelLoading] = useState(false);
  const currentYear = new Date().getFullYear();

  // Only show results when user has typed something
  const query = search.trim().toLowerCase();
  const results = query.length === 0 ? [] : initial.filter((s) =>
    s.indexNumber.toLowerCase().includes(query) ||
    `${s.firstName} ${s.lastName}`.toLowerCase().includes(query)
  );

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
    else toast.error(r.error);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Students"
        description={`${initial.length} student${initial.length !== 1 ? "s" : ""} registered`}
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

      {/* Search only */}
      <div className="relative max-w-md">
        <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
          <SearchIcon />
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or index number…"
          className="block w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm placeholder:text-gray-400 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600"
          >
            <XIcon />
          </button>
        )}
      </div>

      {/* No search yet */}
      {query.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 py-16 text-center dark:border-gray-700 dark:bg-gray-900/30">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
            <SearchIcon className="h-5 w-5 text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Search for a student</p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
            Enter a name or index number above to find and manage a student record.
          </p>
        </div>
      )}

      {/* Searched but no results */}
      {query.length > 0 && results.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 py-12 text-center dark:border-gray-700 dark:bg-gray-900/30">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">No students found</p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
            No results for &ldquo;{search}&rdquo;. Try a different name or index number.
          </p>
        </div>
      )}

      {/* Results — student cards */}
      {results.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {results.length} result{results.length !== 1 ? "s" : ""} for &ldquo;{search}&rdquo;
          </p>
          {results.map((s) => (
            <StudentCard
              key={s.id}
              student={s}
              onEdit={() => setEditing(s)}
              onDelete={() => setDeleting(s)}
            />
          ))}
        </div>
      )}

      {/* Create modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Add student" size="lg"
        footer={<>
          <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
          <Button variant="primary" type="submit" form="create-student-form">Create student</Button>
        </>}
      >
        <form id="create-student-form" action={async (fd) => {
          const { createStudentAction } = await import("@/actions/crud/students");
          const r = await createStudentAction(IDLE, fd);
          if (r.status === "success") { toast.success("Student created"); setShowCreate(false); window.location.reload(); }
          else if (r.status === "error") toast.error(r.error);
        }} className="grid grid-cols-2 gap-4">
          <Field label="Index number" required className="col-span-2">
            <Input name="indexNumber" placeholder="CS/2024/001" required />
          </Field>
          <Field label="First name" required>
            <Input name="firstName" placeholder="Ama" required />
          </Field>
          <Field label="Last name" required>
            <Input name="lastName" placeholder="Mensah" required />
          </Field>
          <Field label="Date of birth">
            <Input name="dateOfBirth" type="date" />
          </Field>
          <Field label="Gender">
            <Select name="gender">
              <option value="">Select…</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
            </Select>
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
          <Field label="Email" className="col-span-2">
            <Input name="email" type="email" placeholder="student@example.com" />
          </Field>
          <Field label="Phone number">
            <Input name="phoneNumber" placeholder="+233 XX XXX XXXX" />
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
            <Field label="Index number" required className="col-span-2">
              <Input name="indexNumber" defaultValue={editing.indexNumber} required />
            </Field>
            <Field label="First name" required>
              <Input name="firstName" defaultValue={editing.firstName} required />
            </Field>
            <Field label="Last name" required>
              <Input name="lastName" defaultValue={editing.lastName} required />
            </Field>
            <Field label="Date of birth">
              <Input name="dateOfBirth" type="date" defaultValue={editing.dateOfBirth ?? ""} />
            </Field>
            <Field label="Gender">
              <Select name="gender" defaultValue={editing.gender ?? ""}>
                <option value="">Select…</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </Select>
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
            <Field label="Graduation year">
              <Input name="graduationYear" type="number" defaultValue={editing.graduationYear ?? ""} />
            </Field>
            <Field label="Email" className="col-span-2">
              <Input name="email" type="email" defaultValue={editing.email ?? ""} />
            </Field>
            <Field label="Phone number">
              <Input name="phoneNumber" defaultValue={editing.phoneNumber ?? ""} />
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

// ─── Student card ─────────────────────────────────────────────────────────────

function StudentCard({
  student, onEdit, onDelete,
}: {
  student: Student;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const STATUS_BADGE: Record<string, "green" | "blue" | "gray"> = {
    ACTIVE: "green", GRADUATED: "blue", WITHDRAWN: "gray",
  };

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
      {/* Card header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
            {student.firstName[0]}{student.lastName[0]}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {student.firstName} {student.lastName}
            </p>
            <p className="font-mono text-xs text-gray-500 dark:text-gray-400">{student.indexNumber}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={STATUS_BADGE[student.status] ?? "gray"}>{student.status}</Badge>
          <Button size="sm" variant="secondary" onClick={onEdit}>Edit</Button>
          <Button size="sm" variant="ghost"
            className="text-red-600 hover:bg-red-50 dark:text-red-400"
            onClick={onDelete}>Delete</Button>
        </div>
      </div>

      {/* Card body */}
      <div className="grid grid-cols-2 divide-x divide-gray-100 dark:divide-gray-800 sm:grid-cols-4">
        <InfoCell label="Programme" value={student.programmeName} />
        <InfoCell label="Level" value={String(student.level)} />
        <InfoCell label="Entry year" value={String(student.entryYear)} />
        <InfoCell label="Grad. year" value={student.graduationYear ? String(student.graduationYear) : "—"} />
      </div>

      {/* Quick links */}
      <div className="flex gap-4 border-t border-gray-100 px-5 py-2.5 dark:border-gray-800">
        <a href={`/transcripts/${student.id}`}
          className="text-xs text-blue-600 hover:underline dark:text-blue-400">
          View transcript →
        </a>
        <a href={`/grades?student=${student.id}`}
          className="text-xs text-gray-500 hover:underline dark:text-gray-400">
          View grades →
        </a>
      </div>
    </div>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-3">
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{value}</p>
    </div>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function PlusIcon() {
  return <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>;
}

function SearchIcon({ className = "h-4 w-4" }: { className?: string }) {
  return <svg className={`text-gray-400 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>;
}

function XIcon() {
  return <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;
}