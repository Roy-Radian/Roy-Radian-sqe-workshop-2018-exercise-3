import $ from 'jquery';
import {parseCode} from './code-analyzer';
import {constructTable, constructSubstitution} from './html-visualisation';
//import {parseParams, valueExpressionToValue} from './code-substitutor'; // To test value calculations
import * as js2flowchart from 'js2flowchart';

let shouldTerminate = false;

$(document).ready(function () {
    $('#codeSubmissionButton').click(() => {
        shouldTerminate = false;
        let codeToParse = $('#codePlaceholder').val();
        let parsedCode = parseCode(codeToParse);
        let params = $('#params').val();

        let res = constructSubstitution(parsedCode, params, false);
        if (res.subProg != null) {
            graphCode(res);
        }
        /*let parsedParams = parseParams(params);
        $('#substitutedCode').val(String(valueExpressionToValue(parsedCode.body[0].expression, parsedParams)))*/ // To test value calculations

        //$('#substitutedCode').val(JSON.stringify(parsedCode, null, 2)); // Show parsed code
        document.getElementById('substitutedCode').innerHTML = res.valuedLines; // constructSubstitution(parsedCode, params);
        document.getElementById('tblDiv').innerHTML = constructTable(parsedCode);
    });
});

function graphCode(res) {
    let codeToGraph = extractContent(res.valuedLines);
    let graphDiv = document.getElementById('graphit');

    const {createFlowTreeBuilder, createSVGRender} = js2flowchart;
    const flowTreeBuilder = createFlowTreeBuilder(),
        svgRender = createSVGRender();
    const flowTree = flowTreeBuilder.build(codeToGraph),
        shapesTree = svgRender.buildShapesTree(flowTree);
    let shapes = shapesTree.getShapes();

    shapes.forEach(function(shape) {
        shape.state.theme.fillColor = '#FFFFFF';
    });
    let counters = {atShape : 0, atCodeNode : 0};
    showFlow(shapes, res.subProg, counters);
    const svg = shapesTree.print();

    graphDiv.innerHTML = svg;
}

/**
 * Fill with green color just the execution path.
 * The rest will be white
 * @param shapes - the shapes to be drawn
 * @param subProg - the code with ifStatement execution flag
 */
function showFlow(shapes, subProg, counters) {
    if (counters.atShape >= shapes.length) return;
    handleLine(shapes, subProg, counters);
    if (!shouldTerminate)
        showFlow(shapes, subProg, counters);
}

function handleLine(shapes, subProg, counters) {
    let type = subProg[counters.atCodeNode].analyzedLine.type;
    if (((type === 'IfStatement' || type === 'WhileStatement' || type === 'Else')
        && subProg[counters.atCodeNode].value == false)) {
        handleFalseCondition(shapes, subProg, counters, type);
    }
    else {
        handleEncounteredLines(shapes, subProg, counters, type);
    }
}

function handleFalseCondition(shapes, subProg, counters, type) {
    let endBlocks = 1;
    replaceShapeColor(shapes[counters.atShape], '#00FF00');
    if (type !== 'Else') counters.atShape++;
    replaceShapeColor(shapes[counters.atShape], '#FFFFFF');
    //  This is an if that shouldn't execute - skip it
    counters.atCodeNode++;
    while (counters.atShape < shapes.length - 1 && endBlocks > 0) {
        endBlocks = skipUnencounteredLine(shapes, subProg, counters, endBlocks);
    }
}

function skipUnencounteredLine(shapes, subProg, counters, endBlocks) {
    replaceShapeColor(shapes[counters.atShape],'#FFFFFF');
    if (subProg[counters.atCodeNode].analyzedLine.type === 'IfStatement' || subProg[counters.atCodeNode].analyzedLine.type === 'WhileStatement') {
        endBlocks++;
        counters.atCodeNode++;
        counters.atShape++;
    } else {
        endBlocks = skipNonIfStatement(shapes, subProg, counters, endBlocks);
    }
    return endBlocks;
}

function skipNonIfStatement(shapes, subProg, counters, endBlocks) {
    if (subProg[counters.atCodeNode].analyzedLine.type === 'BlockClosing') {
        endBlocks--;
        counters.atCodeNode++;
        // If this was the last close and the next Type is an Else - it should be executed
        markElseAsTrue(shapes, subProg, counters, endBlocks);
    } else if (subProg[counters.atCodeNode].analyzedLine.type === 'Else') {
        // If reached else - don't advance shape
        counters.atCodeNode++;
        endBlocks++;
    } else {
        counters.atCodeNode++;
        counters.atShape++;
    }

    return endBlocks;
}

function markElseAsTrue(shapes, subProg, counters, endBlocks) {
    if (endBlocks == 0 && counters.atCodeNode < subProg.length - 1 &&
        subProg[counters.atCodeNode].analyzedLine.type === 'Else') subProg[counters.atCodeNode].value=true;
}

function handleEncounteredLines(shapes, subProg, counters, type) {
    if (type === 'Else' || type === 'BlockClosing') counters.atCodeNode++;
    else {
        replaceShapeColor(shapes[counters.atShape], '#00FF00');
        counters.atShape++;
        counters.atCodeNode++;
        if (type === 'ReturnStatement')
            shouldTerminate = true;
    }
}

function replaceShapeColor(shape, color) {
    var copiedTheme = $.extend({}, shape.state.theme);
    copiedTheme.fillColor = color; // getColorOfNode(type);
    shape.state.theme = copiedTheme;
}

function extractContent(html) {
//remove code brakes and tabs
    html = html.replace(/\n/g, '');
    html = html.replace(/\t/g, '');

    //keep html brakes and tabs
    html = html.replace(/<\/td>/g, '\t');
    html = html.replace(/<\/table>/g, '\n');
    html = html.replace(/<\/tr>/g, '\n');
    html = html.replace(/<\/p>/g, '\n');
    html = html.replace(/<\/div>/g, '\n');
    html = html.replace(/<\/h>/g, '\n');
    html = html.replace(/<br>/g, '\n'); html = html.replace(/<br( )*\/>/g, '\n');

    //parse html into text
    var dom = (new DOMParser()).parseFromString('<!doctype html><body>' + html, 'text/html');
    return dom.body.textContent;
}
