import {Controller} from "../Controller.js";
import {ContextMenu, DistanceMeasurementsMouseControl, DistanceMeasurementsPlugin} from "@xeokit/xeokit-sdk";

/** @private */
export class MeasureDistanceTool extends Controller {

    constructor(parent, cfg) {

        super(parent);

        if (!cfg.buttonElement) {
            throw "Missing config: buttonElement";
        }

        const buttonElement = cfg.buttonElement;

        this._contextMenu = new ContextMenu({
            items: [
                [
                    {
                        getTitle: (context) => {
                            return context.measurement.axisVisible ? "Hide Measurement Axis" : "Show Measurement Axis";
                        },
                        doAction: function (context) {
                            context.measurement.axisVisible = !context.measurement.axisVisible;
                        }
                    },
                    {
                        getTitle: (context) => {
                            return context.measurement.labelsVisible ? "Hide Measurement Labels" : "Show Measurement Labels";
                        },
                        doAction: function (context) {
                            context.measurement.labelsVisible = !context.measurement.labelsVisible;
                        }
                    }
                ], [
                    {
                        title: "Delete Measurement",
                        doAction: function (context) {
                            context.measurement.destroy();
                        }
                    }
                ]
            ]
        });

        this._contextMenu.on("hidden", () => {
            if (this._contextMenu.context.measurement) {
                this._contextMenu.context.measurement.setHighlighted(false);
            }
        });

        this._distanceMeasurementsPlugin = new DistanceMeasurementsPlugin(this.viewer, {
            defaultAxisVisible: false,
            defaultLabelsOnWires : false
        });

        this._distanceMeasurementsPlugin.on("mouseOver", (e) => {
            e.measurement.setHighlighted(true);
        });

        this._distanceMeasurementsPlugin.on("mouseLeave", (e) => {
            if (this._contextMenu.shown && this._contextMenu.context.measurement.id === e.measurement.id) {
                return;
            }
            e.measurement.setHighlighted(false);
        });

        this._distanceMeasurementsPlugin.on("contextMenu", (e) => {
            this._contextMenu.context = { // Must set context before showing menu
                distanceMeasurementsPlugin: this._distanceMeasurementsPlugin,
                measurement: e.measurement
            };
            this._contextMenu.show(e.event.clientX, e.event.clientY);
            e.event.preventDefault();
        });

        this._distanceMeasurementsMouseControl = new DistanceMeasurementsMouseControl(this._distanceMeasurementsPlugin, {
            //   pointerLens : new PointerLens(viewer)
        })

        this._distanceMeasurementsMouseControl.snapping = true;

        this.on("enabled", (enabled) => {
            if (!enabled) {
                buttonElement.classList.add("disabled");
            } else {
                buttonElement.classList.remove("disabled");
            }
        });

        this.on("active", (active) => {
            if (active) {
                buttonElement.classList.add("active");
                this._distanceMeasurementsMouseControl.activate();
            } else {
                buttonElement.classList.remove("active");
                this._distanceMeasurementsMouseControl.deactivate();
            }
        });

        buttonElement.addEventListener("click", (event) => {
            if (this.getEnabled()) {
                const active = this.getActive();
                this.setActive(!active);
            }
            event.preventDefault();
        });

        this.bimViewer.on("reset", () => {
            this.setActive(false);
            this.clear();
        });

        this.measurementCanvasElement =  document.getElementById("xeokit-measurements");
        this.startUpdateLoop();
    }

    getNumMeasurements() {
        return Object.keys(this._distanceMeasurementsPlugin.measurements).length;
    }

    setMeasurementsAxisVisible(axisVisible) {
        this._distanceMeasurementsPlugin.setAxisVisible(axisVisible);
    }

    getMeasurementsAxisVisible() {
        return this._distanceMeasurementsPlugin.getAxisVisible();
    }

    setSnappingEnabled(snappingEnabled) {
        return this._distanceMeasurementsMouseControl.snapping = snappingEnabled;
    }

