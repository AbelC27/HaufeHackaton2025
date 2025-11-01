import Link from 'next/link';

export default function Navigation({ theme }: { theme: 'dark' | 'light' }) {
  const linkClass = `px-4 py-2 rounded-lg transition-colors ${
    theme === 'dark' 
      ? 'hover:bg-gray-800 text-gray-300 hover:text-white' 
      : 'hover:bg-gray-200 text-gray-700 hover:text-gray-900'
  }`;

  return (
    <nav className="flex items-center gap-2">
      <Link href="/" className={linkClass}>
        🏠 Review
      </Link>
      <Link href="/history" className={linkClass}>
        📚 History
      </Link>
      <Link href="/analytics" className={linkClass}>
        📊 Analytics
      </Link>
      <Link href="/settings" className={linkClass}>
        ⚙️ Settings
      </Link>
    </nav>
  );
}
