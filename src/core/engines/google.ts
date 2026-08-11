import type { QueryNode } from '../query';

export function compileGoogleQuery(ast: QueryNode): string {
  if (ast.type === 'term') return `"${ast.value}"`;
  if (ast.type === 'operator') return `${ast.operator}:${ast.value}`;
  if (ast.type === 'group') {
    const children = ast.children || [];
    const joined = children.map(c => compileGoogleQuery(c)).join(` ${ast.booleanOp} `);
    return children.length > 1 ? `(${joined})` : joined;
  }
  return '';
}
