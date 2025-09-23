/**
 * @fileoverview Prevent using variables before they are defined
 * @author Your Name
 */

'use strict';

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent using variables before they are defined',
      recommended: true,
      url: 'https://eslint.org/docs/rules/no-use-before-define',
    },
    fixable: null,
    schema: [],
    messages: {
      usedBeforeDefined: "'{{name}}' was used before it was defined.",
      usedBeforeDefinedInTDZ: "'{{name}}' was used before it was defined, which is not allowed in the temporal dead zone.",
    },
  },

  create(context) {
    // Track variable declarations and their scope
    const functionStack = [];
    const blockScopedVars = [];
    let currentScope = null;

    //----------------------------------------------------------------------
    // Helpers
    //----------------------------------------------------------------------

    /**
     * Check if a variable is being used before it's defined
     * @param {ASTNode} node The identifier node
     * @returns {void}
     */
    function checkForUseBeforeDefinition(node) {
      const name = node.name;
      const scope = context.getScope();
      const variable = scope.set.get(name);

      if (!variable) {
        return; // Not defined in this scope
      }

      const isInTDZ = variable.defs.some(
        (def) =>
          def.type === 'Variable' &&
          def.parent &&
          def.parent.type === 'VariableDeclarator' &&
          def.parent.parent &&
          (def.parent.parent.kind === 'let' || def.parent.parent.kind === 'const')
      );

      if (isInTDZ && variable.references.some((ref) => ref.identifier.range[0] < node.range[0])) {
        context.report({
          node,
          messageId: 'usedBeforeDefinedInTDZ',
          data: { name },
        });
      } else if (
        !isInTDZ &&
        variable.references.some(
          (ref) => ref.identifier.range[0] < node.range[0] && ref.resolved === variable
        )
      ) {
        context.report({
          node,
          messageId: 'usedBeforeDefined',
          data: { name },
        });
      }
    }

    //----------------------------------------------------------------------
    // Public
    //----------------------------------------------------------------------

    return {
      // Track function scopes
      'FunctionDeclaration:exit': function (node) {
        functionStack.pop();
      },
      'FunctionExpression:exit': function (node) {
        functionStack.pop();
      },
      'ArrowFunctionExpression:exit': function (node) {
        functionStack.pop();
      },
      'FunctionDeclaration': function (node) {
        functionStack.push(node);
      },
      'FunctionExpression': function (node) {
        functionStack.push(node);
      },
      'ArrowFunctionExpression': function (node) {
        functionStack.push(node);
      },

      // Track block scopes
      'BlockStatement': function (node) {
        blockScopedVars.push(new Set());
      },
      'BlockStatement:exit': function (node) {
        blockScopedVars.pop();
      },

      // Check variable declarations
      'VariableDeclarator': function (node) {
        if (node.init) {
          if (node.init.type === 'Identifier') {
            checkForUseBeforeDefinition(node.init);
          }
        }
      },

      // Check all identifier references
      'Identifier': function (node) {
        if (node.parent && 
            (node.parent.type !== 'VariableDeclarator' || node !== node.parent.id) &&
            node.parent.type !== 'Property' &&
            node.parent.type !== 'MethodDefinition' &&
            node.parent.type !== 'ClassProperty' &&
            node.parent.type !== 'PropertyDefinition' &&
            node.parent.type !== 'MemberExpression' &&
            node.parent.type !== 'ObjectPattern' &&
            node.parent.type !== 'ArrayPattern') {
          checkForUseBeforeDefinition(node);
        }
      },

      // Check class method definitions
      'MethodDefinition': function (node) {
        if (node.value && node.value.type === 'FunctionExpression') {
          functionStack.push(node);
        }
      },
      'MethodDefinition:exit': function (node) {
        if (node.value && node.value.type === 'FunctionExpression') {
          functionStack.pop();
        }
      },
    };
  },
};
