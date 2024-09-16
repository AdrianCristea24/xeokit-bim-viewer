import {Controller} from "../Controller.js";

/** @private */
class OptionsInspector extends Controller {

    constructor(parent, cfg = {}) {

        super(parent);

        if (!cfg.propertiesTabElement) {
            throw "Missing config: propertiesTabElement";
        }

        if (!cfg.propertiesElement) {
            throw "Missing config: propertiesElement";
        }

        this._metaObject = null;

        this._propertiesTabElement = cfg.propertiesTabElement;
        this._propertiesElement = cfg.propertiesElement;
        this._propertiesTabButtonElement = this._propertiesTabElement.querySelector(".xeokit-tab-btn");

        if (!this._propertiesTabButtonElement) {
            throw "Missing DOM element: ,xeokit-tab-btn";
        }

        this._onModelUnloaded = this.viewer.scene.on("modelUnloaded", (modelId) => {
            if (this._metaObject) {
                const metaModels = this._metaObject.metaModels;
                for (let i = 0, len = metaModels.length; i < len; i++) {
                    if (metaModels[i].id === modelId) {
                        this.clear();
                        return;
                    }
                }
            }
        });

        this.bimViewer.on("reset", () => {
            this.clear();
        });

        document.addEventListener('click', this._clickListener = (e) => {
            if (!e.target.matches('.xeokit-accordion .xeokit-accordion-button')) {
                return;
            } else {
                if (!e.target.parentElement.classList.contains('active')) {
                    e.target.parentElement.classList.add('active');
                } else {
                    e.target.parentElement.classList.remove('active');
                }
            }
        });

        this.clear();
        this._setPropertySets();
    }

    clear() {
        const html = [],
        localizedText = this.viewer.localeService.translate('OptionsInspector.noObjectSelectedWarning') || 'No measurements.';
        html.push(`<div class="element-attributes">`);
        html.push(`<p class="xeokit-i18n subsubtitle no-object-selected-warning" data-xeokit-i18n="OptionsInspector.noObjectSelectedWarning">${localizedText}</p>`);
        html.push(`</div>`);
        const htmlStr = html.join("");
       this._propertiesElement.innerHTML = htmlStr;
    }

    _setPropertySets() {
        const viewer = this.viewer;

        const html = [];
        html.push(`<div class="element-attributes">`);
        html.push(`<p class="subsubtitle">Custom Settings</p>`);
        
        // Add checkbox for "Show m2" with default checked
        html.push(`
            <div>
                <input type="checkbox" id="showM2" name="showM2" value="showM2" checked>
                <label for="showM2">Show m² for selected objects</label>
            </div>
        `);
    
        // Add checkbox for "Render 2D/3D Lines always" with default checked
        html.push(`
            <div>
                <input type="checkbox" id="renderLines" name="renderLines" value="renderLines" checked>
                <label for="renderLines">Render 2D/3D lines always</label>
            </div>
        `);

        html.push(`
            <div>
                <label for="colorPicker">Select Background Color:</label>
                <input type="color" id="colorPicker" name="colorPicker" value="#424242">
            </div>
        `);

        html.push(`</div>`);
        
        this._propertiesElement.innerHTML = html.join("");
        
        // Set up event listeners after the elements are added to the DOM
        const showM2Checkbox = document.getElementById('showM2');
        const renderLinesCheckbox = document.getElementById('renderLines');
        const colorPicker = document.getElementById('colorPicker');
    
        colorPicker.addEventListener('change', function(event) {
            var hexColor = event.target.value;

            hexColor = hexColor.replace(/^#/, '');

            // Convert the hex values to integers and normalize them
            const r = parseInt(hexColor.substring(0, 2), 16) / 255;
            const g = parseInt(hexColor.substring(2, 4), 16) / 255;
            const b = parseInt(hexColor.substring(4, 6), 16) / 255;

            console.log('Selected color as normalized RGB array:', [r, g, b]);
            viewer.scene.canvas.backgroundColor = [r, g, b]; 
        });
    
        showM2Checkbox.addEventListener('change', function() {
            console.log('Show m2:', this.checked);
            viewer.scene._renderer.setCreateAnno(this.checked);
        });
    
        renderLinesCheckbox.addEventListener('change', function() {
            console.log('Render 2D/3D Lines always:', this.checked);
            viewer.scene._renderer.setRenderAll(this.checked);
        });
    }

    setEnabled(enabled) {
        if (!enabled) {
            this._propertiesTabButtonElement.classList.add("disabled");
        } else {
            this._propertiesTabButtonElement.classList.remove("disabled");
        }
    }

    destroy() {
        super.destroy();
        this.viewer.scene.off(this._onModelLoaded);
        this.viewer.scene.off(this._onModelUnloaded);
        document.removeEventListener('click', this._clickListener);
    }
}

export {OptionsInspector};
