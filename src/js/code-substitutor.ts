import {
    isBinaryExpression,
    isComputationExpression,
    isIdentifier,
    isLiteral,
    isUnaryExpression,
    isConditionalExpression,
    ValueExpression,
    ComputationExpression,
    ConditionalExpression,
    MemberExpression,
    BinaryExpression,
    UnaryExpression,
    UpdateExpression,
    Assignable,
    Identifier,
    Program,
    Expression,
    isValueExpression,
    isAssignmentExpression,
    isVariableDeclaration,
    isIfStatement,
    isAtomicExpression,
    AtomicExpression,
    isReturnStatement,
    CompoundExpression,
    isExpressionStatement,
    LoopStatement,
    isWhileStatement,
    isDoWhileStatement,
    VariableDeclaration,
    createAtomicLiteralExpression,
    AssignmentExpression,
    ReturnStatement,
    BreakStatement,
    isUpdateExpression,
    IfStatement,
    Body,
    isExpression,
    isFunctionDeclaration,
    FunctionDeclaration,
    WhileStatement,
    DoWhileStatement,
    ForStatement,
    createBinaryExpression,
    createUnaryExpression,
    createConditionalExpression,
    createMemberExpression,
    isBody,
    Literal,
    isAtomicLiteral,
    ArrayExpression,
    ArrayObject,
    isArrayExpression,
    createArrayExpression,
    isLogicalExpression,
    LogicalExpression,
    createLogicalExpression,
    isBlockStatement, createAssignmentExpression, isMemberExpression, getBlankLocation, ExpressionStatement
} from "./Expression-Types";
import {AnalyzedLine, getFirstAnalyzedLine, getValOfValExp} from "./expression-analyzer";
import {parseCode} from "./code-analyzer";

type Value = number | string | boolean | ValueArray;
interface ValueArray extends Array<Value> {};

const isNumber = (x: Value): x is number => (typeof x) === "number";
const isString = (x: Value): x is string => (typeof x) === "string";
const isBoolean = (x: Value) : x is boolean => (typeof x) === "boolean";

export interface VarTuple {
    name: string;
    value: ValueExpression;
    isParam : boolean;
}

export const isVarParam = (id: Identifier, varTable: VarTuple[], substitute: Boolean): boolean =>
    //varTable.length == 0 ? false :
    varTable[0].name == id.name ? varTable[0].isParam :
    isVarParam(id, varTable.slice(1), substitute);
    /*substitute ? (
        varTable[0].name == id.name ? varTable[0].isParam :
            isVarParam(id, varTable.slice(1), substitute)) :
        true;*/

const paramToValueTuple = (param: string): VarTuple =>
    ({name: param.trim().split('=')[0].trim(), value: parseCode(param.trim().split('=')[1].trim()).body[0].expression, isParam: true});

const parseParams = (paramsTxt: string): VarTuple[] =>
    paramsTxt.length > 0 ? paramsTxt.split(';').map(paramToValueTuple) : [];

const valueExpressionToValue = (v: ValueExpression, varTable: VarTuple[]): Value =>
    isLiteral(v) ? getValueOfLiteral(v, varTable) :
    isIdentifier(v) ? getValueOfIdentifier(v, varTable) :
    isComputationExpression(v) ? getValueOfComputationExpression(v, varTable) :
    isConditionalExpression(v) ? getValueOfConditionalExpression(v, varTable) :
    getValOfMemberExpression(v, varTable);

const getValueOfIdentifier = (id: Identifier, varTable: VarTuple[]): Value =>
    //substitute ? valueExpressionToValue(getValueExpressionOfIdentifier(id, varTable, substitute), varTable, substitute) : id.name;
    valueExpressionToValue(getValueExpressionOfIdentifier(id, varTable, true), varTable);

const getValueOfLiteral = (literal: Literal, varTable: VarTuple[]): Value =>
    isAtomicLiteral(literal) ? literal.value :
    getValueOfArrayExpression(literal, varTable);

