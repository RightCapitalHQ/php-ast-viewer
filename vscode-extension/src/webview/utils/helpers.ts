import { INode } from '@rightcapital/php-parser/dist/php-parser/types/node';
import _ from 'lodash';

export function searchNodeWithMatchedPosition(
  nodes: INode[],
  position: {
    position: number;
    lineNumber: number;
    column: number;
  }
): INode | undefined {
  let minNode: INode | undefined = undefined;
  let minRange = Number.MAX_SAFE_INTEGER;
  // Use BFS to traverse all nodes
  const queue: INode[] = [...nodes];

  while (queue.length > 0) {
    const node = queue.shift()!;
    const nodePosition = node.attributes;

    // Check if the node position contains the target position
    if (
      nodePosition.startLine <= position.lineNumber &&
      nodePosition.endLine >= position.lineNumber &&
      nodePosition.startFilePos <= position.position &&
      position.position <= nodePosition.endFilePos
    ) {
      // Calculate the size of the node range
      const rangeSize = nodePosition.endFilePos - nodePosition.startFilePos;

      // If the range is smaller than the current minimum range, update it
      if (rangeSize < minRange) {
        minRange = rangeSize;
        minNode = node;
      }
    }

    // Add all child nodes to the queue
    Object.entries(node).forEach(([name, value]) => {
      if (Array.isArray(value)) {
        value.forEach((item) => {
          if (isPhpParserASTNode(item)) {
            queue.push(item);
          }
        });
      } else if (isPhpParserASTNode(value)) {
        queue.push(value);
      }
    });
  }

  return minNode;
}

export function isSameNode(target: INode, current: INode) {
  if (!target || !current) return false;
  if (!target.attributes || !current.attributes) return false;

  // Use more specific comparison to avoid false matches
  const targetAttrs = target.attributes;
  const currentAttrs = current.attributes;

  // Compare position attributes first (most specific)
  const positionMatch = 
    targetAttrs.startFilePos === currentAttrs.startFilePos &&
    targetAttrs.endFilePos === currentAttrs.endFilePos &&
    targetAttrs.startLine === currentAttrs.startLine &&
    targetAttrs.endLine === currentAttrs.endLine;

  if (!positionMatch) return false;

  // Also compare node types as additional verification
  const targetType = (target as any).nodeType || (target as any).kind;
  const currentType = (current as any).nodeType || (current as any).kind;
  
  return targetType === currentType;
}

export function findNodeNameSpace(target: INode, current: any, namespace = ['root']): string[] | undefined {
  // First check if current node is the target
  if (isPhpParserASTNode(current) && isSameNode(target, current)) {
    console.log('Found target node at namespace:', namespace);
    return namespace;
  }

  // If current is not an object, we can't traverse deeper
  if (!current || typeof current !== 'object') {
    return undefined;
  }

  // Traverse all properties
  for (const [name, value] of Object.entries(current)) {
    if (isPhpParserASTNode(value)) {
      // Direct AST node property
      const result = findNodeNameSpace(target, value, [...namespace, name]);
      if (result) {
        return result;
      }
    } else if (Array.isArray(value)) {
      // Array of potential AST nodes
      for (let index = 0; index < value.length; index++) {
        const item = value[index];
        if (isPhpParserASTNode(item)) {
          const result = findNodeNameSpace(target, item, [...namespace, name, `${index}`]);
          if (result) {
            return result;
          }
        }
      }
    } else if (value && typeof value === 'object') {
      // Nested object that might contain AST nodes
      const result = findNodeNameSpace(target, value, [...namespace, name]);
      if (result) {
        return result;
      }
    }
  }
  
  return undefined;
}

export function isPhpParserASTNode(node: any): node is INode {
  return node && typeof node === 'object' && 'attributes' in node;
}

export function getNodeByNameSpace(root: any, namespace: (string | number)[]) {
  let data = root;

  while (namespace.length > 0) {
    data = data[namespace.shift()!];
  }

  return data;
}

export function prependCodeWithPhpStartTag(code: string) {
  if (!code.startsWith('<')) {
    return `<?php\n\n${code}`;
  } else {
    return code;
  }
}

export function formatNodeType(nodeType: string): string {
    // Convert camelCase to Title Case
    return nodeType
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase())
        .trim();
}

export function getNodeInfo(node: INode): { type: string; details: string } {
    const type = (node as any).nodeType || (node as any).kind || 'Unknown';
    let details = '';

    // Add specific details based on node type
    if ((node as any).name) {
        details = (node as any).name;
    } else if ((node as any).value !== undefined) {
        details = String((node as any).value);
    }

    return { type, details };
}