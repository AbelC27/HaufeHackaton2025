'use client';

import { useState } from 'react';

type GistLoaderProps = {
  isOpen: boolean;
  onClose: () => void;
  onLoad: (code: string, language: string) => void;
};

export default function GistLoader({ isOpen, onClose, onLoad }: GistLoaderProps) {
  const [gistUrl, setGistUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleLoad = async () => {
    setLoading(true);
    setError('');

    try {
      // Extract gist ID from URL
      const gistIdMatch = gistUrl.match(/gist\.github\.com\/(?:[\w-]+\/)?([a-f0-9]+)/);
      if (!gistIdMatch) {
        throw new Error('Invalid GitHub Gist URL');
      }

      const gistId = gistIdMatch[1];
      const response = await fetch(`https://api.github.com/gists/${gistId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch gist');
      }

      const data = await response.json();
      const files = Object.values(data.files) as any[];
      
      if (files.length === 0) {
        throw new Error('No files found in gist');
      }

      // Get the first file
      const file = files[0];
      const content = file.content;
      const filename = file.filename.toLowerCase();
      
      // Detect language from filename
      let language = 'python';
      if (filename.endsWith('.js')) language = 'javascript';
      else if (filename.endsWith('.ts')) language = 'typescript';
      else if (filename.endsWith('.java')) language = 'java';
      else if (filename.endsWith('.cs')) language = 'csharp';
      else if (filename.endsWith('.go')) language = 'go';
      else if (filename.endsWith('.rs')) language = 'rust';
      else if (filename.endsWith('.cpp') || filename.endsWith('.cc')) language = 'cpp';
      else if (filename.endsWith('.php')) language = 'php';
      else if (filename.endsWith('.rb')) language = 'ruby';

      onLoad(content, language);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to load gist');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-lg w-full p-6 border border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Load from GitHub Gist</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Gist URL
            </label>
            <input
              type="text"
              value={gistUrl}
              onChange={(e) => setGistUrl(e.target.value)}
              placeholder="https://gist.github.com/username/..."
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {error && (
            <div className="bg-red-900/50 text-red-200 border border-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              onClick={handleLoad}
              disabled={loading || !gistUrl}
              className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed"
            >
              {loading ? 'Loading...' : 'Load Gist'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