const getValueOfArrayExpression = (arr: ArrayExpression, varTable: VarTuple[]): Value =>
    arr.elements.map((v: ValueExpression): Value => valueExpressionToValue(v, varTable));

export const getValueExpressionOfIdentifier = (id: Identifier, varTable: VarTuple[], substitute: Boolean): ValueExpression =>
    //varTable.length == 0 ? null :
    varTable[0].name == id.name ? varTable[0].value :
    getValueExpressionOfIdentifier(id, varTable.slice(1), substitute);
    /*substitute ? (varTable[0].name == id.name ? varTable[0].value :
        getValueExpressionOfIdentifier(id, varTable.slice(1), substitute)) :
    id;*/

const getValueOfComputationExpression = (comp: ComputationExpression, varTable: VarTuple[]): Value =>
    isBinaryExpression(comp) ? getValueOfBinaryExpression(comp, varTable) :
    isLogicalExpression(comp) ? getValueOfLogicalExpression(comp, varTable) :
    isUnaryExpression(comp) ? getValueOfUnaryExpression(comp, varTable) :
    "unsupported: update expression"; //getValueOfUpdateExpression(comp, varTable);

const getValueOfConditionalExpression = (cond: ConditionalExpression, varTable: VarTuple[]): Value =>
    valueExpressionToValue(cond.test, varTable) ? valueExpressionToValue(cond.consequent, varTable) :
    valueExpressionToValue(cond.alternate, varTable);

const getValOfMemberExpression = (memberExpression: MemberExpression, varTable: VarTuple[]): Value =>
    computeMemberExpression(memberExpression.object, valueExpressionToValue(memberExpression.property, varTable), varTable);

const computeMemberExpression = (obj: ArrayObject, property: Value, varTable: VarTuple[]): Value =>
    isNumber(property) ? (isArrayExpression(obj) ? valueExpressionToValue(obj.elements[property], varTable) : getValueOfArrIdentifier(obj, property, varTable)) :
        "error: no property " + property + " in array";

const getValueOfArrIdentifier = (obj: Identifier, property: number, varTable: VarTuple[]): Value =>
    getElementOfArr(getValueExpressionOfIdentifier(obj, varTable, true), property, varTable);

const getElementOfArr = (arr: ValueExpression, index: number, varTable: VarTuple[]): Value =>
    isArrayExpression(arr) ? valueExpressionToValue(arr.elements[index], varTable) :
    isIdentifier(arr) ? getValueOfArrIdentifier(arr, index, varTable) :
    "error: not an array";

const getValueOfBinaryExpression = (binaryExpression: BinaryExpression, varTable: VarTuple[]): Value =>
    performBinaryOp(valueExpressionToValue(binaryExpression.left, varTable), valueExpressionToValue(binaryExpression.right, varTable), binaryExpression.operator);

const performBinaryOp = (left: Value, right: Value, op: string): Value =>
    op === '+' ? performAddition(left, right) :
    isNumber(left) && isNumber(right) && isNumericOp(op) ? performNumericBinaryOp(left, right, op) :
    performBooleanEqBinaryOp(left, right, op);

const performAddition = (left: Value, right: Value): Value =>
    isNumber(left) && isNumber(right) ? left + right :
    isString(left) ? left + right :
    isString(right) ? left + right :
    "undefined operation: " + left + " + " + right;

const isNumericOp = (op: string): boolean =>
   ['-', '*', '/', '**'].indexOf(op) != -1;

const performBooleanEqBinaryOp = (left: Value, right: Value, op: string): Value =>
    op === '==' ? left == right :
    op === '===' ? left === right :
    op === '!=' ? left != right :
    op === '!==' ? left !== right :
    performBooleanInequalityOp(left, right, op);

const performBooleanInequalityOp = (left: Value, right: Value, op: string): Value =>
    op === '>' ? left > right :
    op === '>=' ? left >= right :
    op === '<' ? left < right :
    left <= right;

