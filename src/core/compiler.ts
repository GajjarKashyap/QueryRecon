import type { QueryNode } from './query';
export function compileQuery(node: QueryNode): string {
  if (node.type === 'term') {
    let val = node.value || '';
    if (val.includes(' ') && !val.startsWith('"')) { val = '"' + val + '"'; }
    return node.negated ? '-' + val : val;
  }
  if (node.type === 'operator' && node.operator) {
    let val = node.value || '';
    if (val.includes(' ') && !val.startsWith('"')) { val = '"' + val + '"'; }
    const opStr = node.operator + ':' + val;
    return node.negated ? '-' + opStr : opStr;
  }
  if (node.type === 'group' && node.children && node.children.length > 0) {
    const compiledChildren = node.children.map(compileQuery).filter(Boolean);
    if (compiledChildren.length === 0) return '';
    const separator = node.booleanOp === 'OR' ? ' OR ' : ' ';
    const groupStr = compiledChildren.join(separator);
    if (node.booleanOp === 'OR' && compiledChildren.length > 1) { return '(' + groupStr + ')'; }
    return groupStr;
  }
  return '';
}

