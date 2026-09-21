import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import App from './App.tsx';
import './index.css';

const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {clerkPublishableKey ? (
      <ClerkProvider publishableKey={clerkPublishableKey}>
        <App />
      </ClerkProvider>
    ) : (
      <div className="min-h-screen bg-[#f5efe1] text-stone-800 flex items-center justify-center p-6">
        <div className="bg-white p-6 rounded-2xl border border-amber-300 shadow-md max-w-md text-center font-mono-retro">
          <h2 className="text-lg font-bold mb-2 text-stone-900">Configuration Required</h2>
          <p className="text-xs text-stone-600 mb-2">
            Missing <code>VITE_CLERK_PUBLISHABLE_KEY</code>.
          </p>
        </div>
      </div>
    )}
  </StrictMode>
);