const performNumericBinaryOp = (left: number, right: number, op: string) : Value =>
    op === '-' ? left - right :
    op === '*' ? left * right :
    op === '/' ? left / right :
    left ** right;

const getValueOfLogicalExpression = (logicalExpression: LogicalExpression, varTable: VarTuple[]): Value =>
    computeLogicalOperation(valueExpressionToValue(logicalExpression.left, varTable), valueExpressionToValue(logicalExpression.right, varTable), logicalExpression.operator);

const computeLogicalOperation = (left: Value, right: Value, op: string): Value =>
    isBoolean(left) && isBoolean(right) ? performLogicalOperation(left, right, op) :
    "error: " + op + " is undefined on non-booleans";

const performLogicalOperation = (left: boolean, right: boolean, op: string): Value =>
    op[0] === '&' ? left && right :
    left || right;

const getValueOfUnaryExpression = (unaryExpression: UnaryExpression, varTable: VarTuple[]): Value =>
    performUnaryOp(valueExpressionToValue(unaryExpression.argument, varTable), unaryExpression.operator);

const performUnaryOp = (val: Value, op: string): Value =>
    op === '!' ? (isBoolean(val) ? !val : "undefined operation: not on a non-boolean") :
    op === '-' ? -val :
    val;

/*const getValueOfUpdateExpression = (updateExpression: UpdateExpression, varTable: VarTuple[]): Value =>
    performUpdate(updateExpression, updateExpression.argument, updateExpression.operator, updateExpression.prefix, varTable);*/

const performUpdate = (updateExpression: UpdateExpression, assignable: Assignable, op: string, prefix: boolean, varTable: VarTuple[]): Value => { // Mutations due to changing varTable
    if (isIdentifier(assignable)) {
        let oldValue = valueExpressionToValue(assignable, varTable);
        if (isNumber(oldValue)) {
            let newValue = performUpdateOp(oldValue, op);
            updateVarTable(varTable, assignable, createBinaryExpression(op[0], replaceVarInIdentifier(assignable, assignable, varTable), createAtomicLiteralExpression(1), updateExpression.loc)); // Transform the update exp into a binary exp so it would not be calculated more than once
            return (prefix ? newValue : oldValue);
        }
        return "error: cannot update a non numeric value: " + oldValue;
    }
    else {
        let arr = assignable.object;
        let i = extractNumber(valueExpressionToValue(assignable.property, varTable));
        return isIdentifier(arr) ? performUpdateOnArray(updateExpression, arr, i, prefix, varTable) : performBinaryOp(getElementOfArr(arr, i, varTable), 1, op[0]);
    }
}

const performUpdateOnArray = (updateExpression: UpdateExpression, arr: Identifier, i: number, prefix: boolean, varTable: VarTuple[]): Value => {
    let oldValue = replaceVarInArrayExpression(arr, extractArrayExpression(arr, varTable), varTable);
    if (oldValue.elements.length > 0) {
        let newElements = oldValue.elements.map((v: ValueExpression, index: number): ValueExpression =>
            index == i ? createBinaryExpression(updateExpression.operator[0], v, createAtomicLiteralExpression(1), updateExpression.loc) : v);
        let newArr = createArrayExpression(newElements, arr.loc);
        updateVarTable(varTable, arr, newArr);
        return (prefix) ? valueExpressionToValue(newElements[i], varTable) : valueExpressionToValue(oldValue.elements[i], varTable);
    }
    return 0;
}

const updateVarTable = (varTable: VarTuple[], id: Identifier, newValue: ValueExpression): void => { // Mutations due to changing varTable
    for (let i = 0; i < varTable.length; i++) {
        if (varTable[i].name == id.name) {
            varTable[i].value = newValue;
            return;
        }
    }
    varTable.push({name: id.name, value: newValue, isParam: false});
}

