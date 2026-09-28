// Load resources
const [Map, MapView, FeatureLayer, colorRendererCreator] = await $arcgis.import([
    "@arcgis/core/Map.js",
    "@arcgis/core/views/MapView.js",
    "@arcgis/core/layers/FeatureLayer.js",
    "@arcgis/core/smartMapping/renderers/color.js",
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
        <option value="UnBuild">Unbuild</option>
        <option value="speedChange">Speed Change</option>
        <option value="speedChange_diff">Speed Change (Difference)</option>
    </select>
</div>
    <label><input type="checkbox" id="PennDOT">PennDOT</label></br>
    <!--label><input type="checkbox" id="Streetlight">Streetlight</label></br-->
</div>
<div style="margin-bottom: 10px;">
    <label for="zoneSelect">Zone Statistics:</label></br>
    <select id="zoneSelect" style="border: 1px solid #ccc">
        <option value="none">Boundary</option>
        <option value="inbound">Inbound Trips</option>
        <option value="outbound">Outbound Trips</option>
        <option value="intrazonal">Intrazonal Trips</option>
        <option value="areaType">Area Type</option>
        <option value="popden">Population Density</option>
        <option value="emden">Employment Density</option>
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

// Functions to configure loading screen
const loadingScreen = document.getElementById("loading-screen");
const loadingStatus = document.getElementById("loading-status");

function setLoadingStatus(message) {
  loadingStatus.textContent = message;
}

function hideLoadingScreen() {
  loadingScreen.classList.add("hidden");
}


// Load zonal data
setLoadingStatus("Loading zonal data");

// Get SPC TAZ and join with zonal data table
const cubeTAZ = new FeatureLayer({
    url: "https://services3.arcgis.com/MV5wh5WkCMqlwISp/ArcGIS/rest/services/FifthForbes_ThruTrips/FeatureServer/0",
    id: "CUBE_Zones",
    outFields: ["CUBE_ZONE"],
    visible: false
});

const zonalData = new FeatureLayer({
    url: "https://services3.arcgis.com/MV5wh5WkCMqlwISp/ArcGIS/rest/services/TDM_Validation/FeatureServer/3",
    id: "zonalData",
    outFields: ["*"],
    visible: false
});

// Load and join zonal data client-side
const [layerResults, tableResults] = await Promise.all([
    cubeTAZ.queryFeatures({
        where: "CUBE_ZONE < 1300",
        outFields: ["CUBE_ZONE"],
        returnGeometry: true
    }),

    zonalData.queryFeatures({
        where: "1=1",
        outFields: ["*"],
        returnGeometry: false
    })
]);

// Build a lookup of table records by the join field
const zonalLookup = {};

for (const feature of tableResults.features) {
    const id = String(feature.attributes["zone"]);
    zonalLookup[id]= feature.attributes;
}

// Create client-side graphics containing the joined attributes
const joinedFeatures = layerResults.features.map(feature => {
    const id = String(feature.attributes["CUBE_ZONE"]);
    const zonalAttributes = zonalLookup[id];
    return {
        geometry: feature.geometry,
        attributes: zonalAttributes
    };
});


// Configure zonal renderer
const boundaryRenderer = {
    type: "simple",
    symbol: {
        type: "simple-fill",
        color: [255, 255, 255, 0], // Transparent white 
        outline: { color: [0, 0, 0], width: 1 } // Black outline
    }
};

const areaTypeRenderer = {
  type: "unique-value",
  field: "areaType",
  uniqueValueInfos: [
    {
      value: 1,
      label: "Urban Core / Dense Commercial",
      symbol: {
        type: "simple-fill",
        color: "#8C2D04",
        outline: { color: [0, 0, 0], width: 1 }
      }
    },
    {
      value: 2,
      label: "Urban Commercial / Dense Residential",
      symbol: {
        type: "simple-fill",
        color: "#D94801",
        outline: { color: [0, 0, 0], width: 1 }
      }
    },
    {
      value: 3,
      label: "Urban Residential / Suburban Commercial",
      symbol: {
        type: "simple-fill",
        color: "#F16913",
        outline: { color: [0, 0, 0], width: 1 }
      }
    },
    {
      value: 4,
      label: "Suburban Residential",
      symbol: {
        type: "simple-fill",
        color: "#FD8D3C",
        outline: { color: [0, 0, 0], width: 1 }
      }
    },
    {
      value: 5,
      label: "Exurban",
      symbol: {
        type: "simple-fill",
        color: "#FDD49E",
        outline: { color: [0, 0, 0], width: 1 }
      }
    }
  ]
};

const tripColors = [
  "#006837", 
  "#66BD63", 
  "#FEE08B", 
  "#F46D43", 
  "#A50026"  
];


const rendererConfig = {
  inbound: {
    field: "inbound",
    classificationMethod: "natural-breaks",
    numClasses: 5,
    colors: tripColors
  },

  outbound: {
    field: "outbound",
    classificationMethod: "natural-breaks",
    numClasses: 5,
    colors: tripColors
  },

  intrazonal: {
    field: "intrazonal",
    classificationMethod: "natural-breaks",
    numClasses: 5,
    colors: tripColors
  },

  popden: {
    field: "popden",
    classificationMethod: "natural-breaks",
    numClasses: 5,
    colors: [
      "#EFF3FF",
      "#BDD7E7",
      "#6BAED6",
      "#3182BD",
      "#08519C"
    ]
  },

  emden: {
    field: "emden",
    classificationMethod: "natural-breaks",
    numClasses: 5,
    colors: [
      "#F2F0F7",
      "#CBC9E2",
      "#9E9AC8",
      "#756BB1",
      "#54278F"
    ]
  }
};


async function applyRenderer(type) {
    if (type === "none") {
        joinedLayer.renderer = boundaryRenderer;
        return;
    }

    if (type == "areaType") {
        joinedLayer.renderer = areaTypeRenderer;
        return;
    }

    const config = rendererConfig[type];

    const { renderer } =
        await colorRendererCreator.createClassBreaksRenderer({
        layer: joinedLayer,
        field: config.field,
        classificationMethod: config.classificationMethod,
        numClasses: config.numClasses
        });
    
    renderer.classBreakInfos.forEach((info, index) => {
        info.symbol.color = config.colors[index];
        info.symbol.outline = {color: [0, 0, 0, 255], width: 1};
    });

    joinedLayer.renderer = renderer;

}

// Create a client-side FeatureLayer
const joinedLayer = new FeatureLayer({
    source: joinedFeatures,
    fields: tableResults.fields,
    objectIdField: cubeTAZ.objectIdField,
    geometryType: cubeTAZ.geometryType,
    spatialReference: cubeTAZ.spatialReference,
    title: "Joined_TAZ",
    renderer: boundaryRenderer,
    visible: true
});
map.add(joinedLayer);

// Attach event listener to zoneSelect
const zoneSelector = document.getElementById("zoneSelect");
    zoneSelector.addEventListener("change", () => {
        applyRenderer(zoneSelector.value);
        console.log(joinedLayer.renderer);
});

hideLoadingScreen();

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
