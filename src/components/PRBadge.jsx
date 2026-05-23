export default function PRBadge({ label = 'PR', subtle = false, className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-bold tracking-wide uppercase rounded-full px-2 py-0.5 ${
        subtle
          ? 'bg-pr-subtle text-[#9c7400]'
          : 'bg-pr text-ink'
      } ${className}`}
    >
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2l2.39 4.84 5.34.78-3.86 3.76.91 5.31L12 14.27l-4.78 2.51.91-5.31L4.27 7.62l5.34-.78L12 2z" />
      </svg>
      {label}
    </span>
  );
}
