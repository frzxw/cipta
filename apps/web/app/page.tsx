import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cipta — Control Tower',
};

export default function HomePage() {
  return (
    <main
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1.5rem',
        padding: '2rem',
        background: 'var(--background)',
        color: 'var(--foreground)',
        fontFamily: 'var(--font-sans)',
      }}
    >
      {/* Wordmark */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
          <rect width="32" height="32" rx="8" fill="hsl(25 95% 53%)" />
          <path
            d="M8 16C8 11.582 11.582 8 16 8C18.21 8 20.21 8.895 21.657 10.344L18.828 13.172C18.062 12.406 17.031 12 16 12C13.791 12 12 13.791 12 16C12 18.209 13.791 20 16 20C17.031 20 18.062 19.594 18.828 18.828L21.657 21.656C20.21 23.105 18.21 24 16 24C11.582 24 8 20.418 8 16Z"
            fill="white"
          />
        </svg>
        <span
          style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            color: 'var(--foreground)',
          }}
        >
          Cipta
        </span>
      </div>

      <p
        style={{
          fontSize: '0.875rem',
          color: 'var(--muted-foreground)',
          textAlign: 'center',
          maxWidth: '20rem',
        }}
      >
        Control Tower — AI-powered video production pipeline
      </p>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.375rem 0.75rem',
          borderRadius: '9999px',
          background: 'hsl(25 95% 53% / 0.15)',
          border: '1px solid hsl(25 95% 53% / 0.3)',
          fontSize: '0.75rem',
          color: 'hsl(25 95% 63%)',
        }}
      >
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: 'hsl(25 95% 53%)',
            display: 'inline-block',
          }}
        />
        Bootstrap complete — Issue #14 ✓
      </div>
    </main>
  );
}
