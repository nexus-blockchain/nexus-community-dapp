'use client';

import { useEffect } from 'react';

const isDev = process.env.NODE_ENV === 'development';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App Error:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
      <h1 className="text-xl font-bold text-destructive">出错了</h1>
      <p className="text-sm text-muted-foreground">
        {isDev
          ? error.message
          : '应用遇到意外错误，请稍后重试。'}
      </p>
      {isDev && (
        <pre className="max-w-full overflow-auto rounded bg-muted p-4 text-xs">
          {error.stack}
        </pre>
      )}
      {error.digest && (
        <p className="text-xs text-muted-foreground">Error ID: {error.digest}</p>
      )}
      <button
        onClick={reset}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        重试
      </button>
    </div>
  );
}
