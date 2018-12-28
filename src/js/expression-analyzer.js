'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
var Expression_Types_1 = require('./Expression-Types');
exports.isBinaryExpression = Expression_Types_1.isBinaryExpression;
exports.isConditionalExpression = Expression_Types_1.isConditionalExpression;
exports.isIdentifier = Expression_Types_1.isIdentifier;
exports.isLiteral = Expression_Types_1.isLiteral;
exports.isMemberExpression = Expression_Types_1.isMemberExpression;
exports.isUnaryExpression = Expression_Types_1.isUnaryExpression;
exports.isUpdateExpression = Expression_Types_1.isUpdateExpression;
exports.isProgram = Expression_Types_1.isProgram;
var code_substitutor_1 = require('./code-substitutor');
var EMPTY = '';
/*const expressionToAnalyzedLines = (exp: Expression): AnalyzedLine[] =>
    //isExpressionStatement(exp) ? expressionStatementToAnalyzedLines(exp) :
    isFunctionDeclaration(exp) ? functionDeclarationToAnalyzedLines(exp) :
    isVariableDeclaration(exp) ? variableDeclarationToAnalyzedLines(exp) :
    isValueExpression(exp) ? valueExpressionToAnalyzedLines(exp) :
    isAssignmentExpression(exp) ? assignmentExpressionToAnalyzedLines(exp) :
    isReturnStatement(exp) ? returnStatementToAnalyzedLines(exp) :
    isWhileStatement(exp) ? whileStatementToAnalyzedLines(exp) :
    isDoWhileStatement(exp) ? doWhileStatementToAnalyzedLines(exp) :
    isForStatement(exp) ? forStatementToAnalyzedLines(exp) :
    isBreakStatement(exp) ? breakStatementToAnalyzedLines(exp) :
    isIfStatement(exp) ? ifStatementToAnalyzedLines(exp) :
    conditionalExpressionToAnalyzedLines(exp);*/
/*const expressionStatementToAnalyzedLines = (expStatement: ExpressionStatement): AnalyzedLine[] =>
    expressionToAnalyzedLines(expStatement.expression);*/