const performUpdateOp = (value: number, op: string): Value =>
    op === '++' ? value + 1 :
    value - 1;


export interface ValuedLine {
    analyzedLine: AnalyzedLine;
    value: Value;
}

const analyzedLineToValuedLine = (expression: Expression, value: Value, varTable: VarTuple[], substitution: Boolean): ValuedLine =>
    ({analyzedLine: getFirstAnalyzedLine(expression, substitution ? varTable : []), value: value});

const NO_LINES = [];

const closeBlockLine: ValuedLine = {
    analyzedLine: {line: -1, type: 'BlockClosing', name: '', condition: '', value: ''},
    value: 0
};

const doWhileEndLine = (cond: string, value: Value): ValuedLine => ({
    analyzedLine: {line: -1, type: 'DoWhileEnd', name: '', condition: cond, value: ''},
    value: value
});

const getElseLine = (): ValuedLine => ({
    analyzedLine: {line: -1, type: "Else", name: '', condition: '', value: ''},
    value: 0
});

const copyArr = <T>(arr: T[]): T[] => JSON.parse(JSON.stringify(arr));

const replaceVarInValueExpression = (id: Identifier, valueExpression: ValueExpression, varTable: VarTuple[]): ValueExpression =>
    isIdentifier(valueExpression) ? replaceVarInIdentifier(id, valueExpression, varTable) :
    isLiteral(valueExpression) ? valueExpression :
    isComputationExpression(valueExpression) ? replaceVarInComputationExpression(id, valueExpression, varTable) :
    isConditionalExpression(valueExpression) ? replaceVarInConditionalExpression(id, valueExpression, varTable) :
    replaceVarInMemberExpression(id, valueExpression, varTable);

const replaceVarInIdentifier = (id: Identifier, replaceIn: Identifier, varTable: VarTuple[]): ValueExpression =>
    id.name == replaceIn.name ? getValueExpressionOfIdentifier(replaceIn, varTable, true) : replaceIn;

const replaceVarInComputationExpression = (id: Identifier, comp: ComputationExpression, varTable: VarTuple[]): ValueExpression =>
    isBinaryExpression(comp) ? createBinaryExpression(comp.operator, replaceVarInValueExpression(id, comp.left, varTable),
        replaceVarInValueExpression(id, comp.right, varTable), comp.loc) :
    isLogicalExpression(comp) ? createLogicalExpression(comp.operator, replaceVarInValueExpression(id, comp.left, varTable),
        replaceVarInValueExpression(id, comp.right, varTable), comp.loc) :
    isUnaryExpression(comp) ? createUnaryExpression(comp.operator, replaceVarInValueExpression(id, comp.argument, varTable), comp.prefix, comp.loc) :
    comp;

const replaceVarInMemberExpression = (id: Identifier, memberExpression: MemberExpression, varTable: VarTuple[]): ValueExpression =>
    createMemberExpression(memberExpression.computed, replaceVarInMemberObject(id, memberExpression.object, varTable),
        replaceVarInValueExpression(id, memberExpression.property, varTable), memberExpression.loc);

const replaceVarInMemberObject = (id: Identifier, obj: ArrayObject, varTable: VarTuple[]): ArrayObject =>
    isArrayExpression(obj) ? (obj.elements.length > 0 ?
        replaceVarInArrayExpression(id, obj, varTable) :
    obj):
    replaceVarInMemberObject(id, extractArrayExpression(obj, varTable), varTable);

const replaceVarInArrayExpression = (id: Identifier, arrayExpression: ArrayExpression, varTable: VarTuple[]): ArrayExpression =>
    createArrayExpression(arrayExpression.elements.map((v: ValueExpression): ValueExpression => replaceVarInValueExpression(id, v, varTable)), arrayExpression.loc);

