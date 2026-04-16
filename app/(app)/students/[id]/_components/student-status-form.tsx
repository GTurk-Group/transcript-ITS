"use client";

import { useTransition, useState } from "react";
import { updateStudentStatusAction } from "@/actions/crud/students";

type Props = {
  studentId:     string;
  currentStatus: string;
};

const STATUSES = ["ACTIVE", "GRADUATED", "WITHDRAWN"] as const;

export function StudentStatusForm({ studentId, currentStatus }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError]            = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const status = e.target.value as (typeof STATUSES)[number];
    if (status === currentStatus) return;
    setError(null);
    startTransition(async () => {
      const result = await updateStudentStatusAction(studentId, status);
      if (result.status === "error") setError(result.error);
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <select
        defaultValue={currentStatus}
        onChange={handleChange}
        disabled={isPending}
        className="h-8 rounded-md border border-gray-300 bg-white px-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
      {isPending && <span className="text-xs text-gray-400">Saving…</span>}
      {error   && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
