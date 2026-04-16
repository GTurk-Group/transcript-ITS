"use client";

import type { AuthenticatedAdmin } from "@/types/auth";
import { can } from "@/lib/auth/permissions";

type Stats = {
  students: number;
  activeStudents: number;
  courses: number;
  programmes: number;
  semesters: number;
  grades: number;
  transcripts: number;
};

type Props = {
  session: AuthenticatedAdmin;
  stats: Stats;
};

export function DashboardClient({ session, stats }: Props) {
  const roleName = session.role.replace("_", " ");
  const isAdmin = session.role === "ADMIN" || session.role === "SUPER_ADMIN";

  return (
    <div className="space-y-8">

      {/* ── Welcome ─────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
          Good {timeOfDay()}, {firstName(session.email)}
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Signed in as{" "}
          <span className="font-medium text-gray-700 dark:text-gray-300">{session.email}</span>
          {" "}&middot;{" "}
          <span className="capitalize">{roleName.toLowerCase()}</span>
        </p>
      </div>

      {/* ── Stat cards — ADMIN / SUPER_ADMIN only ────────────────────────── */}
      {isAdmin && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard
            label="Total students"
            value={stats.students}
            sub={`${stats.activeStudents} active`}
            href="/students"
            color="blue"
            icon={<StudentsIcon />}
          />
          <StatCard
            label="Programmes"
            value={stats.programmes}
            href="/programmes"
            color="purple"
            icon={<ProgrammeIcon />}
          />
          <StatCard
            label="Courses"
            value={stats.courses}
            href="/courses"
            color="emerald"
            icon={<CourseIcon />}
          />
          <StatCard
            label="Grade records"
            value={stats.grades}
            sub={`${stats.transcripts} transcripts`}
            href="/grades"
            color="amber"
            icon={<GradeIcon />}
          />
        </div>
      )}

      {/* ── Quick actions ─────────────────────────────────────────────────── */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
          Quick actions
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <QuickCard
            href="/students"
            title={can(session, "manage_students") ? "Manage students" : "Search students"}
            description={can(session, "manage_students")
              ? "Add, search, and update student records."
              : "Search and view student records."}
            icon={<StudentsIcon />}
            color="blue"
          />
          <QuickCard
            href="/grades"
            title="Enter grades"
            description="Search a student and submit semester results."
            icon={<GradeIcon />}
            color="emerald"
            show={can(session, "enter_grades")}
          />
          <QuickCard
            href="/transcripts"
            title="Transcripts"
            description="View, generate and download official PDF transcripts."
            icon={<TranscriptIcon />}
            color="purple"
          />
          <QuickCard
            href="/bulk/upload"
            title="Bulk student import"
            description="Upload a CSV to register multiple students at once."
            icon={<UploadIcon />}
            color="amber"
            show={can(session, "bulk_upload")}
          />
          <QuickCard
            href="/bulk/grades"
            title="Bulk grade import"
            description="Upload semester results for multiple students."
            icon={<ClipboardIcon />}
            color="teal"
            show={can(session, "bulk_upload")}
          />
          <QuickCard
            href="/programmes"
            title="Programmes"
            description="Manage academic programmes and codes."
            icon={<ProgrammeIcon />}
            color="rose"
            show={can(session, "manage_programmes")}
          />
          <QuickCard
            href="/courses"
            title="Courses"
            description="Manage courses, credit hours, and scoring flags."
            icon={<CourseIcon />}
            color="orange"
            show={can(session, "manage_courses")}
          />
          <QuickCard
            href="/semesters"
            title="Semesters"
            description="Create and manage academic periods."
            icon={<CalIcon />}
            color="sky"
            show={can(session, "manage_courses")}
          />
          <QuickCard
            href="/audit"
            title="Audit log"
            description="View immutable record of all system activity."
            icon={<AuditIcon />}
            color="gray"
            show={can(session, "view_audit_logs")}
          />
        </div>
      </section>

      {/* ── System overview — ADMIN / SUPER_ADMIN only ───────────────────── */}
      {isAdmin && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
            System overview
          </h2>
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {[
                {
                  label: "Semesters configured",
                  value: stats.semesters,
                  warn: stats.semesters === 0,
                  warnMsg: "No semesters — grade entry is blocked",
                },
                { label: "Active programmes", value: stats.programmes },
                { label: "Active courses", value: stats.courses },
                { label: "Students registered", value: stats.students },
                { label: "Active students", value: stats.activeStudents },
                { label: "Transcripts issued", value: stats.transcripts },
              ].map(({ label, value, warn, warnMsg }) => (
                <div key={label} className="flex items-center justify-between px-5 py-3">
                  <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
                  <div className="flex items-center gap-2">
                    {warn && (
                      <span className="text-xs text-amber-600 dark:text-amber-400">{warnMsg}</span>
                    )}
                    <span className={`text-sm font-semibold tabular-nums ${warn
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-gray-900 dark:text-gray-100"
                      }`}>
                      {value.toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

type Color = "blue" | "purple" | "emerald" | "amber" | "teal" | "rose" | "orange" | "sky" | "gray";

const COLOR_MAP: Record<Color, { stat: string; icon: string; ring: string }> = {
  blue: { stat: "text-blue-700    dark:text-blue-400", icon: "bg-blue-100    text-blue-600    dark:bg-blue-950    dark:text-blue-400", ring: "hover:border-blue-300    dark:hover:border-blue-700" },
  purple: { stat: "text-purple-700  dark:text-purple-400", icon: "bg-purple-100  text-purple-600  dark:bg-purple-950  dark:text-purple-400", ring: "hover:border-purple-300  dark:hover:border-purple-700" },
  emerald: { stat: "text-emerald-700 dark:text-emerald-400", icon: "bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400", ring: "hover:border-emerald-300 dark:hover:border-emerald-700" },
  amber: { stat: "text-amber-700   dark:text-amber-400", icon: "bg-amber-100   text-amber-600   dark:bg-amber-950   dark:text-amber-400", ring: "hover:border-amber-300   dark:hover:border-amber-700" },
  teal: { stat: "text-teal-700    dark:text-teal-400", icon: "bg-teal-100    text-teal-600    dark:bg-teal-950    dark:text-teal-400", ring: "hover:border-teal-300    dark:hover:border-teal-700" },
  rose: { stat: "text-rose-700    dark:text-rose-400", icon: "bg-rose-100    text-rose-600    dark:bg-rose-950    dark:text-rose-400", ring: "hover:border-rose-300    dark:hover:border-rose-700" },
  orange: { stat: "text-orange-700  dark:text-orange-400", icon: "bg-orange-100  text-orange-600  dark:bg-orange-950  dark:text-orange-400", ring: "hover:border-orange-300  dark:hover:border-orange-700" },
  sky: { stat: "text-sky-700     dark:text-sky-400", icon: "bg-sky-100     text-sky-600     dark:bg-sky-950     dark:text-sky-400", ring: "hover:border-sky-300     dark:hover:border-sky-700" },
  gray: { stat: "text-gray-700    dark:text-gray-400", icon: "bg-gray-100    text-gray-600    dark:bg-gray-800    dark:text-gray-400", ring: "hover:border-gray-300    dark:hover:border-gray-600" },
};

function StatCard({
  label, value, sub, href, color, icon,
}: {
  label: string; value: number; sub?: string;
  href: string; color: Color; icon: React.ReactNode;
}) {
  const c = COLOR_MAP[color];
  return (
    <a href={href} className="group flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-5 transition-all hover:shadow-md dark:border-gray-700 dark:bg-gray-900">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</span>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${c.icon}`}>
          <span className="h-4 w-4">{icon}</span>
        </div>
      </div>
      <p className={`text-3xl font-bold tabular-nums ${c.stat}`}>{value.toLocaleString()}</p>
      {sub && <p className="text-xs text-gray-500 dark:text-gray-500">{sub}</p>}
    </a>
  );
}

function QuickCard({
  href, title, description, icon, color, show = true,
}: {
  href: string; title: string; description: string;
  icon: React.ReactNode; color: Color; show?: boolean;
}) {
  if (!show) return null;
  const c = COLOR_MAP[color];
  return (
    <a href={href} className={`group flex items-start gap-4 rounded-xl border border-gray-200 bg-white p-5 transition-all hover:shadow-sm dark:border-gray-700 dark:bg-gray-900 ${c.ring}`}>
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${c.icon}`}>
        <span className="h-4 w-4">{icon}</span>
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-900 group-hover:text-gray-700 dark:text-gray-100 dark:group-hover:text-gray-300">{title}</p>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-500">{description}</p>
      </div>
    </a>
  );
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function timeOfDay(): string {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

function firstName(email: string): string {
  return email.split("@")[0].split(".")[0];
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function StudentsIcon() { return <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>; }
function ProgrammeIcon() { return <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" /></svg>; }
function CourseIcon() { return <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg>; }
function GradeIcon() { return <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" /></svg>; }
function TranscriptIcon() { return <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>; }
function UploadIcon() { return <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>; }
function ClipboardIcon() { return <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" /></svg>; }
function CalIcon() { return <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>; }
function AuditIcon() { return <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m5.231 13.481L15 17.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v16.5c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9zm3.75 11.625a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>; }