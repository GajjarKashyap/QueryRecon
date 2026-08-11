import type { QueryNode } from '../query';

export function compileYouTubeQuery(ast: QueryNode): string {
  if (ast.type === 'term') return `"${ast.value}"`;
  if (ast.type === 'operator') {
    if (ast.operator === 'intitle') return `intitle:"${ast.value}"`;
    return `"${ast.value}"`; // Fallback
  }
  if (ast.type === 'group') {
    const children = ast.children || [];
    return children.map(c => compileYouTubeQuery(c)).join(ast.booleanOp === 'OR' ? ' | ' : ' ');
  }
  return '';
}
