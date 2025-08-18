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
  return _.isEqual(target.attributes, current.attributes);
}

export function findNodeNameSpace(target: INode, current: any, namespace = ['root']): string[] | undefined {
  if (isSameNode(target, current)) {
    return namespace;
  }

  for (const [name, value] of Object.entries(current)) {
    if (isPhpParserASTNode(value)) {
      const result = findNodeNameSpace(target, value, [...namespace, name]);
      if (result) {
        return result;
      }
    } else if (Array.isArray(value)) {
      for (let index = 0; index < value.length; index++) {
        const item = value[index];
        if (isPhpParserASTNode(item)) {
          const result = findNodeNameSpace(target, item, [...namespace, name, `${index}`]);
          if (result) {
            return result;
          }
        }
      }
    }
  }
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