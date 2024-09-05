import {ContextMenu, math} from "@xeokit/xeokit-sdk/dist/xeokit-sdk.es.js";

const tempVec3 = math.vec3();

/**
 * @private
 */
class TreeViewContextMenu extends ContextMenu {

    constructor(bimViewer, cfg = {}) {
        super(cfg);
        this._bimViewer = bimViewer;
        this._buildMenu(cfg);
    }

    _buildMenu(cfg) {

        const showObjectItems = [];
        const focusObjectItems = [];
        const measurementItems = [];

        const enableMeasurements = (!!cfg.enableMeasurements);

        if (this._bimViewer._enablePropertiesInspector) {
            showObjectItems.push({
                getTitle: (context) => {
                    return context.viewer.localeService.translate("treeViewContextMenu.inspectProperties") || "Inspect Properties";
                }, getShown(context) {
                    return !!context.viewer.metaScene.metaObjects[context.treeViewNode.objectId];
                }, doAction: (context) => {
                    const objectId = context.treeViewNode.objectId;
                    context.bimViewer.showObjectProperties(objectId);
                }
            });
        }

        focusObjectItems.push(...[
            {
                getTitle: (context) => {
                    return "Change Color";
                }, doAction: (context) => {
                    const objectId = context.treeViewNode.objectId;
                    const viewer = context.viewer;
                    const objectIds = [];
                    context.treeViewPlugin.withNodeTree(context.treeViewNode, (treeViewNode) => {
                        if (treeViewNode.objectId) {
                            objectIds.push(treeViewNode.objectId);
                        }
                    });
                    console.log(objectIds);
            
                    if (objectIds.length > 1) {
                        objectIds.shift();  // Removes the first element from the array
                    }
                    console.log("Updated objectIds:", objectIds);
            
                    const colorPicker = document.createElement('input');
                    colorPicker.type = 'color';
                    colorPicker.style.position = 'absolute';
                    colorPicker.style.left = '-9999px';  // Hide off-screen
                    document.body.appendChild(colorPicker);
            
                    colorPicker.click();
            
                    // Listen for color selection
                    colorPicker.addEventListener('change', (event) => {
                        const selectedColor = event.target.value;
                        console.log(`Selected color: ${selectedColor}`);
            
                        let hex = selectedColor.replace(/^#/, '');
            
                        const bigint = parseInt(hex, 16);
                        const r = ((bigint >> 16) & 255) / 255;
                        const g = ((bigint >> 8) & 255) / 255;
                        const b = (bigint & 255) / 255;
            
                        const colorize = [r, g, b];
                        console.log(`Colorize array (0-1 range):`, colorize);
            
                        for (let i = 0; i < objectIds.length; i++) {
                            console.log(viewer.scene.objects);
                            let entityTmp = viewer.scene.objects[objectIds[i]];
                            if (entityTmp){
                                entityTmp.colorize = colorize;
                            }
                        }

                        const liElement = document.getElementById(context.treeViewNode.nodeId);
                        if (liElement) {
                            const spanElement = liElement.querySelector('span');
                            if (spanElement) {
                                spanElement.style.color = selectedColor;  // Change the text color to the selected color
                            } else {
                                console.log('No span element found inside the li element.');
                            }
                        } else {
                            console.log('No li element found with the specified ID.');
                        }
            
                        document.body.removeChild(colorPicker);
                    });
                }
            }, {
                getTitle: (context) => {
                    return "Revert Color";
                }, doAction: (context) => {
                    const viewer = context.viewer;
                    const objectIds = [];
                    context.treeViewPlugin.withNodeTree(context.treeViewNode, (treeViewNode) => {
                        if (treeViewNode.objectId) {
                            objectIds.push(treeViewNode.objectId);
                        }
                    });
            
                    // Check if objectIds array has more than one item and remove the first element
                    if (objectIds.length > 1) {
                        objectIds.shift();  // Removes the first element from the array
                    }
            
                    for (let i = 0; i < objectIds.length; i++) {
                        console.log(viewer.scene.objects);
                        let entityTmp = viewer.scene.objects[objectIds[i]];
                        if (entityTmp){
                            entityTmp.colorize = undefined;
                        }
                    }

                    const liElement = document.getElementById(context.treeViewNode.nodeId);
                    if (liElement) {
                        const spanElement = liElement.querySelector('span');
                        if (spanElement) {
                            spanElement.style.color = 'white';  // Change the text color to the selected color
                        }
                    }
            
                }
            }, {
                getTitle: (context) => {
                    return context.viewer.localeService.translate("canvasContextMenu.viewFitSelection") || "View Fit Selected";
                }, doAction: (context) => {
                    const viewer = context.viewer;
                    const objectIds = [];
                    context.treeViewPlugin.withNodeTree(context.treeViewNode, (treeViewNode) => {
                        if (treeViewNode.objectId) {
                            objectIds.push(treeViewNode.objectId);
                        }
                    });
                }
            },{
            getTitle: (context) => {
                return context.viewer.localeService.translate("treeViewContextMenu.viewFit") || "View Fit";
            }, doAction: function (context) {
                const viewer = context.viewer;
                const scene = viewer.scene;
                const objectIds = [];
                context.treeViewPlugin.withNodeTree(context.treeViewNode, (treeViewNode) => {
                    if (treeViewNode.objectId) {
                        objectIds.push(treeViewNode.objectId);
                    }
                });
                scene.setObjectsVisible(objectIds, true);
                scene.setObjectsHighlighted(objectIds, true);
                const aabb = scene.getAABB(objectIds);
                viewer.cameraFlight.flyTo({
                    aabb: aabb, duration: 0.5
                }, () => {
                    setTimeout(function () {
                        scene.setObjectsHighlighted(scene.highlightedObjectIds, false);
                    }, 500);
                });
                viewer.cameraControl.pivotPos = math$1.getAABB3Center(aabb);
            }
        }, {
            getTitle: (context) => {
                return context.viewer.localeService.translate("canvasContextMenu.viewFitSelection") || "View Fit Selected";
            }, getEnabled: (context) => {
                return (context.viewer.scene.numSelectedObjects > 0);
            }, doAction: (context) => {
                const viewer = context.viewer;
                const scene = viewer.scene;
                const sceneAABB = scene.getAABB(scene.selectedObjectIds);
                viewer.cameraFlight.flyTo({
                    aabb: sceneAABB, duration: 0.5
                });
                viewer.cameraControl.pivotPos = math$1.getAABB3Center(sceneAABB);
            }
        }, {
            getTitle: (context) => {
                return context.viewer.localeService.translate("treeViewContextMenu.viewFitAll") || "View Fit All";
            }, doAction: function (context) {
                const viewer = context.viewer;
                const scene = viewer.scene;
                const sceneAABB = scene.getAABB(scene.visibleObjectIds);
                viewer.cameraFlight.flyTo({
                    aabb: sceneAABB, duration: 0.5
                });
                viewer.cameraControl.pivotPos = math$1.getAABB3Center(sceneAABB);
            }
        }]);

        if (enableMeasurements) {
            measurementItems.push(...[{
                getTitle: (context) => {
                    return context.viewer.localeService.translate("canvasContextMenu.measurements") || "Measurements";
                },
                doAction: function (context) {
                    // Does nothing
                },
                items: [ // Sub-menu
                    [{
                        getTitle: (context) => {
                            return context.viewer.localeService.translate("canvasContextMenu.clearMeasurements") || "Clear";
                        }, getEnabled: (context) => {
                            return (context.bimViewer.getNumMeasurements() > 0);
                        }, doAction: (context) => {
                            context.bimViewer.clearMeasurements();
                        }
                    }, {
                        getTitle: (context) => {
                            return context.bimViewer.getMeasurementsAxisVisible() ? context.viewer.localeService.translate("canvasContextMenu.hideMeasurementAxisWires") || "Hide Axis Wires" : context.viewer.localeService.translate("canvasContextMenu.showMeasurementAxisWires") || "Show Axis Wires"
                        }, getEnabled: (context) => {
                            return (context.bimViewer.getNumMeasurements() > 0);
                        }, doAction: (context) => {
                            context.bimViewer.setMeasurementsAxisVisible(!context.bimViewer.getMeasurementsAxisVisible());
                        }
                    }, {
                        getTitle: (context) => {
                            return context.bimViewer.getMeasurementsSnappingEnabled() ? context.viewer.localeService.translate("canvasContextMenu.disableMeasurementSnapping") || "Disable Snapping" : context.viewer.localeService.translate("canvasContextMenu.enableMeasurementSnapping") || "Enable Snapping"
                        }, getEnabled: (context) => {
                            return (context.bimViewer.getNumMeasurements() > 0);
                        }, doAction: (context) => {
                            context.bimViewer.setMeasurementsSnappingEnabled(!context.bimViewer.getMeasurementsSnappingEnabled());
                        }
                    }]]
            }]);
        }

        this.items = [showObjectItems, focusObjectItems, [{
            getTitle: (context) => {
                return context.viewer.localeService.translate("treeViewContextMenu.isolate") || "Isolate";
            }, doAction: function (context) {
                const viewer = context.viewer;
                const scene = viewer.scene;
                const objectIds = [];
                context.treeViewPlugin.withNodeTree(context.treeViewNode, (treeViewNode) => {
                    if (treeViewNode.objectId) {
                        objectIds.push(treeViewNode.objectId);
                    }
                });
                const aabb = scene.getAABB(objectIds);

                viewer.cameraControl.pivotPos = math.getAABB3Center(aabb, tempVec3);

                scene.setObjectsXRayed(scene.xrayedObjectIds, false);
                scene.setObjectsVisible(scene.visibleObjectIds, false);
                // scene.setObjectsPickable(scene.objectIds, false);
                scene.setObjectsSelected(scene.selectedObjectIds, false);

                scene.setObjectsVisible(objectIds, true);
                // scene.setObjectsPickable(objectIds, true);

                viewer.cameraFlight.flyTo({
                    aabb: aabb
                }, () => {
                });
            }
        }], [{
            getTitle: (context) => {
                return context.viewer.localeService.translate("treeViewContextMenu.hide") || "Hide";
            }, doAction: function (context) {
                context.treeViewPlugin.withNodeTree(context.treeViewNode, (treeViewNode) => {
                    if (treeViewNode.objectId) {
                        const entity = context.viewer.scene.objects[treeViewNode.objectId];
                        if (entity) {
                            entity.visible = false;
                        }
                    }
                });
            }
        }, {
            getTitle: (context) => {
                return context.viewer.localeService.translate("treeViewContextMenu.hideOthers") || "Hide Others";
            }, doAction: function (context) {
                const scene = context.viewer.scene;
                scene.setObjectsVisible(scene.visibleObjectIds, false);
                scene.setObjectsPickable(scene.xrayedObjectIds, true);
                scene.setObjectsXRayed(scene.xrayedObjectIds, false);
                context.treeViewPlugin.withNodeTree(context.treeViewNode, (treeViewNode) => {
                    if (treeViewNode.objectId) {
                        const entity = scene.objects[treeViewNode.objectId];
                        if (entity) {
                            entity.visible = true;
                        }
                    }
                });
            }
        }, {
            getTitle: (context) => {
                return context.viewer.localeService.translate("treeViewContextMenu.hideAll") || "Hide All";
            }, getEnabled: function (context) {
                return (context.viewer.scene.visibleObjectIds.length > 0);
            }, doAction: function (context) {
                context.viewer.scene.setObjectsVisible(context.viewer.scene.visibleObjectIds, false);
            }
        }], [{
            getTitle: (context) => {
                return context.viewer.localeService.translate("treeViewContextMenu.show") || "Show";
            }, doAction: function (context) {
                context.treeViewPlugin.withNodeTree(context.treeViewNode, (treeViewNode) => {
                    if (treeViewNode.objectId) {
                        const entity = context.viewer.scene.objects[treeViewNode.objectId];
                        if (entity) {
                            entity.visible = true;
                            if (entity.xrayed) {
                                entity.pickable = true;
                            }
                            entity.xrayed = false;
                            entity.selected = false;
                        }
                    }
                });
            }
        }, {
            getTitle: (context) => {
                return context.viewer.localeService.translate("treeViewContextMenu.showOthers") || "Shows Others";
            }, doAction: function (context) {
                const scene = context.viewer.scene;
                scene.setObjectsVisible(scene.objectIds, true);
                scene.setObjectsPickable(scene.xrayedObjectIds, true);
                scene.setObjectsXRayed(scene.xrayedObjectIds, false);
                context.treeViewPlugin.withNodeTree(context.treeViewNode, (treeViewNode) => {
                    if (treeViewNode.objectId) {
                        const entity = scene.objects[treeViewNode.objectId];
                        if (entity) {
                            entity.visible = false;
                        }
                    }
                });
            }
        }, {
            getTitle: (context) => {
                return context.viewer.localeService.translate("treeViewContextMenu.showAll") || "Show All";
            }, getEnabled: function (context) {
                const scene = context.viewer.scene;
                return ((scene.numVisibleObjects < scene.numObjects) || (context.viewer.scene.numXRayedObjects > 0));
            }, doAction: function (context) {
                const scene = context.viewer.scene;
                scene.setObjectsVisible(scene.objectIds, true);
                scene.setObjectsPickable(scene.xrayedObjectIds, true);
                scene.setObjectsXRayed(scene.xrayedObjectIds, false);
            }
        }], [{
            getTitle: (context) => {
                return context.viewer.localeService.translate("treeViewContextMenu.xray") || "X-Ray";
            }, doAction: function (context) {
                context.treeViewPlugin.withNodeTree(context.treeViewNode, (treeViewNode) => {
                    if (treeViewNode.objectId) {
                        const entity = context.viewer.scene.objects[treeViewNode.objectId];
                        if (entity) {
                            entity.selected = false;
                            entity.xrayed = true;
                            entity.visible = true;
                            entity.pickable = context.bimViewer.getConfig("xrayPickable");
                        }
                    }
                });
            }
        }, {
            getTitle: (context) => {
                return context.viewer.localeService.translate("treeViewContextMenu.undoXray") || "Undo X-Ray";
            }, doAction: function (context) {
                context.treeViewPlugin.withNodeTree(context.treeViewNode, (treeViewNode) => {
                    if (treeViewNode.objectId) {
                        const entity = context.viewer.scene.objects[treeViewNode.objectId];
                        if (entity) {
                            entity.xrayed = false;
                            entity.pickable = true;
                        }
                    }
                });
            }
        }, {
            getTitle: (context) => {
                return context.viewer.localeService.translate("treeViewContextMenu.xrayOthers") || "X-Ray Others";
            }, doAction: function (context) {
                const scene = context.viewer.scene;
                scene.setObjectsVisible(scene.objectIds, true);
                if (!context.bimViewer.getConfig("xrayPickable")) {
                    scene.setObjectsPickable(scene.objectIds, false);
                }
                scene.setObjectsXRayed(scene.objectIds, true);
                scene.setObjectsSelected(scene.selectedObjectIds, false);
                context.treeViewPlugin.withNodeTree(context.treeViewNode, (treeViewNode) => {
                    if (treeViewNode.objectId) {
                        const entity = scene.objects[treeViewNode.objectId];
                        if (entity) {
                            entity.xrayed = false;
                            entity.pickable = true;
                        }
                    }
                });
            }
        }, {
            getTitle: (context) => {
                return context.viewer.localeService.translate("treeViewContextMenu.xrayAll") || "X-Ray All";
            }, doAction: function (context) {
                const scene = context.viewer.scene;
                scene.setObjectsVisible(scene.objectIds, true);
                scene.setObjectsXRayed(scene.objectIds, true);
                scene.setObjectsSelected(scene.selectedObjectIds, false);
                scene.setObjectsPickable(scene.objectIds, false);
            }
        }, {
            getTitle: (context) => {
                return context.viewer.localeService.translate("treeViewContextMenu.xrayNone") || "X-Ray None";
            }, getEnabled: function (context) {
                return (context.viewer.scene.numXRayedObjects > 0);
            }, doAction: function (context) {
                const scene = context.viewer.scene;
                const xrayedObjectIds = scene.xrayedObjectIds;
                scene.setObjectsPickable(xrayedObjectIds, true);
                scene.setObjectsXRayed(xrayedObjectIds, false);
            }
        }], [{
            getTitle: (context) => {
                return context.viewer.localeService.translate("treeViewContextMenu.select") || "Select";
            }, doAction: function (context) {
                context.treeViewPlugin.withNodeTree(context.treeViewNode, (treeViewNode) => {
                    if (treeViewNode.objectId) {
                        const entity = context.viewer.scene.objects[treeViewNode.objectId];
                        if (entity) {
                            entity.selected = true;
                            entity.visible = true;
                        }
                    }
                });
            }
        }, {
            getTitle: (context) => {
                return context.viewer.localeService.translate("treeViewContextMenu.undoSelect") || "Undo Select";
            }, doAction: function (context) {
                context.treeViewPlugin.withNodeTree(context.treeViewNode, (treeViewNode) => {
                    if (treeViewNode.objectId) {
                        const entity = context.viewer.scene.objects[treeViewNode.objectId];
                        if (entity) {
                            entity.selected = false;
                        }
                    }
                });
            }
        }, {
            getTitle: (context) => {
                return context.viewer.localeService.translate("treeViewContextMenu.selectNone") || "Select None";
            }, getEnabled: function (context) {
                return (context.viewer.scene.numSelectedObjects > 0);
            }, doAction: function (context) {
                context.viewer.scene.setObjectsSelected(context.viewer.scene.selectedObjectIds, false);
            }
        }], [{
            getTitle: (context) => {
                return context.viewer.localeService.translate("treeViewContextMenu.clearSlices") || "Clear Slices";
            }, getEnabled: function (context) {
                return (context.bimViewer.getNumSections() > 0);
            }, doAction: function (context) {
                context.bimViewer.clearSections();
            }
        }],
            measurementItems];
    }
}

export {TreeViewContextMenu};