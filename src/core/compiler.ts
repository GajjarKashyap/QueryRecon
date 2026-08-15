import type { QueryNode } from './query';

function compileNode(node: QueryNode, parentOp?: string): string {
  if (node.type === 'term') {
    let val = node.value || '';
    if (val.includes(' ') && !val.startsWith('"')) val = '"' + val + '"';
    return node.negated ? '-' + val : val;
  }

  if (node.type === 'operator' && node.operator) {
    let val = node.value || '';
    if (val.includes(' ') && !val.startsWith('"')) val = '"' + val + '"';
    const opStr = node.operator + ':' + val;
    return node.negated ? '-' + opStr : opStr;
  }

  if (node.type === 'group' && node.children) {
    const children = node.children
      .map(c => compileNode(c, node.booleanOp))
      .filter(Boolean);
    if (children.length === 0) return '';

    const separator = node.booleanOp === 'OR' ? ' OR ' : ' ';
    let result = children.join(separator);

    const needParens = 
      (node.negated && children.length > 1) ||
      (node.booleanOp === 'OR' && parentOp === 'AND') ||
      (node.booleanOp === 'AND' && parentOp === 'OR');

    if (needParens) result = '(' + result + ')';

    return node.negated ? '-' + result : result;
  }

  return '';
}

export function compileQuery(node: QueryNode): string {
  return compileNode(node);
}



