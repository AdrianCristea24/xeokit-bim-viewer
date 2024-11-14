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
        this.measurementCanvasElementArea =  document.getElementById("xeokit-measurements-area");

        // Create a div element for the text panel
        var measureObj = document.getElementById("textOverlayArea") ?? null;
        if (!measureObj){
            this._textOverlayElement = document.createElement('span');
            this._textOverlayElement.id = 'textOverlayArea';
            this._textOverlayElement.className = 'xeokit-btn-group-measure';

            const container = this.measurementCanvasElementArea;

            if (container) {
                container.appendChild(this._textOverlayElement);
            } else {
                console.error("Canvas container is not defined.");
            }
        }

        measureObj = document.getElementById("textOverlayArea");
        measureObj.innerHTML = '';

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

        document.body.setAttribute('tabindex', '0');

        // Focus the body when mouse is clicked anywhere
        document.addEventListener('mousedown', () => {
            document.body.focus(); // Now the body can receive focus
        });
    
        // Add the keydown listener to the body
        document.body.addEventListener('keydown', (event) => {
            if (event.key === 'Control') {
                this.ctrlPressed = true;  // Assuming you're within a class; otherwise, handle 'this'
            }
        });
    
        document.body.addEventListener('keyup', (event) => {
            if (event.key === 'Control') {
                this.ctrlPressed = false;
            }
        });

        this.viewer.cameraControl.on("pickedNothing", (e) => {
            for(let i = 0; i < this.selected.length; i++) {
                annotations.destroyAnnotation([this.selected[i]]);
                this.viewer.scene.objects[this.selected[i]].colorize = undefined;
                this.viewer.scene.objects[this.selected[i]].selected = false;
            }
            this.selected = [];

            let spanTotal = document.getElementById("spanTotalArea");
            let measureObj = document.getElementById("textOverlayArea");

            if (spanTotal){
                spanTotal.textContent = '';
            }

            if (measureObj) {
                measureObj.innerHTML = '';
            }
        });

        this.on("active", (active) => {
            const viewer = this.viewer;
            if (active) {
                buttonElement.classList.add("active");
                let measureObj = document.getElementById("textOverlayArea");

                this._onPick = this.viewer.cameraControl.on("picked", (pickResult) => {
                    if (!pickResult.entity) {
                        return;
                    }
                    pickResult.entity.selected = !pickResult.entity.selected;

                    let spanTotal = document.createElement('span');
                    measureObj.innerHTML = "";
                    spanTotal.textContent = '';
                    spanTotal.className = 'spanTotal';
                    spanTotal.id = 'spanTotalArea';
                    measureObj.appendChild(spanTotal);

                    if (!pickResult.entity.selected){
                        let index = this.selected.indexOf(pickResult.entity.id);
                        if (index !== -1) { 
                            annotations.destroyAnnotation([this.selected[index]]);
                            viewer.scene.objects[this.selected[index]].selected = false;
                            viewer.scene.objects[this.selected[index]].colorize = undefined;
                            this.selected.splice(index, 1);
                        }

                        this.totalArea = 0;
                        this.selected.forEach(element => {
                            let tmp = this.viewer.scene.objects[element];
                            tmp.colorize = undefined;
                            let distance = parseFloat(tmp.surfaceArea.toFixed(2));
                            this.totalArea += distance;

                            let span = document.createElement('span');
                            let br = document.createElement('br');
                            let copytext = distance + ' m²';

                            span.addEventListener('click', function() {
                                navigator.clipboard.writeText(copytext).then(() => {
                                    console.log('Text copied to clipboard:', copytext);
                                }).catch(err => {
                                    console.error('Failed to copy text:', err);
                                });
                            });
                            
                            span.className = 'clickable-span';
                            span.textContent = "•  " +  distance + ' m²';
                
                            measureObj.appendChild(span);
                            measureObj.appendChild(br);
                        });

                        if (spanTotal){
                            if (this.totalArea == 0){
                                spanTotal.textContent = "";
                                return;
                            }
                            spanTotal.textContent = "Total Area: " + this.totalArea.toFixed(2) + " m²";
                        }
                        return;

                    }
                   
                    if (!this.ctrlPressed){
                        for(let i = 0; i < this.selected.length; i++) {
                            annotations.destroyAnnotation([this.selected[i]]);
                            viewer.scene.objects[this.selected[i]].selected = false;
                            viewer.scene.objects[this.selected[i]].colorize = undefined;
                        }
                        this.selected = [];
                    }
                    this.selected.push(pickResult.entity.id);


                    this.totalArea = 0;
                    this.selected.forEach(element => {
                        let tmp = this.viewer.scene.objects[element];
                        tmp.colorize = undefined;
                        let distance = parseFloat(tmp.surfaceArea.toFixed(2));
                        this.totalArea += distance;

                        let span = document.createElement('span');
                        let br = document.createElement('br');
                        let copytext = distance + ' m²';

                        span.addEventListener('click', function() {
                            navigator.clipboard.writeText(copytext).then(() => {
                                console.log('Text copied to clipboard:', copytext);
                            }).catch(err => {
                                console.error('Failed to copy text:', err);
                            });
                        });
                        
                        span.className = 'clickable-span';
                        span.textContent = "•  " +  distance + ' m²';
            
                        measureObj.appendChild(span);
                        measureObj.appendChild(br);
                    });

                    if (spanTotal) {
                        spanTotal.textContent = "Total Area: " + this.totalArea.toFixed(2) + " m²";
                    }

                    if (this.selected.length > 1){
                        pickResult.entity.colorize = [1, 1, 0]; // RGB for highlight
                        //     pickResult.entity.scene.components['default.selectedMaterial']._state.fillColor = [1, 0, 0];
                        //     console.log(pickResult.entity.id);
                        //     console.log(pickResult.entity);
                        //     console.log(this.viewer.scene.objects["08f4t_E$rBBQFcvLzljACh"]);
                        //     this.viewer.scene.objects["08f4t_E$rBBQFcvLzljACh"].scene.components['default.selectedMaterial']._state.fillColor = [0, 0, 1];
                    }

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