    getSnappingEnabled() {
        return this._distanceMeasurementsMouseControl.snapping;
    }

    clear() {
        this._distanceMeasurementsPlugin.clear();
    }

    destroy() {
        this._distanceMeasurementsPlugin.destroy();
        this._distanceMeasurementsMouseControl.destroy();
        this._contextMenu.destroy();
        super.destroy();
    }

    startUpdateLoop() {
        let started = false;
        let isToggle = false;
        setInterval(() => {
            this.dot = document.getElementsByClassName("viewer-ruler-label");
            
            if (this.dot.length > 0) { // Check if there are any elements in the collection
                started = true;
                this.setVisibleMeasureDetails(true);
                this.createTextOverlay();
    
                if (!isToggle){
                    this.bimViewer.fire("openInspector", {});
    
                    document.getElementById('inspector_toggle').checked = true;
                    let measurementsTab = document.getElementsByClassName("xeokit-measurementsTab")[0];
                    let propTab = document.getElementsByClassName("xeokit-propertiesTab")[0];
                    let optionsTab = document.getElementsByClassName("xeokit-optionsTab")[0];
    
                    if (measurementsTab) {
                        optionsTab.classList.remove('active');
                        measurementsTab.classList.add('active');
                        propTab.classList.remove('active');
                    }
    
                    isToggle = true;
                }
            }
            else if (started){
                started = false;
                this.createTextOverlay();
            }
        }, 200);
    }
    setVisibleMeasureDetails(visible = true) {
        if (!this.measurementCanvasElement) {
            return;
        }
        this.measurementCanvasElement.style.visibility = visible ? "visible" : "hidden";
    }

    createTextOverlay() {

        // Create a div element for the text panel
        var measureObj = document.getElementById("textOverlay") ?? null;
        if (!measureObj){
            this._textOverlayElement = document.createElement('span');
            this._textOverlayElement.id = 'textOverlay';
            this._textOverlayElement.className = 'xeokit-btn-group-measure';

            const container = this.measurementCanvasElement;

            if (container) {
                container.appendChild(this._textOverlayElement);
            } else {
                console.error("Canvas container is not defined.");
            }
            measureObj = document.getElementById("textOverlay");
        }

        measureObj.innerHTML = '';
        let spanTotal = document.createElement('span');
        spanTotal.textContent = '';
        spanTotal.className = 'spanTotal';
        spanTotal.id = 'spanTotal';
        measureObj.appendChild(spanTotal);

        var allMeasures = document.getElementsByClassName("viewer-ruler-label");

        let sum = 0;
        let unit = 'm';
        for (let i = 0; i < allMeasures.length; i += 4) {
            // Create a new span element for the display of the measure lenght
            let span = document.createElement('span');
            let br = document.createElement('br');
            let text = allMeasures[i].innerHTML;
            let distance = parseFloat(this.extractFloatFromString(text).toFixed(2));

            if (text[text.length - 1] == 'm'){
                unit = text[text.length - 1];
                sum += distance;
                let copytext = distance + unit;

                span.addEventListener('click', function() {
                    navigator.clipboard.writeText(copytext).then(() => {
                        console.log('Text copied to clipboard:', copytext);
                    }).catch(err => {
                        console.error('Failed to copy text:', err);
                    });
                });
                
                span.className = 'clickable-span';
                span.textContent = "•  " +  distance + unit;
    
                measureObj.appendChild(span);
                measureObj.appendChild(br);
            }
        }

        if (sum != 0){
            spanTotal.textContent = "Total: " + sum.toFixed(2) + unit;
            document.getElementById('nomeasuretext').innerHTML = '';
        }
    }


    extractFloatFromString(input) {
        // Regular expression to match a floating-point number
        const floatRegex = /[-+]?[0-9]*\.?[0-9]+/;
        
        // Extract the number from the input string
        const match = input.match(floatRegex);
        
        // Convert the matched string to a float and return it
        return match ? parseFloat(match[0]) : 0;
    }
    

}