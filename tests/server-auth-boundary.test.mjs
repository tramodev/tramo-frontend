import { expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

test.each(['lib/auth.ts', 'lib/api.ts'])('%s stays server-only without exporting HTTP actions', path => {
  const file = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true);
  const directives = file.statements.filter(ts.isExpressionStatement).map(statement => statement.expression).filter(ts.isStringLiteral).map(expression => expression.text);
  const imports = file.statements.filter(ts.isImportDeclaration).map(statement => statement.moduleSpecifier.text);
  expect(directives).not.toContain('use server');
  expect(imports).toContain('server-only');
});
