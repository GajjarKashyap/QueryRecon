import { useTargetStore } from '../../store/targetStore';
import { Input } from '../ui/input';
import { Globe, Building2, Mail, Network, X } from 'lucide-react';
import { Button } from '../ui/button';

export function TargetBar() {
  const { domain, companyName, email, ip, setTarget, clearTarget } = useTargetStore();

  const hasTarget = domain || companyName || email || ip;

  return (
    <div className="flex items-center gap-4 p-2 bg-surface-elevated border-b border-border text-sm">
      <div className="flex items-center gap-2">
        <Globe className="w-4 h-4 text-muted-foreground" />
        <Input 
          value={domain} 
          onChange={e => setTarget({ domain: e.target.value })}
          placeholder="Target Domain (example.com)"
          className="h-8 w-48 text-xs bg-surface"
        />
      </div>
      
      <div className="flex items-center gap-2">
        <Building2 className="w-4 h-4 text-muted-foreground" />
        <Input 
          value={companyName} 
          onChange={e => setTarget({ companyName: e.target.value })}
          placeholder="Company Name"
          className="h-8 w-40 text-xs bg-surface"
        />
      </div>

      <div className="flex items-center gap-2">
        <Mail className="w-4 h-4 text-muted-foreground" />
        <Input 
          value={email} 
          onChange={e => setTarget({ email: e.target.value })}
          placeholder="Target Email"
          className="h-8 w-40 text-xs bg-surface"
        />
      </div>

      <div className="flex items-center gap-2">
        <Network className="w-4 h-4 text-muted-foreground" />
        <Input 
          value={ip} 
          onChange={e => setTarget({ ip: e.target.value })}
          placeholder="IP Address"
          className="h-8 w-32 text-xs bg-surface"
        />
      </div>

      <div className="flex-1" />

      {hasTarget && (
        <Button variant="ghost" size="sm" onClick={clearTarget} className="h-8 text-danger hover:bg-danger/10">
          <X className="w-3 h-3 mr-1" /> Clear Target
        </Button>
      )}
    </div>
  );
}
