import type { QueryNode } from '../query';

export function compileBingQuery(ast: QueryNode): string {
  if (ast.type === 'term') return `"${ast.value}"`;
  if (ast.type === 'operator') {
    // Bing uses specific operators
    const opMap: Record<string, string> = {
      site: 'site', ext: 'ext', filetype: 'filetype', intitle: 'intitle', inurl: 'instreamset:(url)'
    };
    const op = (ast.operator && opMap[ast.operator]) || ast.operator;
    return `${op}:${ast.value}`;
  }
  if (ast.type === 'group') {
    const children = ast.children || [];
    const joined = children.map(c => compileBingQuery(c)).join(` ${ast.booleanOp} `);
    return children.length > 1 ? `(${joined})` : joined;
  }
  return '';
}
