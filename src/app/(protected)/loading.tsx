export default function ProtectedLoading() {
  return (
    <div className="flex min-h-[calc(100vh-2rem)] items-center justify-center">
      <div className="flex flex-col items-center gap-3 rounded-xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
        <div
          className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-[#1f6b87]"
          aria-hidden="true"
        />
        <p className="text-sm font-medium text-slate-600">Loading page...</p>
      </div>
    </div>
  );
}
