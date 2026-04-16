"use client";

import { useActionState, useOptimistic, useState, useTransition } from "react";
import {
  createProgrammeAction,
  updateProgrammeAction,
  toggleProgrammeActiveAction,
  deleteProgrammeAction,
  type Programme,
} from "@/actions/crud/programmes";
import {
  PageHeader, Button, Badge, SearchBar, EmptyState,
  Table, Thead, Th, Tbody, Tr, Td,
  Modal, ConfirmDialog, Field, Input,
  useToast,
} from "@/components/ui";

type Props = { initial: Programme[] };

const IDLE = { status: "idle" } as const;

export function ProgrammesClient({ initial }: Props) {
  const toast = useToast();

  const [programmes, setOptimistic] = useOptimistic(initial);
  const [search, setSearch]         = useState("");
  const [isPending, startTransition] = useTransition();

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [createState, createAction] = useActionState(createProgrammeAction, IDLE);

  // Edit modal
  const [editing, setEditing]     = useState<Programme | null>(null);
  const [editState, editAction]   = useActionState(updateProgrammeAction, IDLE);

  // Delete confirm
  const [deleting, setDeleting]   = useState<Programme | null>(null);
  const [delLoading, setDelLoading] = useState(false);

  const filtered = programmes.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.code.toLowerCase().includes(q)
    );
  });

  async function handleCreate(formData: FormData) {
    const result = await createProgrammeAction(IDLE, formData);
    if (result.status === "success") {
      toast.success("Programme created");
      setShowCreate(false);
    } else if (result.status === "error") {
      toast.error(result.error);
    }
  }

  async function handleEdit(formData: FormData) {
    const result = await updateProgrammeAction(IDLE, formData);
    if (result.status === "success") {
      toast.success("Programme updated");
      setEditing(null);
    } else if (result.status === "error") {
      toast.error(result.error);
    }
  }

  async function handleToggle(p: Programme) {
    startTransition(async () => {
      setOptimistic((prev) =>
        prev.map((x) => x.id === p.id ? { ...x, isActive: !x.isActive } : x)
      );
      const result = await toggleProgrammeActiveAction(p.id);
      if (result.status === "error") toast.error(result.error);
      else toast.success(`Programme ${p.isActive ? "deactivated" : "activated"}`);
    });
  }

  async function handleDelete() {
    if (!deleting) return;
    setDelLoading(true);
    const result = await deleteProgrammeAction(deleting.id);
    setDelLoading(false);
    setDeleting(null);
    if (result.status === "success") toast.success("Programme deleted");
    else toast.error(result.error);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Programmes"
        description={`${programmes.length} programme${programmes.length !== 1 ? "s" : ""} registered`}
        action={
          <Button variant="primary" onClick={() => setShowCreate(true)} icon={<PlusIcon />}>
            New programme
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="flex-1 max-w-xs">
          <SearchBar value={search} onChange={setSearch} placeholder="Search name or code…" />
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {filtered.length} result{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <EmptyState
          title={search ? "No matching programmes" : "No programmes yet"}
          description={search ? "Try a different search term" : "Create your first programme to get started"}
          action={!search && <Button variant="primary" onClick={() => setShowCreate(true)}>Create programme</Button>}
        />
      ) : (
        <Table>
          <Thead>
            <tr>
              <Th>Name</Th>
              <Th>Code</Th>
              <Th>Status</Th>
              <Th>Created</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </Thead>
          <Tbody>
            {filtered.map((p) => (
              <Tr key={p.id}>
                <Td className="font-medium text-gray-900 dark:text-gray-100">{p.name}</Td>
                <Td><code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs dark:bg-gray-800">{p.code}</code></Td>
                <Td>
                  <Badge variant={p.isActive ? "green" : "gray"}>
                    {p.isActive ? "Active" : "Inactive"}
                  </Badge>
                </Td>
                <Td className="text-gray-500 dark:text-gray-400">
                  {new Date(p.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </Td>
                <Td className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setEditing(p)}>Edit</Button>
                    <Button size="sm" variant="ghost" onClick={() => handleToggle(p)} disabled={isPending}>
                      {p.isActive ? "Deactivate" : "Activate"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setDeleting(p)}
                      className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950">
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
      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Create programme"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button variant="primary" type="submit" form="create-prog-form">Create</Button>
          </>
        }
      >
        <form id="create-prog-form" action={handleCreate} className="space-y-4">
          <Field label="Programme name" required
            error={createState.status === "error" ? createState.fieldErrors?.name?.[0] : undefined}>
            <Input name="name" placeholder="Bachelor of Science in Computer Science" required />
          </Field>
          <Field label="Programme code" required
            error={createState.status === "error" ? createState.fieldErrors?.code?.[0] : undefined}
            hint="Uppercase. Must be unique, e.g. BSC-CS">
            <Input name="code" placeholder="BSC-CS" required />
          </Field>
        </form>
      </Modal>

      {/* Edit modal */}
      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title="Edit programme"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            <Button variant="primary" type="submit" form="edit-prog-form">Save changes</Button>
          </>
        }
      >
        {editing && (
          <form id="edit-prog-form" action={handleEdit} className="space-y-4">
            <input type="hidden" name="id" value={editing.id} />
            <Field label="Programme name" required
              error={editState.status === "error" ? editState.fieldErrors?.name?.[0] : undefined}>
              <Input name="name" defaultValue={editing.name} required />
            </Field>
            <Field label="Programme code" required
              error={editState.status === "error" ? editState.fieldErrors?.code?.[0] : undefined}>
              <Input name="code" defaultValue={editing.code} required />
            </Field>
          </form>
        )}
      </Modal>

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Delete programme"
        message={`Are you sure you want to delete "${deleting?.name}"? This cannot be undone. Any students enrolled in this programme must be reassigned first.`}
        confirmLabel="Delete programme"
        danger
        loading={delLoading}
      />
    </div>
  );
}

function PlusIcon() {
  return <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>;
}
