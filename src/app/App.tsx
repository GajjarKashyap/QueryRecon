import { Outlet } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import { TargetBar } from '../components/layout/TargetBar';
import { Toaster } from '../components/ui/toast';
import { LocalAssistant } from '../components/assistant/LocalAssistant';

export default function App() {
  return (
    <div className='flex h-screen bg-background text-foreground overflow-hidden'>
      <Sidebar />
      <main className='flex-1 flex flex-col overflow-hidden'>
        <TargetBar />
        <div className='flex-1 overflow-y-auto'>
          <Outlet />
        </div>
      </main>
      <LocalAssistant />
      <Toaster />
    </div>
  )
}

