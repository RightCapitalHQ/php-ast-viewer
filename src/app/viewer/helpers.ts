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
  const stack = nodes.map((node, index) => ({
    value: node,
    visited: false,
  }));

  while (stack.length > 0) {
    const data = stack.at(-1)!;

    const nodePosition = data.value.attributes;

    if (position.position > nodePosition.endFilePos || nodePosition.startFilePos > position.position) {
      stack.pop();
      continue;
    }

    if (data.visited) {
      if (
        nodePosition.startLine === position.lineNumber &&
        nodePosition.startFilePos <= position.position &&
        position.position <= nodePosition.endFilePos - 1
      ) {
        return data.value;
      }

      stack.pop();

      continue;
    }

    data.visited = true;

    let hasChildren = false;
    Object.entries(data.value).forEach(([name, value]) => {
      if (Array.isArray(value)) {
        value.forEach((item, index) => {
          if (isPhpParserASTNode(item)) {
            hasChildren = true;
            stack.push({
              value: item,
              visited: false,
            });
          }
        });
      } else if (isPhpParserASTNode(value)) {
        hasChildren = true;
        stack.push({
          value,
          visited: false,
        });
      }
    });

    if (!hasChildren) {
      if (
        nodePosition.startLine === position.lineNumber &&
        nodePosition.startFilePos <= position.position &&
        position.position <= nodePosition.endFilePos - 1
      ) {
        return data.value;
      }

      stack.pop();
    }
  }

  return undefined;
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