const replaceVarInConditionalExpression = (id: Identifier, cond: ConditionalExpression, varTable: VarTuple[]): ValueExpression =>
    createConditionalExpression(replaceVarInValueExpression(id, cond.test, varTable),
        replaceVarInValueExpression(id, cond.consequent, varTable), replaceVarInValueExpression(id, cond.alternate, varTable), cond.loc);

const substituteExpression = (exp: Expression, varTable: VarTuple[], substitute: Boolean): ValuedLine[] =>
    isAtomicExpression(exp) ? substituteAtomicExpression(exp, varTable, substitute) :
    substituteCompoundExpression(exp, varTable, substitute);

const substituteAtomicExpression = (exp: AtomicExpression, varTable: VarTuple[], substitute: Boolean): ValuedLine[] =>
    isVariableDeclaration(exp) ? substituteVariableDeclaration(exp, varTable, substitute) :
    isAssignmentExpression(exp) ? substituteAssignmentExpression(exp, varTable, substitute) :
    isReturnStatement(exp) ? substituteReturnStatement(exp, varTable, substitute) :
    substituteBreakStatement(exp, varTable, substitute);

const substituteCompoundExpression = (exp: CompoundExpression, varTable: VarTuple[], substitute: Boolean): ValuedLine[] =>
    isFunctionDeclaration(exp) ? substituteFunctionDeclaration(exp, varTable, substitute) :
    isValueExpression(exp) ? substituteValueExpression(exp, varTable, substitute) :
    isExpressionStatement(exp) ? substituteExpressionStatement(exp, varTable, substitute).concat(substituteExpression(exp.expression, varTable, substitute)) :
    isIfStatement(exp) ? substituteIfStatement(exp, varTable, substitute) :
    substituteLoopStatement(exp, varTable, substitute);

const substituteFunctionDeclaration = (func: FunctionDeclaration, varTable: VarTuple[], substitute: Boolean): ValuedLine[] =>
    [analyzedLineToValuedLine(func, 0, varTable, substitute)].concat(getValuedLinesOfBody(func.body, varTable, substitute));

const substituteValueExpression = (exp: ValueExpression, varTable: VarTuple[], substitute: Boolean): ValuedLine[] =>  {
    let lines = [analyzedLineToValuedLine(exp, 0, varTable, substitute)];
    if (isUpdateExpression(exp)) {
        performUpdate(exp, exp.argument, exp.operator, exp.prefix, varTable);
        if (isAssignableParam(exp.argument, varTable, substitute))
            return lines;
    }
    return NO_LINES;
}

const isAssignableParam = (assignable: Assignable, varTable: VarTuple[], substitute: Boolean): boolean =>
    isIdentifier(assignable) ? isVarParam(assignable, varTable, substitute) :
    isArrayObjectParam(assignable.object, varTable, substitute);

const isArrayObjectParam = (arrayObject: ArrayObject, varTable: VarTuple[], substitute: Boolean): boolean =>
    isIdentifier(arrayObject) ? isVarParam(arrayObject, varTable, substitute) :
    false;


const substituteExpressionStatement = (exp: ExpressionStatement, varTable: VarTuple[], substitution: Boolean): ValuedLine[] => {
    [analyzedLineToValuedLine(exp, 0, varTable, substitution)];
    return NO_LINES;
}

/*const substituteUpdateExpression = (updateExpression: UpdateExpression, varTable: VarTuple[]): ValuedLine[] => { // Mutation due to chancing varTable
    let arg = updateExpression.argument;
    let ret = [analyzedLineToValuedLine(updateExpression, 0, varTable)];
    if (isIdentifier(arg)) {
        if (isVarParam(arg, varTable))
            return ret;
    }
    else {
        let obj = arg.object;
        if (isIdentifier(obj) && isVarParam(obj, varTable))
            return ret;
    }
    return NO_LINES;
}*/

