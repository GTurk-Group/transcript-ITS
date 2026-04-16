/**
 * Global 404 page.
 *
 * Shown for any unmatched route.
 * Styled consistently with the app — dark mode, no app shell.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="text-center">
        <p className="text-6xl font-bold text-gray-200 dark:text-gray-800">404</p>
        <h1 className="mt-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
          Page not found
        </h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          The page you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to it.
        </p>
        <a
          href="/dashboard"
          className="mt-6 inline-flex items-center rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
        >
          Back to dashboard
        </a>
      </div>
    </div>
  );
}
