import Settings from '../pages/Settings';
import ResearchMode from '../pages/ResearchMode';
import { ErrorBoundary } from '../components/ErrorBoundary';
import Templates from '../pages/Templates';
import Sessions from '../pages/Sessions';
import Builder from '../pages/Builder';
import SavedQueries from '../pages/SavedQueries';
import History from '../pages/History';
import Operators from '../pages/Operators';
import { createBrowserRouter, Navigate } from "react-router-dom"
import Dashboard from "../pages/Dashboard"
import App from "./App"

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    errorElement: <ErrorBoundary />,
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />
      },
      {
        path: "dashboard",
        element: <Dashboard />
      },
      { path: "sessions", element: <Sessions /> },
      { path: "builder", element: <Builder /> },
      { path: "research-mode", element: <ResearchMode /> },
      { path: "research/:id", element: <div className="p-8">Research Session (Coming Soon)</div> },
      { path: "templates", element: <Templates /> },
      { path: "saved", element: <SavedQueries /> },
      { path: "collections", element: <div className="p-8">Collections (Coming Soon)</div> },
      { path: "history", element: <History /> },
      { path: "operators", element: <Operators /> },
      { path: "settings", element: <Settings /> },
    ]
  }
])





