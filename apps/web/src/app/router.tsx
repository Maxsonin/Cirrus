import { createBrowserRouter, Navigate } from 'react-router';

import { ChatPage } from '@/features/chat/ChatPage';

import { RootLayout } from './RootLayout';

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { index: true, element: <ChatPage /> },
      { path: ':chatId', element: <ChatPage /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);
