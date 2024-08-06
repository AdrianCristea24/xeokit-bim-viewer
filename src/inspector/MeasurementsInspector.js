import {Controller} from "../Controller.js";

/** @private */
class MeasurementsInspector extends Controller {

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
    }

    showObjectPropertySets(objectId) {
        const metaObject = this.viewer.metaScene.metaObjects[objectId];
        if (!metaObject) {
            return;
        }
        const propertySets = metaObject.propertySets;
        if (propertySets && propertySets.length > 0) {
            this._setPropertySets(metaObject, propertySets);
        } else {
            this._setPropertySets(metaObject);
        }
        this._metaObject = metaObject;
    }

    clear() {
        const html = [],
        localizedText = this.viewer.localeService.translate('measurementsInspector.noObjectSelectedWarning') || 'No measurements.';
        html.push(`<div class="element-attributes">`);
        html.push(`<p class="xeokit-i18n subsubtitle no-object-selected-warning" data-xeokit-i18n="measurementsInspector.noObjectSelectedWarning">${localizedText}</p>`);
        html.push(`</div>`);
        const htmlStr = html.join("");
       this._propertiesElement.innerHTML = htmlStr;
    }

    _setPropertySets(metaObject, propertySets) {
        const html = [];
        console.log(metaObject);
        html.push(`<div class="element-attributes">`);
        html.push(`<p class="subsubtitle">No measurements</p>`);
       
        this._propertiesElement.innerHTML = html.join("");
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

function capitalizeFirstChar(str) {
    if (!str) {
        return str;
    }
   return str.charAt(0).toUpperCase() + str.slice(1);
}

export {MeasurementsInspector};