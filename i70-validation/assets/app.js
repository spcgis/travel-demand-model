// Load resources
const [FeatureLayer, reactiveUtils] = await $arcgis.import([
    "@arcgis/core/layers/FeatureLayer.js",
    "@arcgis/core/core/reactiveUtils.js"
]);

import { 
  applyRenderer, 
  boundaryRenderer,
  cubeRenderer,
  createDiffRenderer,
  featureURLS,
  popupTemplate } from "./utils.js";

// Initialize map with neutral basemap
const mapElement = document.querySelector("#map");
await mapElement.componentOnReady();
const view = mapElement.view;

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
    url: featureURLS.ZoneLayer,
    id: "CUBE_Zones",
    outFields: ["CUBE_ZONE"],
    visible: false
});

const zonalData = new FeatureLayer({
    url: featureURLS.zoneData,
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
    visible: true,
    popupEnabled: true,
    popupTemplate: popupTemplate.zone
});
mapElement.map.add(joinedLayer);

setLoadingStatus("Loading networks...");

const cubeLink = new FeatureLayer ({
  url: featureURLS.cubeLink,
  id: "cubelink",
  title: "CUBE Link",
  outFields: ["*"],
  visible: false,
  renderer: cubeRenderer,
  popupEnabled: true,
  popupTemplate: popupTemplate.link,
  labelingInfo: [
    {
      // W -> E and S -> N
      where: "DIrection IN ('W -> E', 'S -> N')",
      labelExpressionInfo: {
        expression: "'→ ' + Text($feature.UnBuild, '#,###')"
      },
      labelPlacement: "above-along",
      symbol: {
        type: "text",
        color: "black",
        haloColor: "white",
        haloSize: 1,
        font: {
          size: 10
        }
      },
      deconflictionStrategy: "none"
    },
    {
      // Everything else
      where: "DIrection NOT IN ('W -> E', 'S -> N')",
      labelExpressionInfo: {
        expression: "Text($feature.UnBuild, '#,###') + ' ←'"
      },
      labelPlacement: "below-along",
      symbol: {
        type: "text",
        color: "black",
        haloColor: "white",
        haloSize: 1,
        font: {
          size: 10
        }
      }
    }
  ]
});
mapElement.map.add(cubeLink);

const cubeNode = new FeatureLayer ({
  url: featureURLS.cubeNode,
  popupEnabled: true,
  id: "cubenode",
  outFields: ["*"],
  visible: false,
  title: "CUBE Node",
  popupEnabled: true,
  popupTemplate: popupTemplate.node
});
mapElement.map.add(cubeNode);

const pennDotLink = new FeatureLayer({
  url: featureURLS.pennDot,
  id: "pdlink",
  title: "PennDOT RMS Segments",
  outFields: ["*"],
  visible: false,
  popupEnabled: true,
  labelingInfo: [{
    labelExpressionInfo: {
      expression: "Text($feature.CUR_AADT, '#,###')"
    },
    labelPlacement: "above-along",
    symbol: {
      type: "text",
      color: "black",
      haloColor: "white",
      haloSize: 1,
      font: {
        size: 10
      }
    }
  }]
});
mapElement.map.add(pennDotLink);

const pennDot_node = new FeatureLayer ({
  url: featureURLS.pennDot_node,
  id: "pdnode",
  outFields: ["*"],
  visible: false,
  title: "PennDOT Node"
});
mapElement.map.add(pennDot_node);

const streetlight = new FeatureLayer({
  url: featureURLS.streetlight,
  popupEnabled: true,
  popupTemplate: popupTemplate.streetlight,
  id: "stlink",
  title: "Streetlight",
  outFields: ["*"],
  visible: false,
  labelingInfo: [{
    labelExpressionInfo: {
      expression: "Text($feature.Estimated, '#,###')"
    },
    labelPlacement: "above-along",
    symbol: {
      type: "text",
      color: "black",
      haloColor: "white",
      haloSize: 1,
      font: {
        size: 10
      }
    }
  }]
});
mapElement.map.add(streetlight);

const streetlight_node = new FeatureLayer ({
  url: featureURLS.streetlight_node,
  id: "stnode",
  outFields: ["*"],
  visible: false,
  title: "Streetlight Node"
});
mapElement.map.add(streetlight_node);

// Hide map until layers are displayed
const layers = [
  joinedLayer,
  cubeLink,
  cubeNode,
  pennDot_node,
  pennDotLink,
  streetlight,
  streetlight_node
];
Promise.all(
  layers.map(layer =>
    view.whenLayerView(layer).then(layerView =>
      reactiveUtils.whenOnce(() => !layerView.updating)
    )
  )
).then(() => {
  hideLoadingScreen();
});

// Add listeners to all interactive elements

// Attach event listener to zoneSelect
const zoneSelector = document.getElementById("zoneSelect");
zoneSelector.addEventListener("change", async () => {
  const zoneStat = zoneSelector.value;
  if (zoneStat === "none") {
    joinedLayer.visible = false;
  } else {
    joinedLayer.visible = true;
    const renderer = await applyRenderer(zoneStat, joinedLayer);
    joinedLayer.title = zoneSelector.selectedOptions[0].text;
    joinedLayer.renderer = renderer;
  }
});

// Listener for CUBE selector
const cubeSelector = document.getElementById("CUBE");
cubeSelector.addEventListener("change", () => {
    document.getElementById("cubeSelect").style.display = 
        cubeSelector.checked ? "block" : "none";
    cubeLink.visible = cubeSelector.checked;
    cubeNode.visible = cubeSelector.checked;
});


const cubeScenario = document.querySelector("#cubeSelect select");
cubeScenario.addEventListener("change", async () => {
  const selectedVal = cubeScenario.value;
  if (selectedVal.includes("diff")) {
    cubeLink.renderer = createDiffRenderer(selectedVal);
    cubeLink.where = `${selectedVal} IS NOT NULL`
    cubeLink.labelingInfo[0].labelExpressionInfo.expression = `'→ '+Text($feature.${selectedVal})+'%'` 
    cubeLink.labelingInfo[1].labelExpressionInfo.expression = `Text($feature.${selectedVal})+'% ←'`
    cubeLink.renderer.valueExpressionTitle = "Percent Change"
    
  } else {
    cubeLink.renderer = cubeRenderer;
    cubeLink.labelingInfo[0].labelExpressionInfo.expression = `'→ '+Text($feature.${selectedVal}, '#,###')` 
    cubeLink.labelingInfo[1].labelExpressionInfo.expression = `Text($feature.${selectedVal}, '#,###'+' ←')`
    cubeLink.renderer.valueExpressionTitle = "Functional Class"
  }
});

// Listener for other networks
const pennDOTSelector = document.getElementById("PennDOT");
pennDOTSelector.addEventListener("change", () => {
    pennDotLink.visible = pennDOTSelector.checked;
    pennDot_node.visible = pennDOTSelector.checked;
});

const stlSelector = document.getElementById("Streetlight");
stlSelector.addEventListener("change", () => {
    streetlight.visible = stlSelector.checked;
    streetlight_node.visible = stlSelector.checked;
});