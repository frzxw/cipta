import Link from 'next/link';

interface LogoProps {
  collapsed?: boolean;
}

export function Logo({ collapsed = false }: LogoProps) {
  return (
    <Link
      href="/"
      className="flex items-center gap-2.5 min-w-0 group"
      aria-label="Cipta — Control Tower"
    >
      {/* Icon mark */}
      <svg
        width="28"
        height="28"
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden="true"
        className="shrink-0 transition-transform duration-150 ease-out group-hover:scale-105"
      >
        <rect width="32" height="32" rx="8" fill="hsl(25 95% 53%)" />
        <path
          d="M8 16C8 11.582 11.582 8 16 8C18.21 8 20.21 8.895 21.657 10.344L18.828 13.172C18.062 12.406 17.031 12 16 12C13.791 12 12 13.791 12 16C12 18.209 13.791 20 16 20C17.031 20 18.062 19.594 18.828 18.828L21.657 21.656C20.21 23.105 18.21 24 16 24C11.582 24 8 20.418 8 16Z"
          fill="white"
        />
      </svg>

      {/* Wordmark — hidden when sidebar collapsed */}
      {!collapsed && (
        <span className="text-[1.0625rem] font-bold tracking-tight text-foreground truncate">
          Cipta
        </span>
      )}
    </Link>
  );
}
