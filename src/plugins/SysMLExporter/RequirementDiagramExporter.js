/*globals define*/
/*jshint node:true, browser:true*/

/**
 * Author: Dana Zhang
 * Created on: October 31, 2015
 */

define(['common/util/ejs',
    'plugin/SysMLExporter/SysMLExporter/Templates/Templates',
    './SysMLExporterConstants',
    'common/util/xmljsonconverter'], function (ejs, TEMPLATES, CONSTANTS, Converter) {

    'use strict';

    var RequirementDiagramExporter = function () {
    };

    RequirementDiagramExporter.prototype.addComponent = function (nodeObj) {

        var self = this,
            core = self.core,
            gmeID = core.getPath(nodeObj),
            baseClass = self.getMetaType(nodeObj),
            type = core.getAttribute(baseClass, 'name'),
            name = core.getAttribute(nodeObj, 'name'),
            xPos = core.getRegistry(nodeObj, 'position').x,
            yPos = core.getRegistry(nodeObj, 'position').y,
            element,
            parentPath = core.getPath(core.getParent(nodeObj)),
            diagramKey = parentPath + "+" + core.getAttribute(nodeObj.parent, 'name');

        self.idLUT[gmeID] = {id: self.modelID};
        self.reverseIdLUT[self.modelID] = gmeID;
        if (self.isMetaTypeOf(baseClass, self.META.Requirement)) {
            element = {
                name: name,
                id: self.modelID,
                x: xPos,
                y: yPos,
                type: 'Class'
            };

            if (!self.requirementDiagrams.hasOwnProperty(diagramKey)) {
                self.requirementDiagrams[diagramKey] = {};
            }
            if (!self.requirementDiagrams[diagramKey].hasOwnProperty('elements')) {
                self.requirementDiagrams[diagramKey].elements = [];
            }
            self.requirementDiagrams[diagramKey].elements.push(element);
        } else {
            element = {
                name: name,
                id: self.modelID,
                x: xPos,
                y: yPos,
                type: type
            };

            if (!self.requirementDiagrams.hasOwnProperty(diagramKey)) {
                self.requirementDiagrams[diagramKey] = {};
            }
            if (!self.requirementDiagrams[diagramKey].hasOwnProperty('comments')) {
                self.requirementDiagrams[diagramKey].comments = [];
            }
            self.requirementDiagrams[diagramKey].comments.push(element);
        }
        self.modelID += 1;
    };

    RequirementDiagramExporter.prototype.addConnection = function (nodeObj, callback) {

        var self = this,
            core = self.core,
            parentPath = core.getPath(core.getParent(nodeObj)),

            diagramKey = parentPath + "+" + core.getAttribute(nodeObj.parent, 'name'),
            isTypeDecompose = self.isMetaTypeOf(self.getMetaType(nodeObj), self.META.Decompose),
            type = core.getAttribute(self.getMetaType(nodeObj), 'name'),
            src = core.getPointerPath(nodeObj, "src"),
            dst = core.getPointerPath(nodeObj, "dst"),
            name = core.getAttribute(nodeObj, 'name'),
            counter = 2,
            error = '',
            pushUseCaseLink,
            afterSrcLoaded,
            afterDstLoaded,
            srcMetaType,
            dstMetaType,
            srcX,
            srcY,
            dstX,
            dstY,
            dstName;

        pushUseCaseLink = function (err, shouldPush) {
            var link;
            if (err) {
                error += err;
                shouldPush = false;
            }
            counter -= 1;
            if (counter === 0) {
                if (error) {
                    callback(error);
                    return;
                }
                if (shouldPush) {
                    link = {
                        id: self.modelID,
                        src: self.idLUT[src].id,
                        dst: self.idLUT[dst].id,
                        type: type,
                        name: name,
                        points: {
                            src: {
                                x: 1, //srcX,
                                y: 0.5 //srcY
                            },
                            dst: {
                                x: 0, //dstX,
                                y: 0.5 //dstY
                            }
                        }
                    };

                    if (isTypeDecompose) {
                        if (!self.idLUT[src].hasOwnProperty('subreqs')) {
                            self.idLUT[src].subreqs = [];
                        }
                        link.dstName = dstName;
                        self.idLUT[src].subreqs.push(link);
                        self.idLUT[dst].ignored = true;
                    } else {
                        if (!self.requirementDiagrams.hasOwnProperty(diagramKey)) {
                            self.requirementDiagrams[diagramKey] = {};
                        }
                        if (!self.requirementDiagrams[diagramKey].hasOwnProperty('links')) {
                            self.requirementDiagrams[diagramKey].links = [];
                        }
                        self.requirementDiagrams[diagramKey].links.push(link);
                        if (!self.idLUT[src].hasOwnProperty('dst')) {
                            self.idLUT[src].dst = [];
                        }
                        self.idLUT[src].dst.push({
                            type: type,
                            dstId: link.dst,
                            connId: link.id
                        });
                        if (!self.idLUT[dst].hasOwnProperty('src')) {
                            self.idLUT[dst].src = [];
                        }
                        self.idLUT[dst].src.push({
                            type: type,
                            srcId: link.src,
                            connId: link.id
                        });
                    }


                    self.modelID += 1;
                    callback(null);
                }
            }
        };

        afterSrcLoaded = function (err, nodeObj) {
            if (err) {
                pushUseCaseLink(err, false);
                return;
            }
            if (!self.idLUT.hasOwnProperty(src)) {
                srcMetaType = core.getAttribute(self.getMetaType(nodeObj), 'name');
                self.addComponent(nodeObj, srcMetaType);
                self.modelID += 1;
            }
            srcX = core.getRegistry(nodeObj, 'position').x;
            srcY = core.getRegistry(nodeObj, 'position').y;
            pushUseCaseLink(null, true);
        };
        core.loadByPath(self.rootNode, src, afterSrcLoaded);

        afterDstLoaded = function (err, nodeObj) {
            if (err) {
                pushUseCaseLink(err, false);
                return;
            }
            if (!self.idLUT.hasOwnProperty(dst)) {
                srcMetaType = core.getAttribute(self.getMetaType(nodeObj), 'name');
                self.addComponent(nodeObj, dstMetaType);
                self.modelID += 1;
            }
            dstX = core.getRegistry(nodeObj, 'position').x;
            dstY = core.getRegistry(nodeObj, 'position').y;
            dstName = core.getAttribute(nodeObj, 'name');
            pushUseCaseLink(null, true);
        };
        core.loadByPath(self.rootNode, dst, afterDstLoaded);

    };

    RequirementDiagramExporter.prototype.processRequirementData = function (callback) {
        var self = this,
            diagramPath,
            i,
            h = 0,
            obj = {},
            diagramId = 1,
            output,
            json2XML = new Converter.Json2xml({xmlDeclaration: ' '});

        for (diagramPath in self.requirementDiagrams) {
            if (self.requirementDiagrams.hasOwnProperty(diagramPath)) {
                var notationFile,
                    modelFile,
                    projectFile,
                    modelNotationElms = [],
                    modelElms = [],
                    reqElms = [];


                if (self.requirementDiagrams[diagramPath].elements) {

                    for (i = 0; i < self.requirementDiagrams[diagramPath].elements.length; ++i) {
                        var childElement = self.requirementDiagrams[diagramPath].elements[i];
                        self._saveComponent(childElement, modelNotationElms, modelElms, reqElms);
                    }
                }

                if (self.requirementDiagrams[diagramPath].comments) {

                    for (i = 0; i < self.requirementDiagrams[diagramPath].comments.length; ++i) {
                        var comment = self.requirementDiagrams[diagramPath].comments[i];
                        self._saveComment(comment, modelNotationElms, modelElms, reqElms);
                    }
                }

                if (self.requirementDiagrams[diagramPath].links) {


                    for (i = 0; i < self.requirementDiagrams[diagramPath].links.length; ++i) {
                        var link = self.requirementDiagrams[diagramPath].links[i],
                            edge,
                            template;

                        obj = CONSTANTS[link.type] || {};

                        obj.srcId = link.src;
                        obj.dstId = link.dst;
                        obj.srcX = link.points.src.x;
                        obj.srcY = link.points.src.y;
                        obj.dstX = link.points.dst.x;
                        obj.dstY = link.points.dst.y;
                        obj.id = link.id;


                        template = TEMPLATES[CONSTANTS.templates[link.type] || CONSTANTS.templates.DefaultEdges];
                        edge = ejs.render(template, obj);

                        modelNotationElms.push(edge);

                        if (link.type !== 'CommentLink') {
                            edge = json2XML.convertToString({
                                'packagedElement': {
                                    '@xmi:type': 'uml:Abstraction',
                                    '@xmi:id': link.id,
                                    '@name': link.name,
                                    '@client': link.src,
                                    '@supplier': link.dst
                                }
                            });
                            modelElms.push(edge);
                            edge = ejs.render(TEMPLATES[CONSTANTS.templates.RequirementUml],
                                {
                                    id: link.id,
                                    className: link.type,
                                    baseName: 'Abstraction'
                                }
                            );
                            reqElms.push(edge);
                        }
                    }
                }

                if (this.visitMultiDiagrams) {
                    self.xml1 += modelElms.join('\n');
                    self.xml2 += reqElms.join('\n');
                } else {
                    notationFile = ejs.render(TEMPLATES['model.notation.ejs'],
                        {
                            diagramType: 'RequirementDiagram',
                            diagramName: diagramPath.split('+')[1],
                            childrenElements: modelNotationElms.join('\n'),
                            diagramId: '_D' + diagramId
                        })
                        .replace(/&lt;/g, '<')
                        .replace(/&gt;/g, '>')
                        .replace(/&#39;/g, "'")
                        .replace(/&quot;/g, '"');

                    modelFile = ejs.render(TEMPLATES['model.uml.ejs'],
                        {
                            diagramId: '_D' + diagramId++,
                            id: h,
                            childElements: modelElms.join('\n'),
                            xmiElements: reqElms.join('\n')
                        })
                        .replace(/&lt;/g, '<')
                        .replace(/&gt;/g, '>')
                        .replace(/&#39;/g, "'")
                        .replace(/&quot;/g, '"');

                    projectFile = ejs.render(TEMPLATES['.project.ejs'],
                        {
                            name: diagramPath.split('+')[1]
                        });

                    output = {
                        project: projectFile,
                        modelDi: TEMPLATES['model.di.ejs'],
                        notation: notationFile,
                        modelUml: modelFile
                    };
                    self.outputFiles['.project'] = output.project;
                    self.outputFiles['model.di'] = output.modelDi;
                    self.outputFiles['model.notation'] = output.notation;
                    self.outputFiles['model.uml'] = output.modelUml;
                }
            }
            ++h;
        }
    };

    RequirementDiagramExporter.prototype._saveComponent = function (childElement, modelNotationElms, modelElms, reqElms) {

        var self = this,
            elm,
            j,
            umlObject,
            json2XML = new Converter.Json2xml({xmlDeclaration: ' '});

        umlObject = {
            'packagedElement': {
                '@xmi:type': 'uml:' + childElement.type,
                '@xmi:id': childElement.id,
                '@name': childElement.name
            }
        };

        // if node has decomposed subreqs, it is type Requirement
        if (self.idLUT[self.reverseIdLUT[childElement.id]].subreqs && !self.idLUT[self.reverseIdLUT[childElement.id]].ignored) {

            umlObject.packagedElement['nestedClassifier'] = [];

            for (j = 0; j < self.idLUT[self.reverseIdLUT[childElement.id]].subreqs.length; ++j) {
                self._buildDecomposition(umlObject.packagedElement, self.idLUT[self.reverseIdLUT[childElement.id]].subreqs[j], modelNotationElms);
            }

            elm = json2XML.convertToString(umlObject);
            modelElms.push(elm);

        } else if (self.idLUT[self.reverseIdLUT[childElement.id]].dst
            || (!self.idLUT[self.reverseIdLUT[childElement.id]].ignored)) {

            // if node isn't nested in any other objects or is a src obj

            elm = json2XML.convertToString(umlObject);
            modelElms.push(elm);
        }   // otherwise, don't create a "packagedElement" for node


        // for each Requirement type, create a Requirement element for it
        elm = ejs.render(TEMPLATES[CONSTANTS.templates.RequirementUml],
            {
                id: childElement.id,
                className: 'Requirement',
                baseName: 'Class'
            }
        );
        reqElms.push(elm);

        // for each node, create notation elements
        elm = ejs.render(TEMPLATES[childElement.type + '.ejs'],
            {
                id: childElement.id,
                x: childElement.x,
                y: childElement.y
            });
        modelNotationElms.push(elm);
    };

    RequirementDiagramExporter.prototype._buildDecomposition = function (compChain, currentChild, modelNotationElms) {
        var self = this,
            id = currentChild.dst,
            type = 'Class',
            name = currentChild.dstName,
            obj = {},
            elm,
            j;

        // create notation elements for Decompose type connections
        obj.srcId = currentChild.src;
        obj.dstId = currentChild.dst;
        obj.srcX = currentChild.points.src.x;
        obj.srcY = currentChild.points.src.y;
        obj.dstX = currentChild.points.dst.x;
        obj.dstY = currentChild.points.dst.y;

        elm = ejs.render(TEMPLATES[CONSTANTS.templates.Decompose], obj);

        modelNotationElms.push(elm);


        // create uml elements for the decomposition chain
        obj = {
                '@xmi:type': 'uml:' + type,
                '@xmi:id': id,
                '@name': name
        };

        // currentChild.dst stores the dst end of Decompose connection
        if (self.idLUT[self.reverseIdLUT[id]].subreqs) {

            obj.nestedClassifier = [];
            for (j = 0; j < self.idLUT[self.reverseIdLUT[id]].subreqs.length; ++j) {
                self._buildDecomposition(obj, self.idLUT[self.reverseIdLUT[id]].subreqs[j], modelNotationElms);
            }
        }

        compChain.nestedClassifier.push(obj);

    };

    RequirementDiagramExporter.prototype._saveComment = function (comment, modelNotationElms, modelElms, reqElms) {
        var self = this,
            elm,
            j,
            umlObject,
            key,
            annotatedElements = [],
            json2XML = new Converter.Json2xml({xmlDeclaration: ' '});


        umlObject = {
            'ownedComment': {
                '@xmi:type': 'uml:Comment',
                '@xmi:id': comment.id
            }
        };
        if (self.idLUT[self.reverseIdLUT[comment.id]].dst) {
            self.idLUT[self.reverseIdLUT[comment.id]].dst.forEach(function (c) {
                annotatedElements.push(c.dstId);
            });
            umlObject.ownedComment['@annotatedElements'] = annotatedElements.join(' ');
        }

        elm = json2XML.convertToString(umlObject);
        modelElms.push(elm);


        if (comment.type !== 'Comment') {
            key = 'ModelElements:' + comment.type;
            umlObject = {};
            umlObject[key] = {
                '@xmi:id': 'rand' + comment.id,
                '@base_Comment': comment.id
            };
            elm = json2XML.convertToString(umlObject);
            reqElms.push(elm);
        }

        // for each node, create notation elements
        elm = ejs.render(TEMPLATES[CONSTANTS.templates.Comment],
            {
                id: comment.id,
                x: comment.x,
                y: comment.y
            });
        modelNotationElms.push(elm);
    };


    return RequirementDiagramExporter;
});