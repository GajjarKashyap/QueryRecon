const fs = require('fs');
let code = fs.readFileSync('src/pages/ResearchMode.tsx', 'utf8');

code = code.replace(
                <div className="flex justify-between items-start">\n                <a href={item.url} target="_blank" rel="noreferrer" className="text-primary hover:underline font-medium text-lg">\n                  {item.title}\n                </a>\n                <Button size="sm" variant="outline" onClick={() => saveFinding({\n                  title: item.title,\n                  snippet: item.snippet || item.abstract || (item.authors ? 'Authors: ' + item.authors.join(', ') : ''),\n                  url: item.url,\n                  sourceType: activeTab,\n                  sourceName: SOURCES.find(s => s.id === activeTab)?.name || activeTab\n                })}>Save</Button>\n              </div>,
                <div className="flex justify-between items-start gap-4">\n                <a href={item.url} target="_blank" rel="noreferrer" className="text-primary hover:underline font-medium text-lg flex-1 break-words">\n                  {item.title}\n                </a>\n                <Button className="shrink-0" size="sm" variant="outline" onClick={() => saveFinding({\n                  title: item.title,\n                  snippet: item.snippet || item.abstract || (item.authors ? 'Authors: ' + item.authors.join(', ') : ''),\n                  url: item.url,\n                  sourceType: activeTab,\n                  sourceName: SOURCES.find(s => s.id === activeTab)?.name || activeTab\n                })}>Save</Button>\n              </div>
);

code = code.replace(
                {data.dorks.map((d: any, idx: number) => (\n                <Card key={idx} className="p-3">\n                  <a href={d.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">{d.label}</a>\n                </Card>\n              ))},
                {data.dorks.map((d: any, idx: number) => (\n                <Card key={idx} className="p-3">\n                  <div className="flex justify-between items-start gap-4">\n                    <a href={d.url} target="_blank" rel="noreferrer" className="text-primary hover:underline break-words flex-1">{d.label}</a>\n                    <Button className="shrink-0" size="sm" variant="outline" onClick={() => saveFinding({\n                      title: d.label,\n                      snippet: 'YouTube Dork',\n                      url: d.url,\n                      sourceType: 'youtube',\n                      sourceName: 'YouTube'\n                    })}>Save</Button>\n                  </div>\n                </Card>\n              ))}
);

code = code.replace(
            {data.map((item, idx) => (\n             <Card key={idx} className="p-3">\n               <a href={item.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">{item.label}</a>\n             </Card>\n          ))},
            {data.map((item: any, idx: number) => (\n             <Card key={idx} className="p-3">\n               <div className="flex justify-between items-start gap-4">\n                 <a href={item.url} target="_blank" rel="noreferrer" className="text-primary hover:underline break-words flex-1">{item.label}</a>\n                 <Button className="shrink-0" size="sm" variant="outline" onClick={() => saveFinding({\n                   title: item.label,\n                   snippet: 'Web / API Result',\n                   url: item.url !== '#' ? item.url : undefined,\n                   sourceType: activeTab,\n                   sourceName: SOURCES.find(s => s.id === activeTab)?.name || activeTab\n                 })}>Save</Button>\n               </div>\n             </Card>\n          ))}
);

code = code.replace(
      <div className="flex h-full w-full gap-4 p-4 overflow-hidden">\n      <div className="flex-1 flex flex-col gap-6 overflow-y-auto">,
      <div className="flex h-full w-full gap-4 p-4 overflow-hidden">\n      <div className="flex-1 flex flex-col gap-6 min-h-0">
);

code = code.replace(
              <Search className="mr-2 h-5 w-5" /> {isResearching ? 'Gathering Intelligence...' : 'Run Research'}\n          </Button>\n        </section>,
              <Search className="mr-2 h-5 w-5" /> {isResearching ? 'Gathering Intelligence...' : 'Run Research'}\n          </Button>\n        </section>\n\n        {Object.keys(results).length === 0 && (\n          <div className="flex-1 flex items-center justify-center text-muted-foreground pb-20">\n            Select sources and run research to see intelligence data here.\n          </div>\n        )}
);

fs.writeFileSync('src/pages/ResearchMode.tsx', code);
console.log('Fixed ResearchMode.tsx');
