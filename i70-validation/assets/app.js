// Load resources
const [Map, MapView, FeatureLayer, Renderer] = await $arcgis.import([
    "@arcgis/core/Map.js",
    "@arcgis/core/views/MapView.js",
    "@arcgis/core/layers/FeatureLayer.js",
    "@arcgis/core/renderers/Renderer.js"
]);

// Initialize map with neutral basemap
const map = new Map({
    basemap: "gray-vector"
});

const view = new MapView({
    container: "viewDiv",
    map: map,
    center: [-80.245712, 40.186306], // Washington
    zoom: 10
});

// Create filter container
const filterDiv = document.createElement("div");
filterDiv.id = "filterContainer";
filterDiv.style.cssText = `
    position: absolute;
    right: 20px;
    background: white;
    padding: 10px;
    border-radius: 3px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    z-index: 1000;
`;

filterDiv.innerHTML = `
<div style="margin-bottom: 10px;" id="networkSelect">
    <label>Display Network:</label></br>
    <label><input type="checkbox" id="CUBE">CUBE</label></br>
    <div id="cubeSelect" style="display: none;">
    <select>
        <option value="unbuild">Unbuild</option>
        <option value="speedChange">Speed Change</option>
        <option value="maxDist">Max Distance</option>
    </select>
</div>
    <label><input type="checkbox" id="PennDOT">PennDOT</label></br>
    <label><input type="checkbox" id="Streetlight">Streetlight</label></br>
</div>
<div style="margin-bottom: 10px;">
    <label for="zoneSelect">Zone Statistics:</label></br>
    <select id="zoneSelect" style="border: 1px solid #ccc">
        <option value="None">Boundary</option>
        <option value="Inbound">Inbound Trips</option>
        <option value="Outbound">Outbound Trips</option>
        <option value="Intrazonal">Intrazonal Trips</option>
        <option value="AreaType">Area Type</option>
    </select>
</div>
`;
view.ui.add(filterDiv, "top-right");

// Listener for CUBE selector
const cubeSelector = document.getElementById("CUBE");
cubeSelector.addEventListener("change", () => {
    document.getElementById("cubeSelect").style.display = 
        cubeSelector.checked ? "block" : "none";
});

//     // Function to cache query tables
//     const queryTables = {};
//     function getQueryTable(key) {
//         if (!queryTables[key]) {
//             queryTables[key] = new FeatureLayer({
//                 url: baseURL + tableURL[key],
//                 outFields: ["*"],
//                 visible: false
//             });
//         }
//         return queryTables[key];
//     }

//     // Green outline
//     const outlineRenderer = {
//         type: "simple",
//         symbol: {
//             type: "simple-fill",
//             color: [255, 255, 255, 0], // Transparent white 
//             outline: { color: [0, 128, 0], width: 1 } // Green outline
//         }
//     };

//     // Layer for Oakland TAZ
//     const oaklandTAZ = new FeatureLayer({
//         url: baseURL + tableURL.layer,
//         id: "oaklandTAZ",
//         outFields: ["*"],
//         visible: true,
//         renderer: oaklandTAZRenderer,
//         definitionExpression: "CUBE_ZONE IN (18,25,26,27,28,29,30,31,32,983)"
//     });

//     // Layer for display
//     const displayLayer = new FeatureLayer({
//         url: baseURL + tableURL.layer,
//         id: "mapLayer",
//         outFields: ["*"],
//         visible: true
//     });
//     map.add(displayLayer);

//     // Warm up layer connections in parallel as soon as the module runs
//     Promise.all([
//         displayLayer.load(),
//         oaklandTAZ.load()
//     ]).catch(error => console.error("Error preloading layers:", error));
