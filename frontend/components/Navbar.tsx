import Link from 'next/link';

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 w-full h-20 bg-white border-b border-[var(--color-border)] z-50 flex items-center px-12 shadow-md">
      <div className="flex items-center gap-12">
        <Link href="/" className="font-bold text-2xl lg:text-3xl text-[var(--color-primary)] tracking-tight">
          MERIDIAN
        </Link>
        <div className="hidden md:flex items-center gap-10 text-base font-medium text-[var(--color-text-secondary)]">
          <Link href="/markets" className="hover:text-[var(--color-text-primary)] transition-colors">Markets</Link>
          <Link href="/leaderboard" className="hover:text-[var(--color-text-primary)] transition-colors">Leaderboard</Link>
          <Link href="/about" className="hover:text-[var(--color-text-primary)] transition-colors">About</Link>
        </div>
      </div>
      <div className="ml-auto flex items-center gap-6">
        <Link href="/auth/login" className="hidden sm:block text-base font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">
          Log In
        </Link>
        <Link href="/auth/register" className="btn-primary py-3 px-6 text-base bg-[var(--color-bg-primary)] border border-[var(--color-border)] text-black hover:bg-gray-50 rounded-lg font-semibold">
          Get Started
        </Link>
      </div>
    </nav>
  );
}
