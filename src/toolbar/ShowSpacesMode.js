import {Controller} from "../Controller.js";

/** @private */
class ShowSpacesMode extends Controller {

    constructor(parent, cfg) {
    
        super(parent, cfg);
        var changed = [];
        this.viewer;
    
        if (!cfg.buttonElement) {
            throw "Missing config: buttonElement";
        }
    
        this._buttonElement = cfg.buttonElement;
    
        this.on("enabled", (enabled) => {
            if (!enabled) {
                this._buttonElement.classList.add("disabled");
            } else {
                this._buttonElement.classList.remove("disabled");
            }
        });
    
        this.classTree = this.bimViewer._classesExplorer._treeView;
    
        this._buttonElement.addEventListener("click", (event) => {
            if (this.getEnabled()) {
                this.setActive(!this.getActive(), () => {
                });
    
                if (this.getActive()) {
                    
                    // CLASSES STATE
                    const classes = document.getElementsByClassName('xeokit-classes xeokit-tree-panel')[0].getElementsByTagName('input');
                    
                    const switchId = classes[0].id.replace('checkbox-', 'switch-');
                    const switchElement = document.getElementById(switchId);
                
                    if (switchElement && switchElement.classList.contains('plus')) {
                        this.classTree._expandSwitchElement(switchElement)
                    }
                    let ifcspace = '';
                    
                    Array.from(classes).forEach(function(input) {
                        if (input.type === 'checkbox' && !input.id.includes('IfcSpace')) {
                            if (input.checked) {
                                input.click();  
                                changed.push(input);
                            }
                        }
    
                        if (input.type === 'checkbox' && input.id.includes('IfcSpace')){
                            ifcspace = input;
                        }
                    });
    
                    if (ifcspace && !ifcspace.checked){
                        ifcspace.click();
                    }
                }
                else {
                    Array.from(changed).forEach(function(input) {
                        if (input.checked){
                            input.click();
                        }
                        input.click(); 
    
                    });
                    changed = [];
                }
    
            }
            event.preventDefault();
        });
    
        this.bimViewer.on("reset", () => {
            this.setActive(false); // IfcSpaces hidden by default
        });
    
        this.viewer.scene.on("modelLoaded", (modelId) => {
            if (!this._active) {
                const objectIds = this.viewer.metaScene.getObjectIDsByType("IfcSpace");
                this.viewer.scene.setObjectsCulled(objectIds, true);
            }
        });
        
        this._active = false;
        this._buttonElement.classList.remove("active");
    }
    
    setActive(active) {
        if (this._active === active) {
            return;
        }
        this._active = active;
        if (active) {
            this._buttonElement.classList.add("active");
            this._enterShowSpacesMode();
            this.fire("active", this._active);
        } else {
            this._buttonElement.classList.remove("active");
            this._exitShowSpacesMode();
            this.fire("active", this._active);
        }
    }
    
    _enterShowSpacesMode() {
        const viewer = this.viewer;
        const scene = viewer.scene;
        const metaScene = viewer.metaScene;
        const objectIds = metaScene.getObjectIDsByType("IfcSpace");
        scene.setObjectsCulled(objectIds, false);
    }
    
    _exitShowSpacesMode() {
        const viewer = this.viewer;
        const scene = viewer.scene;
        const metaScene = viewer.metaScene;
        const objectIds = metaScene.getObjectIDsByType("IfcSpace");
        scene.setObjectsCulled(objectIds, true);
    }
}

export {ShowSpacesMode};