const getValuedLinesOfBody = (body: Body, varTable: VarTuple[], substitute: Boolean): ValuedLine[] =>
    (isExpression(body) ? substituteExpression(body, copyArr(varTable), substitute) :
    (body.body.length > 0 ?
        body.body.map(getSubstituteExpFunc(copyArr(varTable), substitute)).reduce(concatValuedLines) :
        [])).concat([closeBlockLine]);

const substituteIfStatement = (ifStatement: IfStatement, varTable: VarTuple[], substitute: Boolean): ValuedLine[] =>
    ifStatement.alternate != null ? [analyzedLineToValuedLine(ifStatement, valueExpressionToValue(ifStatement.test, varTable), varTable, substitute)].concat(getValuedLinesOfBody(ifStatement.consequent, varTable, substitute))
        .concat([getElseLine()]).concat(getValuedLinesOfBody(ifStatement.alternate, varTable, substitute)) :
    [analyzedLineToValuedLine(ifStatement, valueExpressionToValue(ifStatement.test, varTable), varTable, substitute)].concat(getValuedLinesOfBody(ifStatement.consequent, varTable, substitute));

const substituteLoopStatement = (loopStatement: LoopStatement, varTable: VarTuple[], substitute: Boolean): ValuedLine[] =>
    isWhileStatement(loopStatement) ? substituteWhileStatement(loopStatement, varTable, substitute) :
    isDoWhileStatement(loopStatement) ? substituteDoWhileStatement(loopStatement, varTable, substitute) :
    substituteForStatement(loopStatement, varTable, substitute);

const substituteWhileStatement = (whileStatement: WhileStatement, varTable: VarTuple[], substitute: Boolean): ValuedLine[] =>
    [analyzedLineToValuedLine(whileStatement, valueExpressionToValue(whileStatement.test, varTable), varTable, substitute)].concat(getValuedLinesOfBody(whileStatement.body, varTable, substitute));

const substituteDoWhileStatement = (doWhileStatement: DoWhileStatement, varTable: VarTuple[], substitute: Boolean): ValuedLine[] =>
    [analyzedLineToValuedLine(doWhileStatement, valueExpressionToValue(doWhileStatement.test, varTable), varTable, substitute)].concat(getValuedLinesOfBody(doWhileStatement.body, varTable, substitute)).concat(getDoWhileEndLine(getValOfValExp(doWhileStatement.test, varTable), valueExpressionToValue(doWhileStatement.test, varTable)));

const getDoWhileEndLine = (cond: string, value: Value): ValuedLine[] =>
    [doWhileEndLine(cond, value)];

const substituteForStatement = (forStatement: ForStatement, varTable: VarTuple[], substitute: Boolean): ValuedLine[] => {
    if (isVariableDeclaration(forStatement.init))
        substituteVariableDeclaration(forStatement.init, varTable, substitute); // Add declaration to var table
    else
        substituteAssignmentExpression(forStatement.init, varTable, substitute);
    return [analyzedLineToValuedLine(forStatement, valueExpressionToValue(forStatement.test, varTable), varTable, substitute)].concat(getValuedLinesOfBody(forStatement.body, varTable, substitute));
}

const substituteVariableDeclaration = (varDeclaration: VariableDeclaration, varTable: VarTuple[], substitute: Boolean): ValuedLine[] => { // Mutations due to changing varTable
    for (let i = 0; i < varDeclaration.declarations.length; i++) {
        updateVarTable(varTable, varDeclaration.declarations[i].id, (varDeclaration.declarations[i].init == null ? createAtomicLiteralExpression(0) : varDeclaration.declarations[i].init));
    }
    return substitute ? NO_LINES : [analyzedLineToValuedLine(varDeclaration, 0, varTable, substitute)];
}

const substituteAssignmentExpression = (assignmentExpression: AssignmentExpression, varTable: VarTuple[], substitute: Boolean): ValuedLine[] => // Mutation due to changing varTable
    assignmentExpression.operator != '=' ?
        substituteAssignmentExpression(createAssignmentExpression('=', assignmentExpression.left,
            createBinaryExpression(assignmentExpression.operator[0], assignmentExpression.left, assignmentExpression.right,
                assignmentExpression.loc), assignmentExpression.loc), varTable, substitute) :
    substituteAssignmentIdOrArr(assignmentExpression, assignmentExpression.left, varTable, substitute);

