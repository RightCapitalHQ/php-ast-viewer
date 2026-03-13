/**
 * Represents a PHP AST node in its JSON-serialized form.
 * This matches the output of the TypeScript php-parser's Node.toJSON().
 */
export interface INode {
  nodeType: string;
  attributes: {
    startLine: number;
    endLine: number;
    startTokenPos: number;
    endTokenPos: number;
    startFilePos: number;
    endFilePos: number;
    comments?: any[];
    [key: string]: any;
  };
  [key: string]: any;
}
