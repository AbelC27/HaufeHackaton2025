import Link from 'next/link';
import Image from 'next/image';

export default function Navigation({ theme }: { theme: 'dark' | 'light' }) {
  const linkClass = `px-4 py-2 rounded-lg transition-colors ${
    theme === 'dark' 
      ? 'hover:bg-gray-800 text-gray-300 hover:text-white' 
      : 'hover:bg-gray-200 text-gray-700 hover:text-gray-900'
  }`;

  return (
    <div className="flex items-center justify-between w-full">
      {/* Logo and Brand */}
      <div className="flex items-center gap-3">
        <Image 
          src="/logo_photo.jpg" 
          alt="DEVCOR Logo" 
          width={40} 
          height={40}
          className="rounded-lg"
        />
        <div className="flex flex-col">
          <h1 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            DEVCOR
          </h1>
          <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            AI Code Review Platform
          </p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex items-center gap-2">
        <Link href="/" className={linkClass}>
          🏠 Review
        </Link>
        <Link href="/dashboard" className={linkClass}>
          📊 Dashboard
        </Link>
        <Link href="/history" className={linkClass}>
          📜 History
        </Link>
        <Link href="/settings" className={linkClass}>
          ⚙️ Settings
        </Link>
      </nav>
    </div>
  );
}