const substituteAssignmentIdOrArr = (assignmentExpression: AssignmentExpression, left: Assignable, varTable: VarTuple[], substitute: Boolean): ValuedLine[] =>
    isIdentifier(left) ? substituteIdentifierAssignment(assignmentExpression, left, varTable, substitute) :
    substituteArrayAssignment(assignmentExpression, left, varTable, substitute);

const substituteIdentifierAssignment = (assignmentExpression: AssignmentExpression, left: Identifier, varTable: VarTuple[], substitute: Boolean): ValuedLine[] => {
    let right = assignmentExpression.right;
    //if (!isUpdateExpression(right)) {
        let newValue: ValueExpression = replaceVarInValueExpression(left, right, varTable);
        updateVarTable(varTable, left, newValue);

        return substitute ? (isVarParam(left, varTable, substitute) ? [analyzedLineToValuedLine(assignmentExpression, 0, varTable, substitute)] : NO_LINES) :
        [analyzedLineToValuedLine(assignmentExpression, 0, varTable, substitute)];
    //}
    //return NO_LINES;
}

const replaceElement = (arr: ArrayExpression, index: number, newElement: ValueExpression): ArrayExpression =>
    createArrayExpression(arr.elements.map((v: ValueExpression, curr: number): ValueExpression => curr == index ? newElement : v), arr.loc);

const substituteArrayAssignment = (assignmentExpression: AssignmentExpression, left: MemberExpression, varTable: VarTuple[], substitute: Boolean): ValuedLine[] => {
    let id = left.object;
    if (isArrayExpression(id))
        return NO_LINES;
    else {
        let arr: ArrayExpression = extractArrayExpression(left.object, varTable);
        let index = extractNumber(valueExpressionToValue(left.property, varTable));
        let right = assignmentExpression.right;
        //if (!isUpdateExpression(right)) {
            let newArr = replaceElement(arr, index, replaceVarInValueExpression(id, right, varTable));
            updateVarTable(varTable, id, newArr);
            return [analyzedLineToValuedLine(assignmentExpression, 0, varTable, substitute)];
        //}
        //return NO_LINES;
    }
}

const extractArrayExpression = (arr: ValueExpression, varTable: VarTuple[]): ArrayExpression =>
    isArrayExpression(arr) ? arr :
    isIdentifier(arr) ? extractArrayExpression(getValueExpressionOfIdentifier(arr, varTable, true), varTable) :
    createArrayExpression([], getBlankLocation()); // Create an empty array

const extractNumber = (v: Value): number =>
    isNumber(v) ? v : 0;

const substituteReturnStatement = (returnStatement: ReturnStatement, varTable: VarTuple[], substitute: Boolean): ValuedLine[] =>
    [analyzedLineToValuedLine(returnStatement, valueExpressionToValue(returnStatement.argument, varTable), varTable, substitute)];

const substituteBreakStatement = (b: BreakStatement, varTable: VarTuple[], substitute: Boolean): ValuedLine[] =>
    [analyzedLineToValuedLine(b, 0, varTable, substitute)]

const getSubstituteExpFunc = (varTable: VarTuple[], substitute: Boolean) =>
    (exp: Expression) =>
        substituteExpression(exp, varTable, substitute);

const concatValuedLines = (previous: ValuedLine[], current: ValuedLine[]) => previous.concat(current);

const substituteProgram = (program: Program, varTable: VarTuple[], substitute: Boolean = true): ValuedLine[] =>
    program.body.length > 0 ? program.body.map(getSubstituteExpFunc(varTable, substitute)).reduce(concatValuedLines) : [];


export {parseParams, substituteProgram};