import { useState } from 'react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Search, ChevronRight, SlidersHorizontal } from 'lucide-react';
import { BuiltInTemplates } from '../core/templates';
import { useQueryStore } from '../store/queryStore';
import { useNavigate } from 'react-router-dom';

export default function Templates() {
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('All');
  const { setRootNode } = useQueryStore();
  const navigate = useNavigate();

  const categories = ['All', ...new Set(BuiltInTemplates.map(template => template.category))];
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredTemplates = BuiltInTemplates.filter(template => {
    const matchesCategory = category === 'All' || template.category === category;
    const matchesSearch = !normalizedSearch || [template.title, template.description, template.category, ...template.tags]
      .some(value => value.toLowerCase().includes(normalizedSearch));
    return matchesCategory && matchesSearch;
  });

  const applyTemplate = (template: typeof BuiltInTemplates[0]) => {
    setRootNode(structuredClone(template.queryAst));
    navigate('/builder');
  };

  return (
    <div className="p-8 h-full w-full bg-background flex flex-col">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">OSINT Templates</h1>
          <p className="text-muted-foreground mt-1">Pre-built search queries for common reconnaissance tasks.</p>
        </div>
      </div>

      <div className="mb-8 flex flex-col gap-4">
        <div className="relative max-w-xl">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-10 bg-surface border-border"
            placeholder="Search by purpose, category, or tag"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1" aria-label="Template categories">
          <SlidersHorizontal className="w-4 h-4 text-muted-foreground shrink-0" />
          {categories.map(item => (
            <Button key={item} size="sm" variant={category === item ? 'default' : 'outline'} onClick={() => setCategory(item)}>
              {item}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map(template => (
          <Card key={template.id} className="p-6 bg-surface border-border hover:border-primary/50 transition-colors flex flex-col gap-4">
            <div className="flex items-start justify-between">
              <div>
                <Badge variant="outline" className="mb-2 text-primary border-primary/20">{template.category}</Badge>
                <h3 className="font-semibold text-lg text-foreground">{template.title}</h3>
              </div>
            </div>

            <p className="text-sm text-muted-foreground flex-1">{template.description}</p>

            <div className="flex gap-2 flex-wrap">
              {template.tags.map(tag => (
                <span key={tag} className="text-xs bg-background px-2 py-1 rounded text-muted-foreground">#{tag}</span>
              ))}
            </div>

            <Button className="w-full mt-2" variant="outline" onClick={() => applyTemplate(template)}>
              Use Template <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </Card>
        ))}
      </div>
      {filteredTemplates.length === 0 && (
        <div className="border border-dashed border-border rounded-lg py-16 text-center">
          <p className="font-medium text-foreground">No matching templates</p>
          <p className="text-sm text-muted-foreground mt-1">Try a broader term or choose another category.</p>
        </div>
      )}
    </div>
  );
}
