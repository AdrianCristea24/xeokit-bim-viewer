import {TreeViewPlugin, math} from "@xeokit/xeokit-sdk/dist/xeokit-sdk.es.js";
import {Controller} from "../Controller.js";
import {TreeViewContextMenu} from "../contextMenus/TreeViewContextMenu.js";

const tempVec3 = math.vec3();

/** @private */
class SearchExplorer extends Controller {

    constructor(parent, cfg = {}) {
        super(parent);
        this.highlighted = [];
        this.expended = [];


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

    chnageClassesState(word, visible = true) {

        const parts = word.split('-');
        const identifier = parts.pop();
        //console.log(identifier);
    
        for (const key in this.viewer.scene.objects) {
            let metadata = this.getObjectPropertySets(key);
            let entity = null;
            let entityId = null;

            if (key === identifier) { //ID
                entityId = identifier;
                entity = this.viewer.scene.objects[entityId];
                entity.visible = visible;
                return;
            } else if (metadata.type && metadata.type.toLowerCase() === identifier.toLowerCase()) { // Class
                entityId = metadata.id;
            }

            entity = this.viewer.scene.objects[entityId];

            if (entity){
                console.log('found it');
                entity.visible = visible;
            }
        }

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

    getProjectName(){
        let projectId = new URLSearchParams(window.location.search).get('projectId') ?? 0;
    
        if (!projectId){
            const regex = /\/projects\/([^\/]+)/;
            const match = window.location.href.match(regex);
        
            projectId = match && match[1] ? match[1] : 'adrian';
        }
    
        console.log(projectId); 
        return projectId;
    }

    loadButtonsView(){
        const localFavs = document.getElementById('localFavsViews');
        const projectId = new URLSearchParams(window.location.search).get('projectId');
        localFavs.innerHTML = '';

        if (projectId) {
            const savedProjects = JSON.parse(localStorage.getItem('views-' + projectId)) || [];

            savedProjects.forEach((save, index) => {
                // Create a container div for each project
                const projectContainer = document.createElement('div');
                projectContainer.className = 'project-container';
            
                // Create a button for the project name
                const button = document.createElement('button');
                button.className = 'load-button';
                button.textContent = save.name;
            
                // Create an img element for the project screenshot
                const img = document.createElement('img');
                img.className = 'project-screenshot';
            
                // Check if the screenshot exists and is a valid base64 string
                if (save.screenshot) {
                    img.src = save.screenshot;  // Set the screenshot as the image source
                } else {
                    img.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAAgAAADAAAAAElEQVR42mP8//8/AwAB/AF0KCcAI/9U+QzIAAAABJRU5ErkJggg==';
                }
            
                // Add click event to the button
                button.addEventListener('click', function() {
                    bimViewer._searchExplorer.setCurrentView(save)
                });

                button.addEventListener('contextmenu', function(event) {
                    event.preventDefault();
                
                    // Remove existing context menu if any
                    const existingContextMenu = document.querySelector('.context-menu');
                    if (existingContextMenu) {
                        existingContextMenu.remove();
                    }
                
                    const contextMenu = document.createElement('div');
                    contextMenu.className = 'context-menu';
                    contextMenu.style.position = 'absolute';
                    contextMenu.style.top = `${event.pageY}px`;
                    contextMenu.style.left = `${event.pageX}px`;
                    contextMenu.style.background = '#fff';
                    contextMenu.style.border = '1px solid #ccc';
                    contextMenu.style.padding = '10px';
                    contextMenu.style.zIndex = '1000';
                
                    const deleteOption = document.createElement('div');
                    deleteOption.textContent = 'Delete';
                    deleteOption.style.cursor = 'pointer';
                
                    // Delete option event
                    deleteOption.addEventListener('click', function() {
                        let saves = JSON.parse(localStorage.getItem('views-' + projectId)) || [];
                        let updatedProjects = saves.filter(savedProject => savedProject.name !== button.innerHTML);
                
                        localStorage.setItem('views-' + projectId, JSON.stringify(updatedProjects));
                        
                        bimViewer._searchExplorer.loadButtonsView();
    
                        document.body.removeChild(contextMenu);
                        button.remove(); 
                    });
                
                    contextMenu.appendChild(deleteOption);
                    document.body.appendChild(contextMenu);
                
                    document.addEventListener('click', function closeContextMenu() {
                        const contextMenus = document.querySelectorAll('.context-menu');
                        contextMenus.forEach(menu => menu.remove());
                        document.removeEventListener('click', closeContextMenu);
                    }, { once: true });
                });
            
                // Append the button and image to the project container
                projectContainer.appendChild(img);
                projectContainer.appendChild(button);
            
                // Append the project container to the localFavs (assuming it's a div or similar container)
                localFavs.appendChild(projectContainer);
            });

        }


    }

    _setPropertySets() {
        const html = [];
        html.push(`<div class="element-attributes">`);
        html.push(`
            <div>
                <span id="highlightLabel" style="color: gray">Highlight</span>
                <label class="switch">
                    <input type="checkbox" id="toggleDiv" checked>
                    <span class="slider round"></span>
                </label>
                <span id="viewsLabel" style="color: white">Views</span>
            </div>
            <br>

            <div id="searchView" style="display: none">

                
                <div id="localFavs" style="display: none;"></div>

                <div id="colorPickerContainer">
                    <label for="colorPickerHighlight">Highlight Color </label>
                    <input type="color" id="colorPickerHighlight" name="colorPicker" value="#7CD644">
                </div>
                <br>
                <div style="display: flex; align-items: center;">
                    <label for="searchInput" style="margin-right: 10px;">Search</label>
                    <input type="text" style="width: 225px; margin-right: 10px;" id="searchInput" placeholder="by Id,Name,Class,Type,Reference">
                    
                    <div class="icon-container">
                        <svg id="savedSelections" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24px" height="24px" style="display: block; cursor: pointer;">
                            <path d="M20 4h-4.23l-1.39-2.78A1 1 0 0 0 14.5 1h-5a1 1 0 0 0-.88.5L7.23 4H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zM12 4l1.25 2.5h-2.5L12 4zm-6 2h12v2H6V6zm12 14H6v-2h12v2zm0-4H6v-2h12v2zm0-4H6v-2h12v2z"/>
                        </svg>
                        <div class="tooltip">View Favorites</div>
                    </div>

                    <svg id="favoriteButton" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="yellow" width="24px" height="24px" style="display: none; cursor: pointer;">
                        <path d="M12 17.27L18.18 21 16.54 13.97 22 9.24 14.81 8.63 12 2 9.19 8.63 2 9.24 7.46 13.97 5.82 21z"/>
                    </svg>
                </div>
                <br>


                <!-- Modal for save name input -->
                <div id="saveModal" style="display:none;">
                    <div class="modal-content">
                        <label for="saveHighlightInput">Enter name for save:</label>
                        <input type="text" id="saveHighlightInput" class="modal-input" placeholder="Save Name">
                        <br><br>
                        <div class="modal-buttons">
                            <button id="confirmSaveButton" class="button confirm">Save</button>
                            <button id="cancelButton" class="button cancel">Cancel</button>
                        </div>
                    </div>
                </div>

                <div id="search-elements"></div>

            </div>

            <div id="viewsView">
                <button class="ViewButtons" id="saveView"> Save View </button>
               
                <div id="localFavsViews">
                
                </div>

                <!-- Modal for save name input -->
                <div id="saveModalView" style="display:none;">
                    <div class="modal-content">
                        <label for="saveViewInput">Enter name for save:</label>
                        <input type="text" id="saveViewInput" class="modal-input" placeholder="View Name">
                        <br><br>
                        <div class="modal-buttons">
                            <button id="confirmSaveButtonView" class="button confirm">Save</button>
                            <button id="cancelButtonView" class="button cancel">Cancel</button>
                        </div>
                    </div>

                </div>

            </div>
        `);

        html.push(`</div>`);
        this._searchTabButtonElement.innerHTML = html.join("");


        const favoriteButton = document.getElementById('favoriteButton');
        const saveModal = document.getElementById('saveModal');
        const confirmSaveButton = document.getElementById('confirmSaveButton');
        const confirmSaveButtonView = document.getElementById('confirmSaveButtonView');
        const saveModalView = document.getElementById('saveModalView');
        const cancelButton = document.getElementById('cancelButton');
        const cancelButtonView = document.getElementById('cancelButtonView');
        const saveHighlightInput = document.getElementById('saveHighlightInput');
        const saveViewInput = document.getElementById('saveViewInput');

        const searchItems = document.getElementById('search-elements');

        const toggleDiv = document.getElementById('toggleDiv');
        const searchView = document.getElementById('searchView');
        const viewsView = document.getElementById('viewsView');

        const saveView = document.getElementById('saveView');

        const highlightLabel = document.getElementById('highlightLabel');
        const viewsLabel = document.getElementById('viewsLabel');

        const localFavs = document.getElementById('localFavs');
        const localFavsViews = document.getElementById('localFavsViews');


        const projectId = new URLSearchParams(window.location.search).get('projectId');

        document.getElementById('savedSelections').addEventListener('click', function() {
            const localFavsContainer = document.getElementById('localFavs');
            
            // Toggle the visibility of the localFavs container
            if (localFavsContainer.style.display === 'none' || localFavsContainer.style.display === '') {
                localFavsContainer.style.display = 'block';
            } else {
                localFavsContainer.style.display = 'none';
            }
        });

        if (projectId) {
            const saves = JSON.parse(localStorage.getItem(projectId)) || [];
            localFavs.innerHTML = ''; // Clear previous content

            localFavs.addEventListener('click', function() {
                localFavs.style.display = 'none';
            });

            this.loadButtonsHighlight(localFavs, saves);
            
        } else {
            console.error('No project ID found in the URL.');
        }

        saveView.addEventListener('click', function() {
            saveModalView.style.display = 'block';

        });
        
        toggleDiv.addEventListener('change', function(event) {
            const isEnabled = event.target.checked;
    
            if (isEnabled) {
                highlightLabel.style.color = 'gray';
                viewsLabel.style.color = 'white';

                viewsView.style.display = 'block';
                searchView.style.display = 'none';
            } else {
                highlightLabel.style.color = 'white';
                viewsLabel.style.color = 'gray';

                viewsView.style.display = 'none';
                searchView.style.display = 'block';
            }
        }.bind(this));  


        favoriteButton.addEventListener('click', function() {
            saveModal.style.display = 'block';
        }.bind(this));  

        confirmSaveButton.addEventListener('click', function() {
            const saveName = saveHighlightInput.value;
            const items = searchItems.innerHTML;
            const projectId = new URLSearchParams(window.location.search).get('projectId');
    
            if (!saveName) {
                alert('Please enter a name for the save.');
                return;
            }
    
            if (!projectId) {
                alert('No project ID found in the URL.');
                return;
            }
    

            // Screenshot process
            const viewer = bimViewer.viewer;  // Assuming the viewer is accessible via bimViewer.viewer
            const canvasElement = viewer.scene.canvas.canvas;  // Access the canvas element

            // Get the aspect ratio of the canvas
            const aspect = canvasElement.height / canvasElement.width;

            // Set desired width and height for the screenshot
            const width = 200;  // Set your desired width
            const height = Math.floor(width * aspect);  // Calculate the corresponding height to maintain aspect ratio

            // Capture screenshot using viewer.getSnapshot()
            const imageData = viewer.getSnapshot({
                format: "png",
                width: width,
                height: height
            });

            const newSave = {
                name: saveName,
                content: items,
                screenshot: imageData
            };
            
            let savedProjects = JSON.parse(localStorage.getItem(projectId)) || [];

            savedProjects.push(newSave);
            localStorage.setItem(projectId, JSON.stringify(savedProjects));
            savedProjects = JSON.parse(localStorage.getItem(projectId)) || [];
            
            bimViewer._searchExplorer.loadButtonsHighlight(localFavs, savedProjects);

            saveModal.style.display = 'none'; 
            saveHighlightInput.value = '';
        }.bind(this));  

        confirmSaveButtonView.addEventListener('click', function() {
            
            const projectId = new URLSearchParams(window.location.search).get('projectId');
            let saveName = saveViewInput.value;

            if (!saveName) {
                alert('Please enter a name for the save.');
                return;
            }
    
            if (!projectId) {
                alert('No project ID found in the URL.');
                return;
            }

            let fullState = bimViewer._searchExplorer.getCurrentView();
            fullState.name = saveName;

            // Screenshot process
            const viewer = bimViewer.viewer;  // Assuming the viewer is accessible via bimViewer.viewer
            const canvasElement = viewer.scene.canvas.canvas;  // Access the canvas element

            // Get the aspect ratio of the canvas
            const aspect = canvasElement.height / canvasElement.width;

            // Set desired width and height for the screenshot
            const width = 200;  // Set your desired width
            const height = Math.floor(width * aspect);  // Calculate the corresponding height to maintain aspect ratio

            // Capture screenshot using viewer.getSnapshot()
            const imageData = viewer.getSnapshot({
                format: "png",
                width: width,
                height: height
            });

            // Add the screenshot to the fullState object as a base64 string
            fullState.screenshot = imageData;  // This will be a Base64 PNG image

            // Log the fullState object
            console.log(fullState);

    
            let savedViews = JSON.parse(localStorage.getItem('views-' + projectId)) || [];
    
            savedViews.push(fullState);
            localStorage.setItem('views-' + projectId, JSON.stringify(savedViews));
            
            bimViewer._searchExplorer.loadButtonsView();

            saveModalView.style.display = 'none';
            saveViewInput.value = '';
        }.bind(this));

        cancelButton.addEventListener('click', function() {
            saveModal.style.display = 'none';
            saveHighlightInput.value = '';
        }.bind(this));

        cancelButtonView.addEventListener('click', function() {
            saveModalView.style.display = 'none';
            saveViewInput.value = '';  
        }.bind(this));

        const searchInput = document.getElementById('searchInput');
        const colorSelect = document.getElementById('colorPickerHighlight');
        this.updateSelectColor();
        this.loadButtonsView();

    
        if (searchInput) {
            searchInput.addEventListener('input', function() {
                const searchTerm = searchInput.value;

                if (typeof this.searchObject === 'function') {
                    if (this.searchObject(searchTerm)){
                        searchInput.value = '';
                        
                        // Trigger the green flash
                        searchInput.classList.add('green-flash');
        
                        // Remove the class after the animation ends (1s)
                        document.getElementById('favoriteButton').style.display = 'block';

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

    getCurrentView() {
        // CAMERA STATE
        const camera = this.bimViewer.viewer.scene.camera;
        let cameraState = {
            eye: camera._eye,
            look: camera._look,
            up: camera._up
        };
    
        // Function to toggle parent elements (if closed) and get the checkbox state
        const getElementState = (checkboxId) => {
            let switchId = checkboxId.replace('checkbox', 'switch');
            document.getElementById(switchId);
        
            let checkboxElement = document.getElementById(checkboxId);
        
            let checkboxState = null;
            if (checkboxElement) {
                checkboxState = {
                    id: checkboxElement.id,
                    checked: checkboxElement.checked
                };
            }
    
            return checkboxState;
        };
        // MODELS STATE
        let modelState = [];
        this.expended = [];
        let modelTree = this.bimViewer._modelsExplorer._treeView;
        let modelArr = document.getElementsByClassName('xeokit-form-check');
    
        for(let i=0; i<modelArr.length; i++){
            let model = modelArr[i].getElementsByTagName('input')[0];
            const modelInfo = getElementState(model.id);
            if (modelInfo) {
                modelState.push(modelInfo);
            }
        }
    
        // STOREYS STATE
        let storeysState = [];
        this.expended = [];
        let storeysTree = this.bimViewer._storeysExplorer._treeView;
    
        const storeys = document.getElementsByClassName('xeokit-storeys xeokit-tree-panel')[0].getElementsByTagName('input');
        this.processStateAndExpand(storeys, storeysTree);
    
        Array.from(storeys).forEach(storey => {
            const storeyInfo = getElementState(storey.id);
            if (storeyInfo) {
                storeysState.push(storeyInfo);
            }
        });
        this.collapseParents(this.expended, storeysTree);
    
    
        // CLASSES STATE
        let classesState = [];
        this.expended = [];
        let classTree = this.bimViewer._classesExplorer._treeView;
    
        const classes = document.getElementsByClassName('xeokit-classes xeokit-tree-panel')[0].getElementsByTagName('input');
        this.processStateAndExpand(classes, classTree);
        
        Array.from(classes).forEach(classItem => {
            const classInfo = getElementState(classItem.id);
            if (classInfo) {
                classesState.push(classInfo);
            }
        });
        this.collapseParents(this.expended, classTree);
    
    
        // OBJECTS STATE
        let objectsState = [];
        this.expended = [];
        let objectTree = this.bimViewer._objectsExplorer._treeView;
    
        const objects = document.getElementsByClassName('xeokit-objects xeokit-tree-panel')[0].getElementsByTagName('input');
        this.processStateAndExpand(objects, objectTree);
    
        Array.from(objects).forEach(objectItem => {
            const objectInfo = getElementState(objectItem.id);
            if (objectInfo) {
                objectsState.push(objectInfo);
            }
        });
        this.collapseParents(this.expended, objectTree);
    
    
        // Combine all states into a bigger object
        const fullState = {
            cameraState: cameraState,
            modelsState: modelState,
            storeysState: storeysState,
            classesState: classesState,
            objectsState: objectsState
        };
    
        return fullState;
    }
    
    setCurrentView(fullState) {
        // Process Models state
        this.expended = [];
        let modelsTree = this.bimViewer._modelsExplorer._treeView;
    
        if (fullState.modelsState[0]){
            this.bimViewer._modelsExplorer.unloadAllModels();
    
            fullState.modelsState.forEach(model => {
                const target = document.getElementById(model.id);
    
                if (model.checked) {
    
                    this.bimViewer._modelsExplorer.loadModel(model.id,
                    () => { // Done
                        console.log('done load');
                        // Process storeys state
                        this.expended = [];
                        let storeyTree = this.bimViewer._storeysExplorer._treeView;
                    
                        this.processStateAndExpand(fullState.storeysState, storeyTree);
                        fullState.storeysState.forEach(storey => {
                            const target = document.getElementById(storey.id);
                            if (target) {
                                storeyTree._changeStructure(target, storey.checked);
                            }
                        });
                        this.collapseParents(this.expended, storeyTree);
                    
                        // Process objects state
                        this.expended = [];
                        let objectTree = this.bimViewer._objectsExplorer._treeView;
                        this.processStateAndExpand(fullState.objectsState, objectTree);
                        fullState.objectsState.forEach(object => {
                            const target = document.getElementById(object.id);
                            if (target) {
                                objectTree._changeStructure(target, object.checked);
                            }
                        });
                        this.collapseParents(this.expended, objectTree);
                    
                        // Process classes state
                        fullState.classesState.forEach(classObj => {
                            if (classObj.id && !classObj.checked) {
                                this.chnageClassesState(classObj.id, classObj.checked);
                            }
                        });
                        console.log('show camera');
                        // Update the camera state
                        this.bimViewer.viewer.scene.camera.eye = [fullState.cameraState.eye[0], fullState.cameraState.eye[1], fullState.cameraState.eye[2]];
                        this.bimViewer.viewer.scene.camera.look = [fullState.cameraState.look[0], fullState.cameraState.look[1], fullState.cameraState.look[2]];
                        this.bimViewer.viewer.scene.camera.up = [fullState.cameraState.up[0], fullState.cameraState.up[1], fullState.cameraState.up[2]];
                    },
                    () => { // Error - recover and attempt to load next model
                        console.log('error load');
                    });
    
                }
               
            });
        }
    
    }

    loadButtonsHighlight(localFavs,saves) {
        const projectId = this.getProjectName();
        localFavs.innerHTML = '';
    
        saves.forEach(save => {
            // Create a container div for each project
            const projectContainer = document.createElement('div');
            projectContainer.className = 'project-container';
        
            // Create a button for the project name
            const button = document.createElement('button');
            button.className = 'load-button';
            button.textContent = save.name;
        
            // Create an img element for the project screenshot
            const img = document.createElement('img');
            img.className = 'project-screenshot';
            img.style.border = "2px solid #7CD644";
        
            // Check if the screenshot exists and is a valid base64 string
            if (save.screenshot) {
                img.src = save.screenshot;  // Set the screenshot as the image source
            } else {
                img.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAAgAAADAAAAAElEQVR42mP8//8/AwAB/AF0KCcAI/9U+QzIAAAABJRU5ErkJggg==';
            }
        
    
            const viewer = this.viewer;
            button.addEventListener('click', function() {
                let freqMap = {};
    
                document.getElementById('search-elements').innerHTML = save.content;
    
                for (const key in viewer.scene.objects) {
                    viewer.scene.objects[key].colorize = undefined;
                }
    
                // Reattach event listeners for trash
                const trashIcons = document.getElementsByClassName('trash-icon');
                Array.from(trashIcons).forEach(trashIcon => {
                    let idEntity = trashIcon.id.replace('trash-', '');
                    let container = document.getElementById(`container-${idEntity}`);
    
                    trashIcon.addEventListener('click', function(event) {
                        event.preventDefault();
    
                        const childCheckboxes = container.querySelectorAll('input[type="checkbox"]');
                        childCheckboxes.forEach(childCheckbox => {
                            if (childCheckbox.name == "single"){
                                const childId = childCheckbox.className.replace('checkbox-', ''); 
                                viewer.scene.objects[childId].colorize = undefined;
                            }
                        });
    
                        if (container) {
                            container.remove();
                        }
    
                        if (document.getElementById('container-container').getElementsByTagName('div').length == 0){
                            document.getElementById('favoriteButton').style.display = 'none';
                        }
                    });
    
                    let toggleAnchor = document.getElementById(`switch-tree-${idEntity}`);
                    let parentItem = document.getElementsByClassName(`checkbox-${idEntity}`)[0];
    
                    if (toggleAnchor){
                        let childrenContainer = document.getElementById(`children-${idEntity}`);
                        let chidDiv = childrenContainer.getElementsByTagName('div');
                        let iconSpan = toggleAnchor.querySelector('.icon i');
    
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
    
                        if (parentItem) {
                            if (parentItem.name == 'parent') {
                                parentItem.addEventListener('change', (event) => {
                                    let checked = true;
                                    if (!event.target.checked) {
                                        checked = false;
                                    }
    
                                    let props = chidDiv; 
    
                                    for (let i = 0; i < props.length; i++) {
                                        let input = props[i].getElementsByTagName('input')[0];
                                        let idEntity = input.className.replace('checkbox-', '');
    
                                        if(input){
                                            let entityTmp = viewer.scene.objects[idEntity];
                                            let checkboxes = document.getElementsByClassName(`checkbox-${entityTmp.id}`);
    
                                            for (let i = 0; i < checkboxes.length; i++) {
                                                if (!checked) {
                                                    entityTmp.colorize = undefined;
                                                    checkboxes[i].checked = false;
                                                } else {
                                                    entityTmp.colorize = checkboxes[i].id.split(',').map(parseFloat);
                                                    checkboxes[i].checked = true;
                                                }
                                            }
                                        }
                                    }
    
                                });
                            }
                        }
    
                    }
    
                    let checkbox = container.getElementsByTagName('input')[0];
                    const checkboxes = document.getElementsByClassName(checkbox.className);
                    
                    if (!freqMap[idEntity]) {
                        Array.from(checkboxes).forEach(checkboxItem => {
                            if (checkboxItem) {
                                let entityTmp = viewer.scene.objects[idEntity];
                                
                                if (checkboxItem.name == 'single') {
                                    entityTmp.colorize = checkboxItem.id.split(',').map(parseFloat);
                                    checkboxItem.addEventListener('change', (event) => {
                                        let checked = true;
                                        if (!event.target.checked) {
                                            checked = false;
                                        }
    
                                        let checkboxes = document.getElementsByClassName(`checkbox-${idEntity}`);
    
                                        for (let i = 0; i < checkboxes.length; i++) {
                                            if (!checked) {
                                                entityTmp.colorize = undefined;
                                                checkboxes[i].checked = false;
                                            } else {
                                                entityTmp.colorize = checkboxes[i].id.split(',').map(parseFloat);
                                                checkboxes[i].checked = true;
                                            }
                                        }
    
                                    });
                                }
                                else {
                                    let childrenContainer = document.getElementById(`children-${idEntity}`);
                                    let chidDiv = childrenContainer.getElementsByTagName('div');
                                    let props = chidDiv; 
    
                                    for (let i = 0; i < props.length; i++) {
                                        let checkboxItem = props[i].getElementsByTagName('input')[0];
                                        let idEntity = checkboxItem.className.replace('checkbox-', '');
                                        let entityTmp = viewer.scene.objects[idEntity];
                                        entityTmp.colorize = checkboxItem.id.split(',').map(parseFloat);
    
                                        checkboxItem.addEventListener('change', (event) => {
                                            let checked = true;
                                            if (!event.target.checked) {
                                                checked = false;
                                            }
    
                                            let checkboxes = document.getElementsByClassName(`checkbox-${idEntity}`);
    
                                            for (let i = 0; i < checkboxes.length; i++) {
                                                if (!checked) {
                                                    entityTmp.colorize = undefined;
                                                    checkboxes[i].checked = false;
                                                } else {
                                                    entityTmp.colorize = checkboxes[i].id.split(',').map(parseFloat);
                                                    checkboxes[i].checked = true;
                                                }
                                            }
    
                                        });
    
                                    }
                                }
                            }
                        });
                        freqMap[idEntity] = 1;
                    }
                });
    
    
            });
            const bimViewer = this.bimViewer;
    
            button.addEventListener('contextmenu', function(event) {
                event.preventDefault();
            
                // Remove existing context menu if any
                const existingContextMenu = document.querySelector('.context-menu');
                if (existingContextMenu) {
                    existingContextMenu.remove();
                }
            
                const contextMenu = document.createElement('div');
                contextMenu.className = 'context-menu';
                contextMenu.style.position = 'absolute';
                contextMenu.style.top = `${event.pageY}px`;
                contextMenu.style.left = `${event.pageX}px`;
                contextMenu.style.background = '#fff';
                contextMenu.style.border = '1px solid #ccc';
                contextMenu.style.padding = '10px';
                contextMenu.style.zIndex = '1000';
            
                const deleteOption = document.createElement('div');
                deleteOption.textContent = 'Delete';
                deleteOption.style.cursor = 'pointer';
            
                // Delete option event
                const bimV = bimViewer;
                deleteOption.addEventListener('click', function() {
                    let saves = JSON.parse(localStorage.getItem(projectId)) || [];
                    let updatedProjects = saves.filter(savedProject => savedProject.name !== button.innerHTML);
            
                    localStorage.setItem(projectId, JSON.stringify(updatedProjects));
                    saves = JSON.parse(localStorage.getItem(projectId)) || [];
    
                    bimV._searchExplorer.loadButtonsHighlight(localFavs, saves);
                    let modelsTree = bimV._modelsExplorer._treeView;
    
                    document.body.removeChild(contextMenu);
                    button.remove(); 
                });
            
                contextMenu.appendChild(deleteOption);
                document.body.appendChild(contextMenu);
            
                document.addEventListener('click', function closeContextMenu() {
                    const contextMenus = document.querySelectorAll('.context-menu');
                    contextMenus.forEach(menu => menu.remove());
                    document.removeEventListener('click', closeContextMenu);
                }, { once: true });
            });
    
            projectContainer.appendChild(img);
            projectContainer.appendChild(button);
        
            localFavs.appendChild(projectContainer);
        });
    }

    expandParents(element, treeView) {
        const switchId = `switch-${element.id}`;
        const switchElement = document.getElementById(switchId);
    
        if (switchElement && switchElement.classList.contains('plus')) {
            treeView._expandSwitchElement(switchElement);
            this.expended.push(switchElement);
        }
    
        const ulElements = element.querySelectorAll('ul');
        ulElements.forEach(ul => {
            ul.querySelectorAll('li').forEach(childLi => {
                this.expandParents(childLi, treeView); // Recursively expand child elements
            });
        });
    };

    collapseParents(elements, treeView){
        Array.from(elements).forEach(switchElement => {
            treeView._collapseSwitchElement(switchElement);
        });
    }

    processStateAndExpand(state, treeView) {
        const firstElem = document.getElementById(state[0].id);
        const firstLiElement = firstElem?.closest('li');
        if (firstLiElement) {
            this.expandParents(firstLiElement, treeView);
        }
    };

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
        let htmlContainer = document.getElementById('container-container');
        const viewer = this.viewer;
    
        if (!htmlContainer) {
            htmlContainer = document.createElement('div');
            htmlContainer.className = 'element-container';
            htmlContainer.id = 'container-container';
            document.getElementById('search-elements').appendChild(htmlContainer);
        }
    
        for (let i = historyIndex; i < this.highlighted.length; i++) {
            let entity = this.highlighted[i];
    
            if (!entity) continue;
    
            if (entity.id == entity.parent) {
                let containerId = `container-${entity.id}`;
    
                if (!document.getElementById(containerId)) {
                    let container = document.createElement('div');
                    container.id = containerId;
                    container.style.marginLeft = '21px';
    
                    container.innerHTML = `
                        <input type="checkbox" class="checkbox-${entity.id}" id="${this.colorize}" name="single" checked>
                        <label for="checkbox-${entity.id}">
                            <span class="element">${entity.id}</span>
                        </label>
                        <a href="" id="trash-${entity.id}" class="trash-icon" style="display: inline-flex; align-items: center; justify-content: center; width: 15px; height: 15px; margin-left: 10px; color: #ce3333;">
                            <i class="fas fa-trash"></i>
                        </a>
                    `;

                    htmlContainer.appendChild(container);
    
                    const trashAnchor = document.getElementById(`trash-${entity.id}`);
                    trashAnchor.addEventListener('click', function (event) {
                        event.preventDefault();
                        viewer.scene.objects[entity.id].colorize = undefined;
                        container.remove();
    
                        if (htmlContainer.getElementsByTagName('div').length === 0) {
                            document.getElementById('favoriteButton').style.display = 'none';
                        }
                    });

                }
            } else {
                let parentContainerId = `container-${entity.parent}`;
                let parentContainer = document.getElementById(parentContainerId);
    
                if (!parentContainer) {
                    if (entity.parent) {
                        let container = document.createElement('div');
                        container.id = parentContainerId;
                        container.className = 'container';
    
                        container.innerHTML = `
                            <a href="" id="switch-tree-${entity.parent}" class="toggle-button minus" style="display: inline-flex; align-items: center; justify-content: center; width: 15px; height: 15px; background-color: white; color: black; border-radius: 50%; text-decoration: none; border: 1px solid black; font-size: 16px; font-weight: bold;">
                                <span class="icon" style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;">
                                    <i class="fas fa-minus" style="margin: 0;"></i>
                                </span>
                            </a>
                            <input type="checkbox" class="checkbox-${entity.parent}" id="checkbox-${entity.id}" name="parent" checked>
                            <label for="checkbox-${entity.parent}">
                                <span class="element">${entity.parent}</span>
                            </label>
                            <a href="" id="trash-${entity.parent}" class="trash-icon" style="display: inline-flex; align-items: center; justify-content: center; width: 15px; height: 15px; margin-left: 10px; color: #ce3333;">
                                <i class="fas fa-trash"></i>
                            </a>
                            <div id="children-${entity.parent}" class="children-container"></div>
                        `;
    
                        htmlContainer.appendChild(container);
    
                        const trashAnchor = document.getElementById(`trash-${entity.parent}`);
                        const childrenContainer = document.getElementById(`children-${entity.parent}`);
                        trashAnchor.addEventListener('click', function (event) {
                            event.preventDefault();
    
                            const childCheckboxes = childrenContainer.querySelectorAll('input[type="checkbox"]');
                            childCheckboxes.forEach(childCheckbox => {
                                let childId = childCheckbox.className.replace('checkbox-', '');
                                viewer.scene.objects[childId].colorize = undefined;
                            });
    
                            container.remove();
    
                            if (htmlContainer.getElementsByTagName('div').length === 0) {
                                document.getElementById('favoriteButton').style.display = 'none';
                            }
                        });
    
                        const toggleAnchor = document.getElementById(`switch-tree-${entity.parent}`);
                        const iconSpan = toggleAnchor.querySelector('.icon i');
                        toggleAnchor.addEventListener('click', function (event) {
                            event.preventDefault();
    
                            let isExpanded = toggleAnchor.classList.contains('minus');
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
    
                let childContainer = document.createElement('div');
                childContainer.style.marginLeft = '30px';
                childContainer.innerHTML = `
                    <input type="checkbox" class="checkbox-${entity.id}" id="${this.colorize}" name="single" checked>
                    <label for="checkbox-${entity.id}">
                        <span class="element">${entity.name}</span>
                    </label>
                `;
    
                document.getElementById(`children-${entity.parent}`).appendChild(childContainer);
            }
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
