'use client';

import { useState } from 'react';

type DiffViewerProps = {
  isOpen: boolean;
  onClose: () => void;
  onCompare: (oldCode: string, newCode: string) => void;
};

export default function DiffViewer({ isOpen, onClose, onCompare }: DiffViewerProps) {
  const [oldCode, setOldCode] = useState('');
  const [newCode, setNewCode] = useState('');

  if (!isOpen) return null;

  const handleCompare = () => {
    if (oldCode.trim() && newCode.trim()) {
      onCompare(oldCode, newCode);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-6xl w-full p-6 border border-gray-700 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Compare Code Versions</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Original Code
            </label>
            <textarea
              value={oldCode}
              onChange={(e) => setOldCode(e.target.value)}
              className="w-full h-64 font-mono text-sm p-4 bg-gray-900 text-gray-100 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Paste your original code here..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Updated Code
            </label>
            <textarea
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
              className="w-full h-64 font-mono text-sm p-4 bg-gray-900 text-gray-100 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Paste your updated code here..."
            />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
          >
            Cancel
          </button>
          <button
            onClick={handleCompare}
            className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700"
          >
            Compare & Review
          </button>
        </div>
      </div>
    </div>
  );
}
