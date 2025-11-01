'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ResourcesPage() {
  const router = useRouter();
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [installing, setInstalling] = useState(false);
  const [installStatus, setInstallStatus] = useState<string>('');
  const [vscodeStatus, setVscodeStatus] = useState<any>(null);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCommand(label);
    setTimeout(() => setCopiedCommand(null), 2000);
  };

  const handleDownload = async (action: () => void, label: string) => {
    setDownloading(label);
    try {
      await action();
      setTimeout(() => setDownloading(null), 2000);
    } catch (error) {
      console.error('Download failed:', error);
      setDownloading(null);
      alert('Download failed. Please try again.');
    }
  };

  const checkVSCodeStatus = async () => {
    try {
      const response = await fetch('/api/install-extension', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check' }),
      });
      
      if (!response.ok) {
        console.error('API returned error:', response.status);
        setVscodeStatus({
          vscodeInstalled: false,
          message: 'Unable to check VS Code status. API endpoint may not be ready.',
        });
        return null;
      }
      
      const data = await response.json();
      setVscodeStatus(data);
      return data;
    } catch (error) {
      console.error('Failed to check VS Code status:', error);
      setVscodeStatus({
        vscodeInstalled: false,
        message: 'Unable to connect to API. Please restart Next.js server.',
      });
      return null;
    }
  };

  const installExtension = async () => {
    setInstalling(true);
    setInstallStatus('Checking VS Code installation...');

    try {
      // Check if VS Code is installed
      const status = await checkVSCodeStatus();
      if (!status) {
        setInstallStatus('❌ API Error: Please restart Next.js server (npm run dev in frontend/frontend folder)');
        setInstalling(false);
        return;
      }
      if (!status.vscodeInstalled) {
        setInstallStatus('❌ VS Code not found. Please install VS Code first and ensure "code" command is in PATH.');
        setInstalling(false);
        return;
      }

      setInstallStatus('Building extension... (this may take 1-2 minutes)');
      
      // Build and install
      const response = await fetch('/api/install-extension', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'install' }),
      });

      const data = await response.json();

      if (data.success) {
        setInstallStatus('✅ Extension installed! Please reload VS Code.');
        setTimeout(() => {
          setInstallStatus('');
          checkVSCodeStatus(); // Refresh status
        }, 5000);
      } else {
        setInstallStatus(`❌ Installation failed: ${data.error || data.details || 'Unknown error'}`);
      }
    } catch (error: any) {
      console.error('Installation error:', error);
      setInstallStatus(`❌ Installation failed: ${error.message}`);
    } finally {
      setInstalling(false);
    }
  };

  const resources = [
    {
      id: 'vscode-extension',
      icon: '🔌',
      title: 'VS Code Extension',
      description: 'AI-powered code assistant directly in your editor',
      features: [
        'Right-click AI commands (Explain, Fix, Document, Refactor)',
        'Inline code suggestions with decorations',
        'Chat panel for conversational AI assistance',
        'Keyboard shortcuts: Ctrl+Shift+E, Ctrl+Shift+F',
        'Custom coding rules configuration',
      ],
      downloads: [
        {
          label: '🔨 Build Instructions',
          type: 'primary',
          action: () => {
            const instructions = `# Build DEVCOR VS Code Extension

## Prerequisites:
- Node.js 16+ installed
- npm installed

## Steps:

1. Navigate to extension folder:
   cd vscode-extension

2. Install dependencies:
   npm install

3. Install VSCE (VS Code Extension packager):
   npm install -g @vscode/vsce

4. Build the extension:
   npm run compile

5. Package the extension:
   vsce package

6. Install the generated VSIX file:
   code --install-extension devcor-ai-assistant-1.0.0.vsix

## Alternative - Quick Install:
If you have the source code, you can develop without packaging:
1. Open vscode-extension folder in VS Code
2. Press F5 to launch Extension Development Host
3. Test the extension in the new window

## Configure Backend URL:
After installation, set the backend URL in VS Code settings:
File → Preferences → Settings → Search "AI Code Assistant"
Set "Backend URL" to: http://127.0.0.1:8000
`;
            const blob = new Blob([instructions], { type: 'text/markdown' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'BUILD_VSCODE_EXTENSION.md';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          },
        },
        {
          label: '📂 View Source Code',
          type: 'secondary',
          action: () => {
            // Navigate to the vscode-extension folder on GitHub
            window.open('https://github.com/AbelC27/HaufeHackaton/tree/main/vscode-extension', '_blank');
          },
        },
        {
          label: '🚀 Quick Start (Dev Mode)',
          type: 'secondary',
          action: () => {
            const quickStart = `# Quick Start - VS Code Extension (Dev Mode)

This method lets you run the extension without building a VSIX file.

## Steps:

1. Make sure you have the HaufeHackaton repository cloned

2. Open the vscode-extension folder in VS Code:
   cd HaufeHackaton/vscode-extension
   code .

3. Install dependencies (first time only):
   npm install

4. Press F5 (or Run → Start Debugging)
   - This opens a new VS Code window with the extension loaded

5. In the new window, open any code file and try:
   - Right-click → AI: Explain Selected Code
   - Or press Ctrl+Shift+E

6. Make sure Django backend is running on http://127.0.0.1:8000

## Benefits of Dev Mode:
✓ No need to package VSIX
✓ Changes auto-reload when you edit extension code
✓ Great for testing and development
✓ Full debugging support

## Make it Permanent:
When ready for production, follow the build instructions to create a VSIX package.
`;
            const blob = new Blob([quickStart], { type: 'text/markdown' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'QUICK_START_VSCODE.md';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          },
        },
      ],
      installSteps: [
        '📥 Download build instructions or quick start guide above',
        '🔨 OPTION 1 - Build VSIX: Follow BUILD_VSCODE_EXTENSION.md to create installable package',
        '🚀 OPTION 2 - Dev Mode: Follow QUICK_START_VSCODE.md to run without building (recommended for testing)',
        '📦 For VSIX: Open VS Code → Ctrl+Shift+P → "Extensions: Install from VSIX" → Select file',
        '⚙️ For Dev Mode: Open vscode-extension folder in VS Code → Press F5',
        '🔧 Configure backend URL: File → Preferences → Settings → "AI Code Assistant Backend URL" → http://127.0.0.1:8000',
        '✅ Test: Right-click in any code file → AI: Explain Selected Code',
      ],
      commands: [
        { label: 'Install via CLI', command: 'code --install-extension devcor-ai-assistant-1.0.0.vsix' },
      ],
    },
    {
      id: 'pre-commit-hook',
      icon: '🛡️',
      title: 'Git Pre-Commit Hook',
      description: 'Automatic code review before every commit',
      features: [
        'Scans all staged files automatically',
        'Blocks commits with critical security issues',
        'Severity classification (HIGH/MEDIUM/LOW)',
        'Configurable focus areas (security, performance, style)',
        'Smart file filtering (only code files)',
      ],
      downloads: [
        {
          label: '📥 Download Hook Script',
          type: 'primary',
          action: () => {
            const link = document.createElement('a');
            link.href = '/api/downloads/pre-commit-hook';
            link.download = 'pre-commit-hook.py';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          },
        },
        {
          label: '🪟 Windows Installer',
          type: 'secondary',
          action: () => {
            const link = document.createElement('a');
            link.href = '/api/downloads/install-hook-bat';
            link.download = 'install-hook.bat';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          },
        },
        {
          label: '🐧 Linux/Mac Installer',
          type: 'secondary',
          action: () => {
            const link = document.createElement('a');
            link.href = '/api/downloads/install-hook-sh';
            link.download = 'install-hook.sh';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          },
        },
      ],
      installSteps: [
        'Download the installer for your OS (or the Python script)',
        'Windows: Run install-hook.bat',
        'Linux/Mac: chmod +x install-hook.sh && ./install-hook.sh',
        'Or manually: Copy pre-commit-hook.py to .git/hooks/pre-commit',
        'Install Python dependencies: pip install requests',
        'Configure API_URL and FOCUS_TYPE in the script',
        'Test: git commit -m "test" (should trigger review)',
      ],
      commands: [
        { label: 'Windows Install', command: '.\\install-hook.bat' },
        { label: 'Linux/Mac Install', command: 'chmod +x install-hook.sh && ./install-hook.sh' },
        { label: 'Manual Install', command: 'cp pre-commit-hook.py /path/to/project/.git/hooks/pre-commit && chmod +x /path/to/project/.git/hooks/pre-commit' },
        { label: 'Install Dependencies', command: 'pip install requests' },
      ],
    },
    {
      id: 'docker-setup',
      icon: '🐳',
      title: 'Docker Compose Setup',
      description: 'All-in-one deployment for your team',
      features: [
        'Ollama AI engine in container',
        'Django backend with auto-scaling',
        'Next.js frontend with hot reload',
        'Persistent data volumes',
        'Production-ready configuration',
      ],
      downloads: [
        {
          label: 'Download Docker Compose',
          type: 'primary',
          action: () => {
            const dockerCompose = `version: '3.8'
services:
  ollama:
    image: ollama/ollama
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama
    command: >
      sh -c "ollama serve & sleep 5 && ollama pull codellama:13b && wait"
  
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    depends_on:
      - ollama
    environment:
      - OLLAMA_URL=http://ollama:11434
      - DEBUG=False
    volumes:
      - ./backend:/app
    command: python manage.py runserver 0.0.0.0:8000
  
  frontend:
    build: ./frontend/frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend
    environment:
      - NEXT_PUBLIC_API_URL=http://backend:8000
      - NEXT_PUBLIC_SUPABASE_URL=\${NEXT_PUBLIC_SUPABASE_URL}
      - NEXT_PUBLIC_SUPABASE_ANON_KEY=\${NEXT_PUBLIC_SUPABASE_ANON_KEY}
    volumes:
      - ./frontend/frontend:/app
      - /app/node_modules
      - /app/.next
    command: npm run dev

volumes:
  ollama_data:`;
            const blob = new Blob([dockerCompose], { type: 'text/yaml' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'docker-compose.yml';
            a.click();
          },
        },
      ],
      installSteps: [
        'Download docker-compose.yml file above',
        'Place it in your HaufeHackaton project root',
        'Create .env file with Supabase credentials',
        'Run: docker-compose up -d',
        'Wait 2-3 minutes for Ollama to download model',
        'Access at: http://localhost:3000',
        'Stop: docker-compose down',
      ],
      commands: [
        { label: 'Start All Services', command: 'docker-compose up -d' },
        { label: 'View Logs', command: 'docker-compose logs -f' },
        { label: 'Stop All Services', command: 'docker-compose down' },
        { label: 'Rebuild After Changes', command: 'docker-compose up -d --build' },
      ],
    },
  ];

  return (
    <main className="text-white min-h-screen pb-16">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent mb-4">
            📦 Downloads & Resources
          </h1>
          <p className="text-xl text-gray-400">
            Extend DEVCOR with powerful integrations for your development workflow
          </p>
        </div>

        {/* Info Banner */}
        <div className="bg-gradient-to-r from-green-900/30 to-blue-900/30 border border-green-700/50 rounded-xl p-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="text-4xl">✨</div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-2xl font-bold text-white">Ready to Download!</h2>
                <button
                  onClick={checkVSCodeStatus}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  🔍 Check VS Code Status
                </button>
              </div>
              <div className="space-y-2 text-gray-300">
                <p className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  <strong>Pre-Commit Hook:</strong> Click to download Python script and installers directly
                </p>
                <p className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  <strong>VS Code Extension:</strong> One-click auto-installer (recommended!)
                </p>
                <p className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  <strong>Docker Setup:</strong> One-click download of docker-compose.yml
                </p>
              </div>
              {vscodeStatus && (
                <div className="mt-4 p-3 bg-blue-900/30 border border-blue-700 rounded-lg">
                  <p className="text-sm text-blue-200 font-semibold mb-2">
                    �️ System Status:
                  </p>
                  <div className="text-xs text-gray-300 space-y-1">
                    <p>• VS Code: {vscodeStatus.vscodeInstalled ? <span className="text-green-400">✓ Installed ({vscodeStatus.vscodeVersion})</span> : <span className="text-red-400">✗ Not found</span>}</p>
                    <p>• DEVCOR Extension: {vscodeStatus.extensionInstalled ? <span className="text-green-400">✓ Installed</span> : <span className="text-yellow-400">Not installed</span>}</p>
                  </div>
                </div>
              )}
              {!vscodeStatus && (
                <div className="mt-4 p-3 bg-blue-900/30 border border-blue-700 rounded-lg">
                  <p className="text-sm text-blue-200">
                    �💡 <strong>Tip:</strong> All files are served from your local installation - no external dependencies!
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Resources Grid */}
        <div className="space-y-12">
          {resources.map((resource) => (
            <div
              key={resource.id}
              className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden hover:border-blue-500 transition-all shadow-2xl"
            >
              {/* Resource Header */}
              <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-b border-gray-700 p-6">
                <div className="flex items-start gap-4">
                  <div className="text-6xl">{resource.icon}</div>
                  <div className="flex-1">
                    <h2 className="text-3xl font-bold text-white mb-2">
                      {resource.title}
                    </h2>
                    <p className="text-gray-300 text-lg">{resource.description}</p>
                  </div>
                </div>
              </div>

              <div className="p-6">
                {/* Features */}
                <div className="mb-8">
                  <h3 className="text-xl font-semibold text-white mb-4">✨ Features</h3>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {resource.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-gray-300">
                        <span className="text-green-400 mt-1">✓</span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Download Buttons */}
                <div className="mb-8">
                  <h3 className="text-xl font-semibold text-white mb-4">⬇️ Download</h3>
                  <div className="flex flex-wrap gap-3">
                    {resource.downloads.map((download, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleDownload(download.action, download.label)}
                        disabled={downloading === download.label}
                        className={`px-6 py-3 rounded-lg font-semibold transition-all relative ${
                          download.type === 'primary'
                            ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-lg disabled:from-gray-600 disabled:to-gray-600'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:bg-gray-800'
                        }`}
                      >
                        {downloading === download.label ? (
                          <span className="flex items-center gap-2">
                            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Downloading...
                          </span>
                        ) : (
                          download.label
                        )}
                      </button>
                    ))}
                  </div>

                  {/* One-Click Installer for VS Code Extension */}
                  {resource.id === 'vscode-extension' && (
                    <div className="mt-6 p-4 bg-gradient-to-r from-green-900/30 to-blue-900/30 border border-green-700 rounded-lg">
                      <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                        <span>🚀</span>
                        <span>One-Click Auto-Installer</span>
                        <span className="text-xs bg-green-600 text-white px-2 py-1 rounded">RECOMMENDED</span>
                      </h4>
                      <p className="text-sm text-gray-300 mb-4">
                        Install the extension directly to your VS Code with a single click! This will:
                        build the extension, package it, and install it automatically.
                      </p>
                      
                      <button
                        onClick={installExtension}
                        disabled={installing}
                        className="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-lg hover:from-green-700 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-600 transition-all shadow-lg flex items-center justify-center gap-2"
                      >
                        {installing ? (
                          <>
                            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Installing...
                          </>
                        ) : (
                          <>
                            <span>⚡</span>
                            <span>Install Extension to VS Code Now</span>
                          </>
                        )}
                      </button>

                      {installStatus && (
                        <div className={`mt-4 p-3 rounded-lg ${
                          installStatus.includes('✅') 
                            ? 'bg-green-900/50 border border-green-700 text-green-200' 
                            : installStatus.includes('❌')
                            ? 'bg-red-900/50 border border-red-700 text-red-200'
                            : 'bg-blue-900/50 border border-blue-700 text-blue-200'
                        }`}>
                          {installStatus}
                        </div>
                      )}

                      {vscodeStatus && (
                        <div className="mt-4 text-xs text-gray-400 space-y-1">
                          <p>✓ VS Code: {vscodeStatus.vscodeInstalled ? `Installed (${vscodeStatus.vscodeVersion})` : 'Not found'}</p>
                          <p>✓ Extension: {vscodeStatus.extensionInstalled ? 'Already installed' : 'Not installed'}</p>
                          {vscodeStatus.message && (
                            <p className="text-yellow-400 mt-2">⚠️ {vscodeStatus.message}</p>
                          )}
                        </div>
                      )}

                      {/* Troubleshooting */}
                      {installStatus.includes('❌') && (
                        <div className="mt-4 p-3 bg-yellow-900/30 border border-yellow-700 rounded-lg">
                          <p className="text-sm font-semibold text-yellow-300 mb-2">🔧 Troubleshooting:</p>
                          <ul className="text-xs text-yellow-200 space-y-1 list-disc list-inside">
                            <li><strong>404 Error:</strong> Restart Next.js: Stop terminal (Ctrl+C) and run <code className="bg-black px-1">npm run dev</code></li>
                            <li><strong>VS Code not found:</strong> Install VS Code and add to PATH, or use manual installation below</li>
                            <li><strong>Permission denied:</strong> Run VS Code as administrator once</li>
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Installation Steps */}
                <div className="mb-8">
                  <h3 className="text-xl font-semibold text-white mb-4">📋 Installation</h3>
                  <ol className="space-y-2">
                    {resource.installSteps.map((step, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-gray-300">
                        <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                          {idx + 1}
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                {/* Commands */}
                {resource.commands && resource.commands.length > 0 && (
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-4">💻 Commands</h3>
                    <div className="space-y-3">
                      {resource.commands.map((cmd, idx) => (
                        <div key={idx} className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-gray-400 font-semibold">{cmd.label}</span>
                            <button
                              onClick={() => copyToClipboard(cmd.command, cmd.label)}
                              className="text-xs px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                            >
                              {copiedCommand === cmd.label ? '✓ Copied!' : 'Copy'}
                            </button>
                          </div>
                          <code className="text-green-400 font-mono text-sm break-all">
                            {cmd.command}
                          </code>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Additional Resources */}
        <div className="mt-16 bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-700/50 rounded-xl p-8">
          <h2 className="text-3xl font-bold text-white mb-6">📚 Additional Resources</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <a
              href="https://github.com/AbelC27/HaufeHackaton"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 p-4 bg-gray-800 rounded-lg hover:bg-gray-750 transition-colors border border-gray-700"
            >
              <span className="text-4xl">📖</span>
              <div>
                <h3 className="text-xl font-semibold text-white">Documentation</h3>
                <p className="text-gray-400">Complete setup guides and API docs</p>
              </div>
            </a>
            <a
              href="https://github.com/AbelC27/HaufeHackaton/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 p-4 bg-gray-800 rounded-lg hover:bg-gray-750 transition-colors border border-gray-700"
            >
              <span className="text-4xl">🐛</span>
              <div>
                <h3 className="text-xl font-semibold text-white">Report Issues</h3>
                <p className="text-gray-400">Found a bug? Let us know!</p>
              </div>
            </a>
            <a
              href="https://github.com/AbelC27/HaufeHackaton/blob/main/README.md"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 p-4 bg-gray-800 rounded-lg hover:bg-gray-750 transition-colors border border-gray-700"
            >
              <span className="text-4xl">🚀</span>
              <div>
                <h3 className="text-xl font-semibold text-white">Quick Start Guide</h3>
                <p className="text-gray-400">Get up and running in 5 minutes</p>
              </div>
            </a>
            <a
              href="mailto:support@devcor.dev"
              className="flex items-center gap-4 p-4 bg-gray-800 rounded-lg hover:bg-gray-750 transition-colors border border-gray-700"
            >
              <span className="text-4xl">💬</span>
              <div>
                <h3 className="text-xl font-semibold text-white">Get Support</h3>
                <p className="text-gray-400">Contact our team for help</p>
              </div>
            </a>
          </div>
        </div>

        {/* Enterprise Section */}
        <div className="mt-16 bg-gradient-to-r from-green-900/30 to-blue-900/30 border border-green-700/50 rounded-xl p-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">🏢 Enterprise Edition</h2>
          <p className="text-xl text-gray-300 mb-6">
            For teams of 10+ developers, we offer:
          </p>
          <ul className="text-left max-w-2xl mx-auto mb-8 space-y-2">
            <li className="flex items-start gap-2 text-gray-300">
              <span className="text-green-400 mt-1">✓</span>
              <span>Dedicated support channel with SLA guarantees</span>
            </li>
            <li className="flex items-start gap-2 text-gray-300">
              <span className="text-green-400 mt-1">✓</span>
              <span>Custom AI model training on your codebase</span>
            </li>
            <li className="flex items-start gap-2 text-gray-300">
              <span className="text-green-400 mt-1">✓</span>
              <span>On-premise deployment assistance</span>
            </li>
            <li className="flex items-start gap-2 text-gray-300">
              <span className="text-green-400 mt-1">✓</span>
              <span>Priority feature requests and custom integrations</span>
            </li>
          </ul>
          <a
            href="mailto:enterprise@devcor.dev"
            className="inline-block px-8 py-4 bg-gradient-to-r from-green-600 to-blue-600 text-white text-lg font-semibold rounded-lg hover:from-green-700 hover:to-blue-700 transition-all shadow-lg"
          >
            Contact Enterprise Sales
          </a>
        </div>
      </div>
    </main>
  );
}
