export const sampleCode = `<?php declare(strict_types=1);

namespace PhpParser;

interface Builder {
    /**
     * Returns the built node.
     *
     * @return Node The built node
     */
    public function getNode(): Node;
}`;

export const fieldNames = [
  'attributes',
  'declares',
  'key',
  'value',
  'rawValue',
  'kind',
  'stmts',
  'type',
  'uses',
  'alias',
  'comments',
  'text',
  'line',
  'filePos',
  'tokenPos',
  'traits',
  'adaptations',
  'flags',
  'consts',
  'attrGroups',
  'items',
  'class',
  'byRef',
  'unpack',
  'params',
  'returnType',
  'expr',
  'cond',
  'left',
  'var',
  'right',
  'if',
  'args',
  'else',
  'parts',
  'elseifs',
  'variadic',
  'default',
  'static',
  'arms',
  'conds',
  'body',
  'extends',
  'implements',
];
