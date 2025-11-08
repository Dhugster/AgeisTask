import { FiAlertCircle, FiRefreshCw, FiTerminal } from 'react-icons/fi';
import { useState } from 'react';

export default function BackendError({ onRetry }) {
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = async () => {
    setIsRetrying(true);
    if (onRetry) {
      await onRetry();
    }
    // Reload page after a moment
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  const isDesktop = window.__TAURI__ !== undefined;

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full card">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <FiAlertCircle className="w-16 h-16 text-red-500" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Backend Server Not Available
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
            Unable to connect to the backend server at <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">localhost:3001</code>
          </p>
        </div>

        <div className="space-y-6">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
              How to Fix:
            </h3>
            <ol className="list-decimal list-inside space-y-2 text-yellow-700 dark:text-yellow-300">
              {isDesktop ? (
                <>
                  <li>The desktop app should start the backend automatically</li>
                  <li>If it didn't, check the console for error messages</li>
                  <li>You can also start the backend manually:</li>
                </>
              ) : (
                <>
                  <li>Make sure the backend server is running</li>
                  <li>Start it with: <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">cd backend && npm start</code></li>
                </>
              )}
            </ol>
          </div>

          {isDesktop && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2 flex items-center">
                <FiTerminal className="w-5 h-5 mr-2" />
                Manual Backend Start
              </h3>
              <p className="text-blue-700 dark:text-blue-300 mb-2">
                If the backend didn't start automatically, open a terminal and run:
              </p>
              <code className="block bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded mt-2 text-sm">
                cd backend<br />
                npm start
              </code>
            </div>
          )}

          <div className="flex justify-center space-x-4">
            <button
              onClick={handleRetry}
              disabled={isRetrying}
              className="btn btn-primary flex items-center space-x-2"
            >
              <FiRefreshCw className={`w-5 h-5 ${isRetrying ? 'animate-spin' : ''}`} />
              <span>{isRetrying ? 'Retrying...' : 'Retry Connection'}</span>
            </button>
          </div>

          <div className="text-center text-sm text-gray-500 dark:text-gray-400">
            <p>Make sure the backend is running on port 3001</p>
            <p className="mt-1">Check: <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">http://localhost:3001/health</code></p>
          </div>
        </div>
      </div>
    </div>
  );
}