var functionDeclarationToAnalyzedLines = function (func) {
    return [{ line: func.loc.start.line, type: func.type, name: func.id.name, condition: EMPTY, value: EMPTY }];
};
var getDeclarationsOfParams = function (func) {
    return func.params.map(function (id) { return variableDeclaratorToAnalyzedLine(makeDeclaratorOfIdentifier(id), []); });
};
var variableDeclarationToAnalyzedLines = function (varDec, varTable) {
    return varDec.declarations.map(function (varDeclarator) { return variableDeclaratorToAnalyzedLine(varDeclarator, varTable); });
};
var variableDeclaratorToAnalyzedLine = function (varDec, varTable) {
    return ({ line: varDec.loc.start.line, type: varDec.type, name: varDec.id.name, condition: EMPTY, value: getValOfInit(varDec.init, varTable) });
};
var getValOfInit = function (init, varTable) {
    return Expression_Types_1.isValueExpression(init) ? exports.getValOfValExp(init, varTable) :
        'null';
};
exports.getValOfValExp = function (v, varTable) {
    return Expression_Types_1.isLiteral(v) ? getValOfLiteral(v, varTable) :
        Expression_Types_1.isIdentifier(v) ? getValOfIdentifier(v, varTable) :
            Expression_Types_1.isComputationExpression(v) ? getValOfComputationExpression(v, varTable) :
                Expression_Types_1.isConditionalExpression(v) ? getValOfConditionalExpression(v, varTable) :
                    getValOfMemberExpression(v, varTable);
};
var getValOfIdentifier = function (id, varTable) {
    return (varTable.length == 0 || code_substitutor_1.isVarParam(id, varTable) ? id.name : exports.getValOfValExp(code_substitutor_1.getValueExpressionOfIdentifier(id, varTable), varTable));
};
var getValOfLiteral = function (literal, varTable) {
    return Expression_Types_1.isAtomicLiteral(literal) ? literal.raw :
        arrayToString(literal, varTable);
};
var concatArrayStrings = function (prev, curr) { return prev + ', ' + curr; };
var arrayToString = function (arr, varTable) {
    return arr.elements.length == 0 ? '[]' :
        '[' + arr.elements.map(function (v) { return exports.getValOfValExp(v, varTable); }).reduce(concatArrayStrings) + ']';
};
var getValOfComputationExpression = function (c, varTable) {
    return Expression_Types_1.isBinaryExpression(c) ? '(' + exports.getValOfValExp(c.left, varTable) + ' ' + c.operator + ' ' + exports.getValOfValExp(c.right, varTable) + ')' :
        Expression_Types_1.isLogicalExpression(c) ? '(' + exports.getValOfValExp(c.left, varTable) + ' ' + c.operator + ' ' + exports.getValOfValExp(c.right, varTable) + ')' :
            Expression_Types_1.isUnaryExpression(c) ? c.operator + exports.getValOfValExp(c.argument, varTable) : // If there were non-prefix unary expressions: (v.prefix ? v.operator + getValOfValExp(v.argument) : getValOfValExp(v.argument) + v.operator) :
                (c.prefix ? c.operator + exports.getValOfValExp(c.argument, varTable) : exports.getValOfValExp(c.argument, varTable) + c.operator);
};
var getValOfConditionalExpression = function (cond, varTable) {
    return '(' + exports.getValOfValExp(cond.test, varTable) + ' ? ' + exports.getValOfValExp(cond.consequent, varTable) + ' : ' + exports.getValOfValExp(cond.alternate, varTable) + ')';
};
var getValOfMemberExpression = function (m, varTable) {
    return m.computed ? exports.getValOfValExp(m.object, varTable) + '[' + exports.getValOfValExp(m.property, varTable) + ']' :
        exports.getValOfValExp(m.object, varTable) + '.' + exports.getValOfValExp(m.property, varTable);
};
var valueExpressionToAnalyzedLines = function (val, varTable) {
    return Expression_Types_1.isLiteral(val) ? literalExpressionToAnalyzedLines(val, varTable) :
        Expression_Types_1.isIdentifier(val) ? identifierToAnalyzedLines(val) :
            Expression_Types_1.isComputationExpression(val) ? computationExpressionToAnalyzedLines(val, varTable) :
                Expression_Types_1.isConditionalExpression(val) ? conditionalExpressionToAnalyzedLines(val, varTable) :
                    memberExpressionToAnalyzedLines(val, varTable);
};
var computationExpressionToAnalyzedLines = function (comp, varTable) {
    return Expression_Types_1.isUpdateExpression(comp) ? updateExpressionToAnalyzedLines(comp, varTable) :
        Expression_Types_1.isLogicalExpression(comp) ? logicalExpressionToAnalyzedLines(comp, varTable) :
            Expression_Types_1.isBinaryExpression(comp) ? binaryExpressionToAnalyzedLines(comp, varTable) :
                unaryExpressionToAnalyzedLines(comp, varTable);
};
var literalExpressionToAnalyzedLines = function (l, varTable) {
    return [{ line: l.loc.start.line, type: l.type, name: EMPTY, condition: EMPTY, value: getValOfLiteral(l, varTable) }];
};
var identifierToAnalyzedLines = function (i) {
    return [{ line: i.loc.start.line, type: i.type, name: i.name, condition: EMPTY, value: EMPTY }];
};
var binaryExpressionToAnalyzedLines = function (b, varTable) {
    return [{ line: b.loc.start.line, type: b.type, name: EMPTY, condition: EMPTY, value: exports.getValOfValExp(b, varTable) }];
};
var logicalExpressionToAnalyzedLines = function (l, varTable) {
    return [{ line: l.loc.start.line, type: l.type, name: EMPTY, condition: EMPTY, value: exports.getValOfValExp(l, varTable) }];
};
var unaryExpressionToAnalyzedLines = function (u, varTable) {
    return [{ line: u.loc.start.line, type: u.type, name: EMPTY, condition: EMPTY, value: exports.getValOfValExp(u, varTable) }];
};
var updateExpressionToAnalyzedLines = function (u, varTable) {
    return [{ line: u.loc.start.line, type: u.type, name: getNameOfAssignable(u.argument, varTable), condition: EMPTY, value: exports.getValOfValExp(u, varTable) }];
};
var assignmentExpressionToAnalyzedLines = function (assignmentExpression, varTable) {
    return [{ line: assignmentExpression.loc.start.line, type: assignmentExpression.type, name: getNameOfAssignable(assignmentExpression.left, varTable), condition: EMPTY, value: getValOfAssignmentExpression(assignmentExpression, varTable) }];
};
var getNameOfAssignable = function (a, varTable) {
    return Expression_Types_1.isMemberExpression(a) ? exports.getValOfValExp(a, varTable) : a.name;
};
var getValOfAssignmentExpression = function (a, varTable) {
    return (a.operator.length > 1 ? exports.getValOfValExp(a.left, varTable) + ' ' + a.operator[0] + ' ' : '') + exports.getValOfValExp(a.right, varTable);
};
var returnStatementToAnalyzedLines = function (ret, varTable) {
    return [{ line: ret.loc.start.line, type: ret.type, name: EMPTY, condition: EMPTY, value: exports.getValOfValExp(ret.argument, varTable) }];
};
var whileStatementToAnalyzedLines = function (whileStatement, varTable) {
    return [{ line: whileStatement.loc.start.line, type: whileStatement.type, name: EMPTY, condition: exports.getValOfValExp(whileStatement.test, varTable), value: EMPTY }];
};
var forStatementToAnalyzedLines = function (forStatement, varTable) {
    return forConditionToAnalyzedLines(forStatement, varTable);
};
var forConditionToAnalyzedLines = function (forStatement, varTable) {
    return [{ line: forStatement.loc.start.line, type: forStatement.type, name: EMPTY, condition: exports.getValOfValExp(forStatement.test, varTable), value: EMPTY }];
};
var forInitToAnalyzedLines = function (forStatement, varTable) {
    return Expression_Types_1.isVariableDeclaration(forStatement.init) ? variableDeclarationToAnalyzedLines(forStatement.init, varTable) :
        assignmentExpressionToAnalyzedLines(forStatement.init, varTable);
};
var forUpdateToAnalyzedLines = function (forStatement, varTable) {
    return Expression_Types_1.isAssignmentExpression(forStatement.update) ? assignmentExpressionToAnalyzedLines(forStatement.update, varTable) :
        updateExpressionToAnalyzedLines(forStatement.update, varTable);
};
var breakStatementToAnalyzedLines = function (breakStatement) {
    return [{ line: breakStatement.loc.start.line, type: breakStatement.type, name: EMPTY, condition: EMPTY, value: EMPTY }];
};
var ifStatementToAnalyzedLines = function (ifStatement, varTable) {
    return [{ line: ifStatement.loc.start.line, type: ifStatement.type, name: EMPTY, condition: exports.getValOfValExp(ifStatement.test, varTable), value: EMPTY }];
};
var elseToAnalyzedLines = function (alt) {
    return [{ line: alt.loc.start.line, type: 'Else', name: EMPTY, condition: EMPTY, value: EMPTY }];
};
var conditionalExpressionToAnalyzedLines = function (conditionalExpression, varTable) {
    return [{ line: conditionalExpression.loc.start.line, type: conditionalExpression.type, name: EMPTY, condition: exports.getValOfValExp(conditionalExpression.test, varTable), value: EMPTY }];
};
var memberExpressionToAnalyzedLines = function (memberExpression, varTable) {
    return [{ line: memberExpression.loc.start.line, type: memberExpression.type, name: getNameOfAssignable(memberExpression, varTable), condition: EMPTY, value: EMPTY }];
};
var doWhileStatementToAnalyzedLines = function (doWhileStatement, varTable) {
    return [{ line: doWhileStatement.loc.start.line, type: doWhileStatement.type, name: EMPTY, condition: exports.getValOfValExp(doWhileStatement.test, varTable), value: EMPTY }];
};
var concatAnalyzedLines = function (prev, curr) { return prev.concat(curr); };
var programToAnalyzedLines = function (program) {
    return program.body.length > 0 ? program.body.map(function (exp) { return exports.getAllAnalyzedLines(exp, []); }).reduce(concatAnalyzedLines) : [];
};
exports.programToAnalyzedLines = programToAnalyzedLines;
exports.getAllAnalyzedLines = function (exp, varTable) {
    return Expression_Types_1.isAtomicExpression(exp) ? getAnalyzedLinesFromAtomicExpression(exp, varTable) :
        getAnalyzedLinesFromCompoundExpression(exp, varTable);
};
exports.getFirstAnalyzedLine = function (exp, varTable) {
    return Expression_Types_1.isAtomicExpression(exp) ? getAnalyzedLinesFromAtomicExpression(exp, varTable)[0] :
        getFirstAnalyzedLineFromCompoundExpression(exp, varTable);
};
var getFirstAnalyzedLineFromCompoundExpression = function (comp, varTable) {
    return Expression_Types_1.isExpressionStatement(comp) ? exports.getFirstAnalyzedLine(comp.expression, varTable) :
        Expression_Types_1.isValueExpression(comp) ? valueExpressionToAnalyzedLines(comp, varTable)[0] :
            Expression_Types_1.isFunctionDeclaration(comp) ? functionDeclarationToAnalyzedLines(comp)[0] :
                Expression_Types_1.isLoopStatement(comp) ? getFirstAnalyzedLineFromLoop(comp, varTable) :
                    ifStatementToAnalyzedLines(comp, varTable)[0];
};
var getFirstAnalyzedLineFromLoop = function (loop, varTable) {
    return Expression_Types_1.isWhileStatement(loop) ? whileStatementToAnalyzedLines(loop, varTable)[0] :
        Expression_Types_1.isDoWhileStatement(loop) ? doWhileStatementToAnalyzedLines(loop, varTable)[0] :
            forStatementToAnalyzedLines(loop, varTable)[0];
};
var getAnalyzedLinesFromAtomicExpression = function (a, varTable) {
    return Expression_Types_1.isVariableDeclaration(a) ? variableDeclarationToAnalyzedLines(a, varTable) :
        Expression_Types_1.isAssignmentExpression(a) ? assignmentExpressionToAnalyzedLines(a, varTable) :
            Expression_Types_1.isReturnStatement(a) ? returnStatementToAnalyzedLines(a, varTable) :
                breakStatementToAnalyzedLines(a);
};
var getAnalyzedLinesFromCompoundExpression = function (comp, varTable) {
    return Expression_Types_1.isExpressionStatement(comp) ? exports.getAllAnalyzedLines(comp.expression, varTable) :
        Expression_Types_1.isFunctionDeclaration(comp) ? getAnalyzedLinesFromFunctionDeclaration(comp, varTable) :
            Expression_Types_1.isValueExpression(comp) ? valueExpressionToAnalyzedLines(comp, varTable) :
                Expression_Types_1.isLoopStatement(comp) ? getAnalyzedLinesFromLoopStatement(comp, varTable) :
                    getAnalyzedLinesFromIfStatement(comp, varTable);
};
var getAnalyzedLinesFromLoopStatement = function (loop, varTable) {
    return Expression_Types_1.isWhileStatement(loop) ? getAnalyzedLinesFromWhileStatement(loop, varTable) :
        Expression_Types_1.isDoWhileStatement(loop) ? getAnalyzedLinesFromDoWhileStatement(loop, varTable) :
            getAnalyzedLinesFromForStatement(loop, varTable);
};
var getAnalyzedLinesFromBody = function (b, varTable) {
    return Expression_Types_1.isBlockStatement(b) ? b.body.map(function (exp) { return exports.getAllAnalyzedLines(exp, varTable); }).reduce(concatAnalyzedLines) :
        exports.getAllAnalyzedLines(b, varTable);
};
var getAnalyzedLinesFromFunctionDeclaration = function (func, varTable) {
    return functionDeclarationToAnalyzedLines(func).concat(getDeclarationsOfParams(func)).concat(getAnalyzedLinesFromBody(func.body, varTable));
};
var makeDeclaratorOfIdentifier = function (id) {
    return ({ type: 'VariableDeclarator', id: id, init: null, loc: id.loc });
};
var getAnalyzedLinesFromWhileStatement = function (whileStatement, varTable) {
    return whileStatementToAnalyzedLines(whileStatement, varTable).concat(getAnalyzedLinesFromBody(whileStatement.body, varTable));
};
var getAnalyzedLinesFromDoWhileStatement = function (doWhileStatement, varTable) {
    return doWhileStatementToAnalyzedLines(doWhileStatement, varTable).concat(getAnalyzedLinesFromBody(doWhileStatement.body, varTable));
};
var getAnalyzedLinesFromForStatement = function (forStatement, varTable) {
    return forStatementToAnalyzedLines(forStatement, varTable).concat(forInitToAnalyzedLines(forStatement, varTable)).concat(forUpdateToAnalyzedLines(forStatement, varTable)).concat(getAnalyzedLinesFromBody(forStatement.body, varTable));
};
var getAnalyzedLinesFromIfStatement = function (ifStatement, varTable) {
    return ifStatementToAnalyzedLines(ifStatement, varTable).concat(getAnalyzedLinesFromBody(ifStatement.consequent, varTable)).concat(getAnalyzedLinesFromAlternate(ifStatement.alternate, varTable));
};
var getAnalyzedLinesFromAlternate = function (altBody, varTable) {
    return Expression_Types_1.isBody(altBody) ? elseToAnalyzedLines(altBody).concat(getAnalyzedLinesFromBody(altBody, varTable)) : [];
};
