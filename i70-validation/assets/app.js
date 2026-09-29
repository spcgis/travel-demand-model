// Load resources
const [FeatureLayer, reactiveUtils] = await $arcgis.import([
    "@arcgis/core/layers/FeatureLayer.js",
    "@arcgis/core/core/reactiveUtils.js"
]);

import { applyRenderer, boundaryRenderer } from "./renderer.js";

// Initialize map with neutral basemap
const mapElement = document.querySelector("#map");
await mapElement.componentOnReady();
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
  const classicView = legend.shadowRoot.querySelector("arcgis-legend-classic-view");
  const classicElement = classicView.shadowRoot.querySelector("arcgis-legend-classic-element");

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
    const renderer = await applyRenderer(zoneSelector.value, joinedLayer);
    joinedLayer.title = zoneSelector.selectedOptions[0].text;
    joinedLayer.renderer = renderer;
});