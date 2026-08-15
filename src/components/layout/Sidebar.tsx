import { NavLink } from 'react-router-dom';
import { Home, Compass, Layers, Save, History, Settings, Code2, Cpu, Microscope, Network } from 'lucide-react';

export default function Sidebar() {
  const navItems = [
    { label: 'Dashboard', icon: Home, path: '/dashboard' },
    { label: 'Query Builder', icon: Cpu, path: '/builder' },
    { label: 'Research Mode', icon: Microscope, path: '/research-mode' },
    { label: 'Investigation Board', icon: Network, path: '/board' },
    { label: 'Templates', icon: Layers, path: '/templates' },
    { label: 'Saved Queries', icon: Save, path: '/saved' },
    { label: 'Collections', icon: Compass, path: '/collections' },
    { label: 'History', icon: History, path: '/history' },
    { label: 'Operators', icon: Code2, path: '/operators' },
  ];

  const activeClass = 'flex items-center gap-3 px-3 py-2 rounded-md transition-all bg-primary/10 text-primary font-semibold border border-primary/20 shadow-[0_0_12px_rgba(0,200,255,0.12)]';
  const inactiveClass = 'flex items-center gap-3 px-3 py-2 rounded-md transition-all text-muted-foreground hover:text-foreground hover:bg-surface';

  return (
    <div className='w-64 bg-sidebar backdrop-blur-xl border-r border-border flex flex-col h-full'>
      <div className='p-6'>
        <h1 className='text-xl font-bold text-primary flex items-center gap-2'>
          <Cpu className='w-6 h-6' />
          <span>QueryRecon</span>
        </h1>
        <p className='text-xs text-muted-foreground mt-0.5'>OSINT Intelligence Platform</p>
      </div>
      <nav className='flex-1 px-3 py-2 flex flex-col gap-1 overflow-y-auto'>
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            title={item.label}
            className={({ isActive }) => isActive ? activeClass : inactiveClass}
          >
            <item.icon className='w-5 h-5 shrink-0' />
            <span className='truncate'>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className='p-3 border-t border-border'>
        <NavLink
          to='/settings'
          title='Settings'
          className={({ isActive }) => isActive ? activeClass : inactiveClass}
        >
          <Settings className='w-5 h-5 shrink-0' />
          <span>Settings</span>
        </NavLink>
      </div>
    </div>
  );
}



