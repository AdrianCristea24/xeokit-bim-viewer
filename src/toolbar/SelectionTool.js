import {Controller} from "../Controller.js";
import {AnnotationsPlugin, math } from "../../../xeokit-sdk/dist/xeokit-sdk.es.js";


/** @private */
class SelectionTool extends Controller {

    constructor(parent, cfg) {

        super(parent);
        this.selected = [];
        this.ctrlPressed = false;


        if (!cfg.buttonElement) {
            throw "Missing config: buttonElement";
        }

        const buttonElement = cfg.buttonElement;

        const annotations = new AnnotationsPlugin(this.viewer, {
            markerHTML: "<div class='annotation-marker' style='background-color: {{markerBGColor}};'>{{glyph}}</div>",
           

            values: {
                markerBGColor: "black",
                labelBGColor: "white",
                glyph: "X",
                title: "Untitled",
                description: "No description"
            }
        });

        this.on("enabled", (enabled) => {
            if (!enabled) {
                buttonElement.classList.add("disabled");
            } else {
                buttonElement.classList.remove("disabled");
            }
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Control') {
                this.ctrlPressed = true;
            }
        });

        document.addEventListener('keyup', (event) => {
            if (event.key === 'Control') {
                this.ctrlPressed = false;
            }
        });

        this.viewer.cameraControl.on("pickedNothing", (e) => {
            for(let i = 0; i < this.selected.length; i++) {
                annotations.destroyAnnotation([this.selected[i]]);
                this.viewer.scene.objects[this.selected[i]].selected = false;
            }
            this.selected = [];
        });

        this.on("active", (active) => {
            const viewer = this.viewer;
            if (active) {
                buttonElement.classList.add("active");
                this._onPick = this.viewer.cameraControl.on("picked", (pickResult) => {
                    if (!pickResult.entity) {
                        return;
                    }
                    pickResult.entity.selected = !pickResult.entity.selected;
                    if (!pickResult.entity.selected){

                        let index = this.selected.indexOf(pickResult.entity.id);
                        if (index !== -1) { 
                            annotations.destroyAnnotation([this.selected[index]]);
                            viewer.scene.objects[this.selected[index]].selected = false;
                            this.selected.splice(index, 1);
                        }

                        return;
                    }

                    if (!this.ctrlPressed){
                        for(let i = 0; i < this.selected.length; i++) {
                            annotations.destroyAnnotation([this.selected[i]]);
                            viewer.scene.objects[this.selected[i]].selected = false;
                        }
                        this.selected = [];
                    }

                    this.selected.push(pickResult.entity.id);

                    document.getElementById('inspector_toggle').checked = true;

                    let measurementsTab = document.getElementsByClassName("xeokit-measurementsTab")[0];
                    let propTab = document.getElementsByClassName("xeokit-propertiesTab")[0];
                    let optionsTab = document.getElementsByClassName("xeokit-optionsTab")[0];

                    if (propTab) {
                        optionsTab.classList.remove('active');
                        measurementsTab.classList.remove('active');
                        propTab.classList.add('active');
                    }

                    parent.showObjectProperties(pickResult.entity.id);

                    if (this.viewer.scene._renderer.getAnno()){
                        const entity = pickResult.entity;
                        const aabb = entity.aabb;
                        const entityCenter = math.getAABB3Center(aabb);
                
                        this.viewer.metaScene.metaObjects[entity.id];
                
                        annotations.createAnnotation({
                            id: entity.id,
                            entity: entity,
                            worldPos: entityCenter,
                            occludable: false,
                            markerShown: true,
                            labelShown: false,
                
                            values: {
                                glyph: "" + pickResult.entity.surfaceArea.toFixed(2) + " m²",
                            }
                        });
                    }

                });
            } else {
                buttonElement.classList.remove("active");
                if (this._onPick !== undefined) {
                    this.viewer.cameraControl.off(this._onPick);
                    this._onPick = undefined;
                }
            }
        });

        buttonElement.addEventListener("click", (event) => {
            if (this.getEnabled()) {
                this.bimViewer._sectionTool.hideControl();
                const active = this.getActive();
                this.setActive(!active);
            }
            event.preventDefault();
        });

        this.bimViewer.on("reset", () => {
            this.setActive(false);
        });

        setTimeout(() => {
            this.setActive(true);
        }, 1000);

    }
}

export {SelectionTool};