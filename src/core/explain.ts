import type { QueryNode, Operator } from './query';
import { OperatorRegistry } from './query';

export function explainQuery(node: QueryNode): string[] {
  if (node.type === 'group') {
    if (!node.children || node.children.length === 0) return [];
    return node.children.flatMap(child => explainQuery(child));
  } else if (node.type === 'operator') {
    const val = node.value || '[empty]';
    const opDef = OperatorRegistry[node.operator as Operator];
    const opName = opDef ? opDef.name : node.operator;
    const prefix = node.negated ? 'Exclude results where' : 'Require that';
    return [`${prefix} ${opName} is "${val}"`];
  } else {
    const val = node.value || '[empty]';
    const prefix = node.negated ? 'Exclude results containing the phrase' : 'Search for the exact phrase';
    return [`${prefix} "${val}"`];
  }
}
