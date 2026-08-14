import { NavLink } from 'react-router-dom';
import { Home, Compass, Layers, Save, History, Settings, Code2, Cpu, Microscope,  } from 'lucide-react';
export default function Sidebar() {
  const navItems = [
    { label: 'Dashboard', icon: Home, path: '/dashboard' },
    { label: 'Query Builder', icon: Cpu, path: '/builder' },
    { label: 'Research Mode', icon: Microscope, path: '/research-mode' },
    { label: 'Templates', icon: Layers, path: '/templates' },
    { label: 'Saved Queries', icon: Save, path: '/saved' },
    { label: 'Collections', icon: Compass, path: '/collections' },
    { label: 'History', icon: History, path: '/history' },
    { label: 'Operators', icon: Code2, path: '/operators' },
  ];
  return (
    <div className='w-64 bg-sidebar backdrop-blur-xl border-r border-white/5 border-r border-border flex flex-col h-full'>
      <div className='p-6'>
        <h1 className='text-xl font-bold text-primary flex items-center gap-2'>
          <Cpu className='w-6 h-6' /> QueryRecon
        </h1>
      </div>
      <nav className='flex-1 px-4 py-2 flex flex-col gap-1 overflow-y-auto'>
        {navItems.map((item) => (
          <NavLink key={item.path} to={item.path}
            className={({ isActive }) =>
              isActive ? 'flex items-center gap-3 px-3 py-2 rounded-md transition-colors bg-surface-elevated text-primary font-medium' : 'flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-secondary hover:text-foreground hover:bg-surface'
            }>
            <item.icon className='w-5 h-5' />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className='p-4 border-t border-border mt-auto'>
        <NavLink to='/settings'
          className={({ isActive }) =>
            isActive ? 'flex items-center gap-3 px-3 py-2 rounded-md transition-colors bg-surface-elevated text-primary font-medium' : 'flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-secondary hover:text-foreground hover:bg-surface'
          }>
          <Settings className='w-5 h-5' /> Settings
        </NavLink>
      </div>
    </div>
  );
}








