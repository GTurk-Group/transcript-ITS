"use client";

import { useOptimistic, useState, useTransition } from "react";
import {
  createProgrammeAction, updateProgrammeAction,
  toggleProgrammeActiveAction, deleteProgrammeAction, type Programme,
} from "@/actions/crud/programmes";
import {
  PageHeader, Button, Badge, SearchBar, EmptyState,
  Table, Thead, Th, Tbody, Tr, Td,
  Modal, ConfirmDialog, Field, Input, Select,
  useToast,
} from "@/components/ui";
import { Pagination, usePagination } from "@/components/ui/pagination";

const IDLE = { status: "idle" } as const;

export function ProgrammesClient({ initial }: { initial: Programme[] }) {
  const toast = useToast();
  const [programmes, setOptimistic] = useOptimistic(initial);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Programme | null>(null);
  const [deleting, setDeleting] = useState<Programme | null>(null);
  const [delLoading, setDelLoading] = useState(false);
  const [, startTransition] = useTransition();

  // Filter first, then paginate
  const filtered = programmes.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch = p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q);
    const matchFilter = filter === "all" || (filter === "active" ? p.isActive : !p.isActive);
    return matchSearch && matchFilter;
  });

  const { page, perPage, total, totalPages, paginated, setPage, setPerPage } =
    usePagination(filtered);

  async function handleCreate(formData: FormData) {
    const r = await createProgrammeAction(IDLE, formData);
    if (r.status === "success") { toast.success("Programme created"); setShowCreate(false); window.location.reload(); }
    else if (r.status === "error") toast.error(r.error);
  }

  async function handleEdit(formData: FormData) {
    const r = await updateProgrammeAction(IDLE, formData);
    if (r.status === "success") { toast.success("Programme updated"); setEditing(null); window.location.reload(); }
    else if (r.status === "error") toast.error(r.error);
  }

  async function handleToggle(p: Programme) {
    startTransition(async () => {
      setOptimistic((prev) =>
        prev.map((x) => x.id === p.id ? { ...x, isActive: !x.isActive } : x)
      );
      const r = await toggleProgrammeActiveAction(p.id);
      if (r.status === "error") toast.error(r.error);
      else toast.success(`Programme ${p.isActive ? "deactivated" : "activated"}`);
    });
  }

  async function handleDelete() {
    if (!deleting) return;
    setDelLoading(true);
    const r = await deleteProgrammeAction(deleting.id);
    setDelLoading(false); setDeleting(null);
    if (r.status === "success") toast.success("Programme deleted");
    else if (r.status === "error") toast.error(r.error || "Failed to delete programme");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Programmes"
        description={`${programmes.length} programme${programmes.length !== 1 ? "s" : ""}`}
        action={
          <Button variant="primary" onClick={() => setShowCreate(true)} icon={<PlusIcon />}>
            New programme
          </Button>
        }
      />

      {/* Search + filter */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 max-w-xs">
          <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search name or code…" />
        </div>
        <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          {(["all", "active", "inactive"] as const).map((f) => (
            <button key={f} onClick={() => { setFilter(f); setPage(1); }}
              className={["px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                filter === f
                  ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                  : "text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800",
              ].join(" ")}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {paginated.length === 0 ? (
        <EmptyState
          title={search || filter !== "all" ? "No matching programmes" : "No programmes yet"}
          action={!search && filter === "all" && (
            <Button variant="primary" onClick={() => setShowCreate(true)}>Create programme</Button>
          )}
        />
      ) : (
        <div className="space-y-3">
          <Table>
            <Thead>
              <tr>
                <Th>Name</Th>
                <Th>Code</Th>
                <Th>Type</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </Thead>
            <Tbody>
              {paginated.map((p) => (
                <Tr key={p.id}>
                  <Td className="font-medium text-gray-900 dark:text-gray-100 max-w-xs truncate">{p.name}</Td>
                  <Td><code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs dark:bg-gray-800">{p.code}</code></Td>
                  <Td>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${(p as any).programmeType === "DIPLOMA"
                      ? "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300"
                      : "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300"
                      }`}>
                      {(p as any).programmeType === "DIPLOMA" ? "Diploma" : "Degree"}
                    </span>
                  </Td>
                  <Td><Badge variant={p.isActive ? "green" : "gray"}>{p.isActive ? "Active" : "Inactive"}</Badge></Td>
                  <Td className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setEditing(p)}>Edit</Button>
                      <Button size="sm" variant="ghost" onClick={() => handleToggle(p)}>
                        {p.isActive ? "Deactivate" : "Activate"}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setDeleting(p)}
                        className="text-red-600 hover:bg-red-50 dark:text-red-400">Delete</Button>
                    </div>
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
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create programme"
        footer={<><Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button><Button variant="primary" type="submit" form="create-prog-form">Create</Button></>}>
        <form id="create-prog-form" action={handleCreate} className="space-y-4">
          <Field label="Programme name" required><Input name="name" placeholder="Bachelor of Science in Computer Science" required /></Field>
          <Field label="Programme code" required hint="Uppercase, unique e.g. BSC-CS"><Input name="code" placeholder="BSC-CS" required /></Field>
          <Field label="Programme type" required hint="Determines classification scale on transcripts">
            <select name="programmeType" defaultValue="DEGREE"
              className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100">
              <option value="DEGREE">Degree — First Class / Second Class / Third Class</option>
              <option value="DIPLOMA">Diploma — Distinction / Credit / Pass</option>
            </select>
          </Field>
        </form>
      </Modal>

      {/* Edit modal */}
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit programme"
        footer={<><Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button><Button variant="primary" type="submit" form="edit-prog-form">Save changes</Button></>}>
        {editing && (
          <form id="edit-prog-form" action={handleEdit} className="space-y-4">
            <input type="hidden" name="id" value={editing.id} />
            <Field label="Programme name" required><Input name="name" defaultValue={editing.name} required /></Field>
            <Field label="Programme code" required><Input name="code" defaultValue={editing.code} required /></Field>
            <Field label="Programme type" required hint="Changing this affects how future transcripts are classified">
              <select name="programmeType" defaultValue={(editing as any).programmeType ?? "DEGREE"}
                className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100">
                <option value="DEGREE">Degree — First Class / Second Class / Third Class</option>
                <option value="DIPLOMA">Diploma — Distinction / Credit / Pass</option>
              </select>
            </Field>
          </form>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleting} onClose={() => setDeleting(null)} onConfirm={handleDelete}
        title="Delete programme"
        message={`Delete "${deleting?.name}"? Blocked if students are enrolled.`}
        confirmLabel="Delete" danger loading={delLoading}
      />
    </div>
  );
}

function PlusIcon() { return <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>; }