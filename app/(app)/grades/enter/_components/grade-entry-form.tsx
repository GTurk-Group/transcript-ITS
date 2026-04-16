"use client";

/**
 * Grade entry form — client component.
 *
 * Shows a live preview of quality points as the user selects a grade
 * and course, so they can verify before submitting.
 *
 * Uses useActionState with the createGradeAction.
 */

import { useActionState, useState, useEffect } from "react";
import { createGradeAction } from "@/actions/crud/grades";
import { DEFAULT_GRADE_SCALE } from "@/lib/gpa/scale";
import type { ActionState } from "@/types/auth";

type Semester = { id: string; year: number; semester: "FIRST" | "SECOND" };
type Course = {
  id: string;
  code: string;
  title: string;
  creditHours: number;
  isScoring: boolean | null;
};
type Student = {
  id: string;
  indexNumber: string;
  firstName: string;
  lastName: string;
  programmeName: string;
};

type Props = {
  semesters: Semester[];
  courses: Course[];
  students: Student[];
};

const GRADE_OPTIONS = Object.keys(DEFAULT_GRADE_SCALE) as Array<
  keyof typeof DEFAULT_GRADE_SCALE
>;

const initialState: ActionState = { status: "idle" };

export function GradeEntryForm({ semesters, courses, students }: Props) {
  const [state, formAction, isPending] = useActionState(
    createGradeAction,
    initialState
  );

  const [selectedGrade, setSelectedGrade] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState("");

  const selectedCourse = courses.find((c) => c.id === selectedCourseId);
  const gradePoint = selectedGrade
    ? DEFAULT_GRADE_SCALE[selectedGrade as keyof typeof DEFAULT_GRADE_SCALE]
    : null;
  const qualityPoints =
    gradePoint !== null && selectedCourse
      ? (gradePoint * selectedCourse.creditHours).toFixed(2)
      : null;

  // Reset preview when form succeeds
  useEffect(() => {
    if (state.status === "success") {
      setSelectedGrade("");
      setSelectedCourseId("");
    }
  }, [state.status]);

  const fieldErrors =
    state.status === "error" ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="space-y-5">
      {state.status === "success" && (
        <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Grade submitted successfully.
        </div>
      )}
      {state.status === "error" && state.error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-5">
        {/* Student */}
        <Field
          label="Student"
          name="studentId"
          error={fieldErrors?.studentId?.[0]}
        >
          <select
            name="studentId"
            required
            disabled={isPending}
            className="select-field"
          >
            <option value="">Select student…</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.indexNumber} — {s.firstName} {s.lastName} ({s.programmeName})
              </option>
            ))}
          </select>
        </Field>

        {/* Semester */}
        <Field
          label="Semester"
          name="semesterId"
          error={fieldErrors?.semesterId?.[0]}
        >
          <select
            name="semesterId"
            required
            disabled={isPending}
            className="select-field"
          >
            <option value="">Select semester…</option>
            {semesters.map((s) => (
              <option key={s.id} value={s.id}>
                {s.year}/{s.year + 1} —{" "}
                {s.semester === "FIRST" ? "First" : "Second"} Semester
              </option>
            ))}
          </select>
        </Field>

        {/* Course */}
        <Field
          label="Course"
          name="courseId"
          error={fieldErrors?.courseId?.[0]}
        >
          <select
            name="courseId"
            required
            disabled={isPending}
            className="select-field"
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
          >
            <option value="">Select course…</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} — {c.title} ({c.creditHours} cr. hrs)
                {c.isScoring === false ? " [non-scoring]" : ""}
              </option>
            ))}
          </select>
        </Field>

        {/* Grade */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            Grade
          </label>
          <div className="flex flex-wrap gap-2">
            {GRADE_OPTIONS.map((g) => (
              <label
                key={g}
                className={[
                  "cursor-pointer rounded-lg border-2 px-4 py-2 text-sm font-bold",
                  "transition-colors",
                  selectedGrade === g
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-300",
                  isPending ? "pointer-events-none opacity-60" : "",
                ].join(" ")}
              >
                <input
                  type="radio"
                  name="grade"
                  value={g}
                  className="sr-only"
                  checked={selectedGrade === g}
                  onChange={() => setSelectedGrade(g)}
                />
                {g}
              </label>
            ))}
          </div>
          {/* Hidden inputs for the grade point and credit hours */}
          {selectedGrade && gradePoint !== null && (
            <input type="hidden" name="gradePoint" value={gradePoint} />
          )}
          {selectedCourse && (
            <input
              type="hidden"
              name="creditHours"
              value={selectedCourse.creditHours}
            />
          )}
        </div>

        {/* Live quality points preview */}
        {qualityPoints !== null && selectedCourse && (
          <div className="rounded-lg bg-blue-50 border border-blue-100 px-4 py-3">
            <p className="text-xs font-medium text-blue-600 uppercase tracking-wide">
              Computed quality points preview
            </p>
            <p className="mt-1 text-sm text-blue-900">
              {gradePoint!.toFixed(2)} grade pts × {selectedCourse.creditHours}{" "}
              credit hrs ={" "}
              <span className="font-bold text-blue-700">{qualityPoints}</span>
            </p>
            {selectedCourse.isScoring === false && (
              <p className="mt-1 text-xs text-blue-600">
                This is a non-scoring course — it will not affect GPA.
              </p>
            )}
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={isPending || !selectedGrade || !selectedCourseId}
        className={[
          "w-full rounded-lg px-4 py-2.5 text-sm font-medium text-white",
          "transition-colors focus:outline-none focus:ring-2",
          "focus:ring-blue-500 focus:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          isPending
            ? "bg-blue-400"
            : "bg-blue-600 hover:bg-blue-700 active:bg-blue-800",
        ].join(" ")}
      >
        {isPending ? "Submitting…" : "Submit grade"}
      </button>
    </form>
  );
}

// ─── Field wrapper ─────────────────────────────────────────────────────────────

function Field({
  label,
  name,
  error,
  children,
}: {
  label: string;
  name: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={name}
        className="mb-1.5 block text-sm font-medium text-gray-700"
      >
        {label}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
