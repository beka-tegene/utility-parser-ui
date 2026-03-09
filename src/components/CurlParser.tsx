'use client';

import { useState } from 'react';
import { parseCurl } from '@/lib/utils';
import { useAppStore } from '@/lib/store';
import { Terminal, Play, Copy, Check } from 'lucide-react';

export function CurlParser() {
  const [curlInput, setCurlInput] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const { parsedCurl, setParsedCurl } = useAppStore();

  const handleParse = () => {
    setError('');
    try {
      if (!curlInput.trim()) {
        setError('Please enter a cURL command');
        return;
      }
      const parsed = parseCurl(curlInput);
      if (!parsed.url) {
        setError('Could not extract URL from cURL command');
        return;
      }
      setParsedCurl({
        method: parsed.method,
        url: parsed.url,
        headers: parsed.headers,
        body: parsed.body,
        queryParams: {},
        contentType: parsed.contentType,
        isFormData: parsed.isFormData,
      });
    } catch (e) {
      setError('Failed to parse cURL command. Please check the format.');
    }
  };

  const handleCopyJson = () => {
    if (parsedCurl) {
      navigator.clipboard.writeText(JSON.stringify(parsedCurl, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
        <Terminal className="w-4 h-4" />
        <span>Paste cURL Command</span>
      </div>

      <div className="relative">
        <textarea
          value={curlInput}
          onChange={(e) => setCurlInput(e.target.value)}
          placeholder={`curl -X POST 'https://api.example.com/endpoint' \\
  -H 'Content-Type: application/json' \\
  -H 'Authorization: Bearer token' \\
  -d '{"field": "value"}'`}
          className="w-full h-40 p-4 font-mono text-sm bg-gray-900 text-green-400 rounded-lg border border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none"
        />
      </div>

      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg border border-red-200">
          {error}
        </div>
      )}

      <button
        onClick={handleParse}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        <Play className="w-4 h-4" />
        Parse cURL
      </button>

      {parsedCurl && (
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-700">Parsed Result</h3>
            <button
              onClick={handleCopyJson}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-green-600" />
                  <span className="text-green-600">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy JSON</span>
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-xs font-medium text-gray-500 mb-1">Method</div>
              <div className="font-mono text-sm font-semibold text-blue-600">
                {parsedCurl.method}
              </div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-xs font-medium text-gray-500 mb-1">URL</div>
              <div className="font-mono text-sm text-gray-800 truncate">
                {parsedCurl.url}
              </div>
            </div>
          </div>

          {Object.keys(parsedCurl.headers).length > 0 && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-xs font-medium text-gray-500 mb-2">Headers</div>
              <div className="space-y-1">
                {Object.entries(parsedCurl.headers).map(([key, value]) => (
                  <div key={key} className="flex gap-2 text-sm font-mono">
                    <span className="text-purple-600">{key}:</span>
                    <span className="text-gray-600 truncate">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {parsedCurl.body && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-xs font-medium text-gray-500 mb-2">Request Body</div>
              <pre className="text-sm font-mono text-gray-800 overflow-x-auto">
                {typeof parsedCurl.body === 'string'
                  ? parsedCurl.body
                  : JSON.stringify(parsedCurl.body, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
