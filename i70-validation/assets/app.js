// Load resources
const [FeatureLayer, colorRendererCreator, reactiveUtils] = await $arcgis.import([
    "@arcgis/core/layers/FeatureLayer.js",
    "@arcgis/core/smartMapping/renderers/color.js",
    "@arcgis/core/core/reactiveUtils.js"

]);

// Initialize map with neutral basemap
const mapElement = document.querySelector("#map");
const view = mapElement.view;

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
const zoneOutline = { color: [0, 0, 0], width: 1 } // Black outline

const boundaryRenderer = {
    type: "simple",
    symbol: {
        type: "simple-fill",
        color: [255, 255, 255, 0], // Transparent white 
        outline: zoneOutline
    }
};

const tripColors = [
     [180, 230, 180, 0.7],
     [255, 241, 169, 0.7],
     [254, 204, 92, 0.7],
     [253, 141, 60, 0.7],
     [240, 59, 32, 0.7],
     [189, 0, 38, 0.7]
];

const areaTypeRenderer = {
  type: "unique-value",
  field: "areaType",
  uniqueValueInfos: [
    {
      value: 1,
      label: "Urban Core / Dense Commercial",
      symbol: {
        type: "simple-fill",
        color: [242, 76, 0, 0.7]
      }
    },
    {
      value: 2,
      label: "Urban Commercial / Dense Residential",
      symbol: {
        type: "simple-fill",
        color: [252, 122, 30, 0.7]
      }
    },
    {
      value: 3,
      label: "Urban Residential / Suburban Commercial",
      symbol: {
        type: "simple-fill",
        color: [249, 199, 132, 0.7]
      }
    },
    {
      value: 4,
      label: "Suburban Residential",
      symbol: {
        type: "simple-fill",
        color: [231, 231, 231, 0.7]
      }
    },
    {
      value: 5,
      label: "Exurban",
      symbol: {
        type: "simple-fill",
        color: [72, 86, 150, 0.7]
      }
    }
  ]
};


const rendererConfig = {
  "inbound": {
    field: "inbound",
    colors: tripColors
  },

  "intrazonal": {
    field: "intrazonal",
    colors: tripColors
  },

  "popden": {
    field: "popden",
    colors: [
      [239, 243, 255, 0.7],
      [189, 215, 231, 0.7],
      [107, 174, 214, 0.7],
      [49, 130, 189, 0.7],
      [8, 81, 156, 0.7]
    ]
  },

  "emden": {
    field: "emden",
    colors: [
      [242, 240, 247, 0.7],
      [203, 201, 226, 0.7],
      [158, 154, 200, 0.7],
      [117, 107, 177, 0.7],
      [84, 39, 143, 0.7]
    ]
  }
};

// Create a client-side FeatureLayer
const joinedLayer = new FeatureLayer({
    source: joinedFeatures,
    fields: tableResults.fields,
    objectIdField: cubeTAZ.objectIdField,
    geometryType: cubeTAZ.geometryType,
    spatialReference: cubeTAZ.spatialReference,
    title: "TAZ Boundary",
    renderer: boundaryRenderer,
    visible: true
});

async function applyRenderer(type) {
    if (type === "none") {
        return boundaryRenderer;
    }

    if (type == "areaType") {
        return areaTypeRenderer;
    }

    const config = rendererConfig[type];

    const { renderer } =
        await colorRendererCreator.createClassBreaksRenderer({
          layer: joinedLayer,
          field: config.field,
          classificationMethod: "natural-breaks",
          numClasses: 5
        });
    
    renderer.classBreakInfos.forEach((info, index) => {
        info.symbol.color = config.colors[index];
        info.symbol.outline = zoneOutline;
    });

    return renderer;

}
mapElement.map.add(joinedLayer);

// Hide map until layers are displayed
const layers = [
  joinedLayer
];

Promise.all(
  layers.map(layer =>
    view.whenLayerView(layer).then(layerView =>
      reactiveUtils.whenOnce(() => !layerView.updating)
    )
  )
).then(() => {
  const legend = document.querySelector("arcgis-legend");
  const classicView = legend.shadowRoot
    .querySelector("arcgis-legend-classic-view");
  const classicElement = classicView.shadowRoot
    .querySelector("arcgis-legend-classic-element");
  const style = document.createElement("style");
  style.textContent = `
    .layer-caption {
      display: none !important;
    }
  `;
  classicElement.shadowRoot.appendChild(style);
  hideLoadingScreen();
});

// Attach event listener to zoneSelect
const zoneSelector = document.getElementById("zoneSelect");
zoneSelector.addEventListener("change", async () => {
    const renderer = await applyRenderer(zoneSelector.value);
    joinedLayer.title = zoneSelector.selectedOptions[0].text;
    joinedLayer.renderer = renderer;
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

//     // Layer for display
//     const displayLayer = new FeatureLayer({
//         url: baseURL + tableURL.layer,
//         id: "mapLayer",
//         outFields: ["*"],
//         visible: true
//     });
//     map.add(displayLayer);


