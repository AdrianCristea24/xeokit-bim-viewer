import {TreeViewPlugin, math} from "@xeokit/xeokit-sdk/dist/xeokit-sdk.es.js";
import {Controller} from "../Controller.js";
import {TreeViewContextMenu} from "../contextMenus/TreeViewContextMenu.js";

const tempVec3 = math.vec3();

/** @private */
class SearchExplorer extends Controller {

    constructor(parent, cfg = {}) {
        super(parent);
        this.highlighted = [];


        if (!cfg.searchTabElement) {
            throw "Missing config: searchTabElement";
        }

        if (!cfg.searchElement) {
            throw "Missing config: searchElement";
        }

        this._searchTabElement = cfg.searchTabElement;
        this._searchTabButtonElement = document.getElementById('searchContent');

        if (!this._searchTabButtonElement) {
            throw "Missing DOM element: .xeokit-tab-content";
        }

        cfg.searchElement;

        document.addEventListener('run', this._clickListener = (e) => {
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
    

    searchObject(word) {
        let historyIndex = this.highlighted.length;
        let freqMap = {};
        let found = false;
    
        for (const key in this.viewer.scene.objects) {
            let metadata = this.getObjectPropertySets(key);
            console.log(metadata.propertySets[0]);
            let entity = null;
            let entityId = null;

            if (key === word) { //ID
                entityId = key;
            } else if (metadata.name && metadata.name === word) { //Name
                entityId = metadata.id;
            } else if (metadata.parent && metadata.parent.name && metadata.parent.name.toLowerCase() === word.toLowerCase()) { // Class
                entityId = metadata.id;
            } else if (metadata.type && metadata.type.toLowerCase() === word.toLowerCase()) { // Type
                entityId = metadata.id;
            } else if (metadata.propertySets && Array.isArray(metadata.propertySets)) { // Referance From Metadata
                for (let i = 0; i < metadata.propertySets.length; i++) {
                    let propertySet = metadata.propertySets[i];
                    if (propertySet && Array.isArray(propertySet.properties)) {
                        for (let j = 0; j < propertySet.properties.length; j++) {
                            let property = propertySet.properties[j];
                            if (
                                property.name && 
                                property.name.toLowerCase() === 'reference' && 
                                property.value && 
                                property.value.toLowerCase() === word.toLowerCase()
                            ) {
                                entityId = metadata.id;
                                i = metadata.propertySets.length; // break outer loop
                                j = propertySet.properties.length; // break outer loop
                            }
                        }
                    }
                }
            }
    
            entity = this.viewer.scene.objects[entityId];
    
            if (entity && !freqMap[entityId]) {
                this.highlighted.push({
                    id: entity.id,
                    colorize: entity.colorize,
                    parent: word.replace(/\s+/g, ''),
                    name: metadata.name
                });
            
                entity.colorize = this.colorize;
            
                freqMap[entityId] = 1;
                found = true;
            }
        }
        this.drawElements(historyIndex);
        return found;
    }

    getObjectPropertySets(objectId) {
        const metaObject = this.viewer.metaScene.metaObjects[objectId];
        if (!metaObject) {
            return;
        }
        return metaObject;
    }

    _setPropertySets() {
        const html = [];
        html.push(`<div class="element-attributes">`);
        html.push(`
            <div>
                <label for="colorPickerHighlight">Highlight Color </label>
                <input type="color" id="colorPickerHighlight" name="colorPicker" value="#00ff00">
            </div>
            <br>
            <div>
                <label for="searchInput">Search</label>
                <input type="text" style="width: 200px" id="searchInput" placeholder="by Id,Name,Class,Type,Reference">
            </div><br>
            <div id="search-elements"></div>
        `);
        
        html.push(`</div>`);
        
        this._searchTabButtonElement.innerHTML = html.join("");
        
        const searchInput = document.getElementById('searchInput');
        const colorSelect = document.getElementById('colorPickerHighlight');
        this.updateSelectColor();
    
        if (searchInput) {
            searchInput.addEventListener('input', function() {
                const searchTerm = searchInput.value;

                if (typeof this.searchObject === 'function') {
                    if (this.searchObject(searchTerm)){
                        searchInput.value = '';
                        
                        // Trigger the green flash
                        searchInput.classList.add('green-flash');
        
                        // Remove the class after the animation ends (1s)
                        setTimeout(function() {
                            searchInput.classList.remove('green-flash');
                        }, 2000);
                    }
                } else {
                    console.warn('searchObject function is not defined.');
                }
            }.bind(this));

            colorSelect.addEventListener('change', function() {
                this.updateSelectColor();
                console.log('Selected color:', colorSelect.value);
            }.bind(this));
        } else {
            console.error('Search input element not found.');
        }
    }

    updateSelectColor() {
        const colorSelect = document.getElementById('colorPickerHighlight');
        colorSelect.style.backgroundColor = colorSelect.value;
        this.ColorHex = colorSelect.value;
        this.colorize = [
            parseInt(this.ColorHex.substring(1, 3), 16) / 255,
            parseInt(this.ColorHex.substring(3, 5), 16) / 255,
            parseInt(this.ColorHex.substring(5, 7), 16) / 255
        ];
        console.log(this.colorize);
    }

    drawElements(historyIndex = 0) {
        let htmlContainer = document.getElementById('element-container');
        let childCheckboxHTML = '';
        let parentEntity = null;
        if (!htmlContainer) {
            htmlContainer = document.createElement('div');
            htmlContainer.className = 'element-container';
            htmlContainer.id = 'container-container';
            document.getElementById('search-elements').appendChild(htmlContainer);
        }
    
        for (let i = historyIndex; i < this.highlighted.length; i++) {
            let entity = this.highlighted[i];

            if (!entity){
                continue;
            }

            if (entity.id == entity.parent) {
                var checkboxHTML = `
                    <div style="margin-left: 21px" id="container-${entity.id}">
                        <input type="checkbox" class="checkbox-${entity.id}" id="${this.colorize}" checked>
                        <label for="checkbox-${entity.id}">
                            <span class="element">${entity.id}</span>
                        </label>
                    </div>
                `;
                htmlContainer.innerHTML += checkboxHTML;
            }
            else {
                let entityContainer = document.getElementById(`container-${entity.parent}`);

                if (!entityContainer) {
                    if (entity.parent) {
                        console.log('make parent');
                        parentEntity = entity;
                        let checkboxHTML = `
                            <div id="container-${entity.parent}" class="container">
                                <a href="#" id="switch-tree-${entity.parent}" class="toggle-button minus" style="display: inline-flex; align-items: center; justify-content: center; width: 15px; height: 15px; background-color: white; color: black; border-radius: 50%; text-decoration: none; border: 1px solid black; font-size: 16px; font-weight: bold;">
                                    <span class="icon" style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;">
                                        <i class="fas fa-minus" style="margin: 0;"></i>
                                    </span>
                                </a>
                                <input type="checkbox" class="checkbox-${entity.parent}" id="checkbox-${entity.id}" checked>
                                <label for="checkbox-${entity.parent}">
                                    <span class="element">${entity.parent}</span>
                                </label>
                                <div id="children-${entity.parent}" class="children-container">
                                    <!-- Child elements will go here -->
                                </div>
                            </div>
                        `;
                        htmlContainer.innerHTML += checkboxHTML;
                
                        // Attach the event listener for the toggle anchor
                        const toggleAnchor = document.getElementById(`switch-tree-${entity.parent}`);
                        const childrenContainer = document.getElementById(`children-${entity.parent}`);
                        const iconSpan = toggleAnchor.querySelector('.icon i');
                
                        toggleAnchor.addEventListener('click', function (event) {
                            event.preventDefault(); // Prevent the default link behavior
                
                            const isExpanded = toggleAnchor.classList.contains('minus');
                
                            if (isExpanded) {
                                childrenContainer.style.display = 'none';
                                toggleAnchor.classList.remove('minus');
                                toggleAnchor.classList.add('plus');
                                iconSpan.classList.remove('fa-minus');
                                iconSpan.classList.add('fa-plus');
                            } else {
                                childrenContainer.style.display = 'block';
                                toggleAnchor.classList.remove('plus');
                                toggleAnchor.classList.add('minus');
                                iconSpan.classList.remove('fa-plus');
                                iconSpan.classList.add('fa-minus');
                            }
                        });
                    }
                }

                let parentContainer = document.getElementById(`children-${entity.parent}`);
                childCheckboxHTML += `
                    <div style="margin-left: 30px;">
                        <input type="checkbox" class="checkbox-${entity.id}" id="${this.colorize}" checked>
                        <label for="checkbox-${entity.id}">
                            <span class="element">${entity.name}</span>
                        </label>
                    </div>
                `;
            }
            
        }

        if (parentEntity){
            let parentContainer = document.getElementById(`children-${parentEntity.parent}`);
            parentContainer.innerHTML += childCheckboxHTML;
        }
        
        this._setupCheckboxListeners();

    }

    clear() {
        for(let i=0;i<this.highlighted.length; i++){
            let entityTmp = this.viewer.scene.objects[this.highlighted[i].id];
            entityTmp.colorize = undefined;
            this.highlighted.splice(i, 1);
        }
    }

    getFromArray(parent){
        var arr = [];
        for(let i=0;i<this.highlighted.length; i++){
            if (parent == this.highlighted[i].parent){
                arr.push(this.highlighted[i]);
            }
        }
        return arr;
    }

    setEnabledEntity(enabled, id) {
        let entityTmp = this.viewer.scene.objects[id];
        let checkboxes = document.getElementsByClassName(`checkbox-${entityTmp.id}`);

        for (let i = 0; i < checkboxes.length; i++) {
            if (!enabled) {
                entityTmp.colorize = undefined;
                checkboxes[i].checked = false;
            } else {
                entityTmp.colorize = checkboxes[i].id.split(',').map(parseFloat);
                checkboxes[i].checked = true;
            }
        }
    }

    setEnabledParent(enabled, parent) {
        let props = this.getFromArray(parent);
        for (let i = 0; i < props.length; i++) {
            let entityTmp = this.viewer.scene.objects[props[i].id];
            let checkboxes = document.getElementsByClassName(`checkbox-${entityTmp.id}`);

            for (let i = 0; i < checkboxes.length; i++) {
                if (!enabled) {
                    entityTmp.colorize = undefined;
                    checkboxes[i].checked = false;
                } else {
                    entityTmp.colorize = checkboxes[i].id.split(',').map(parseFloat);
                    checkboxes[i].checked = true;
                }
            }
        }
    }

    _setupCheckboxListeners() {
        this.viewer;
        let freqMap = {};
    
        for (let i = 0; i < this.highlighted.length; i++) {
            const entity = this.highlighted[i];
            const checkboxes = document.getElementsByClassName(`checkbox-${entity.id}`);
            const checkboxesParent = document.getElementsByClassName(`checkbox-${entity.parent}`);
            
            Array.from(checkboxes).forEach(checkbox => {
                if (checkbox) {
                    checkbox.addEventListener('change', function(event) {
                        if (!event.target.checked) {
                            this.setEnabledEntity(false, entity.id);
                        } else {
                            this.setEnabledEntity(true, entity.id);
                        }
                    }.bind(this));
                }
            });

            if (entity.id != entity.parent && !freqMap[entity.parent]) {
                Array.from(checkboxesParent).forEach(checkboxParent => {
                    if (checkboxParent) {
                        checkboxParent.addEventListener('change', function(event) {
                            if (!event.target.checked) {
                                this.setEnabledParent(false, entity.parent);
                            } else {
                                this.setEnabledParent(true, entity.parent);
                            }
                        }.bind(this));
                    }
                });
                freqMap[entity.parent] = 1;
            }
        }

    }


    destroy() {
        super.destroy();
        this._treeView.destroy();
        this._treeViewContextMenu.destroy();
        this.viewer.scene.off(this._onModelLoaded);
        this.viewer.scene.off(this._onModelUnloaded);
    }
}

export {SearchExplorer};
