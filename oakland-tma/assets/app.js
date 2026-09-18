// Helpers

// Generate class breaks
function generateRenderer(breaks) {
    return {
        type: "class-breaks",
        defaultSymbol: {
            type: "simple-fill",
            color: [180, 230, 180, 0.6], // green for no trips
            outline: { color: [0, 128, 0], width: 1 }
        },
        defaultLabel: "0 trip",
        classBreakInfos: [
        {
            minValue: 1,
            maxValue: breaks[0],
            symbol: {
                type: "simple-fill",
                color: [255, 241, 169, 0.7],
                outline: { color: [0, 128, 0], width: 1 }
            },
            label: `1-${breaks[0]} trips`
        },
        {
            minValue: breaks[0]+1,
            maxValue: breaks[1],
            symbol: {
                type: "simple-fill",
                color: [254, 204, 92, 0.7],
                outline: { color: [0, 128, 0], width: 1 }
            },
            label: `${breaks[0]+1}-${breaks[1]} trips`
        },
        {
            minValue: breaks[1]+1,
            maxValue: breaks[2],
            symbol: {
                type: "simple-fill",
                color: [253, 141, 60, 0.7],
                outline: { color: [0, 128, 0], width: 1 }
            },
            label: `${breaks[1]+1}-${breaks[2]} trips`
        },
        {
            minValue: breaks[2]+1,
            maxValue: breaks[3],
            symbol: {
                type: "simple-fill",
                color: [240, 59, 32, 0.7],
                outline: { color: [0, 128, 0], width: 1 }
            },
            label: `${breaks[2]+1}-${breaks[3]} trips`
        },
        {
            minValue: breaks[3]+1,
            maxValue: 99999999999,
            symbol: {
                type: "simple-fill",
                color: [189, 0, 38, 0.7],
                outline: { color: [0, 128, 0], width: 1 }
            },
            label: `>${breaks[3]} trips`
        }
    ]};
}

// Dynamically generate classbreaks
function generateClassBreaks(data, numClasses = 5) {
    if (!data || data.length === 0) return [5, 10, 25, 50];
    const n = data.length;

    // Initialize matrices
    const mat1 = Array.from({ length: n + 1 }, () => Array(numClasses + 1).fill(0));
    const mat2 = Array.from({ length: n + 1 }, () => Array(numClasses + 1).fill(0));

    for (let i = 1; i <= numClasses; i++) {
        mat1[0][i] = 1;
        mat2[0][i] = 0;
        for (let j = 1; j <= n; j++) {
            mat2[j][i] = Infinity;
        }
    }

    let v = 0;
    for (let l = 2; l <= n; l++) {
        let s1 = 0, s2 = 0, w = 0;
        for (let m = 1; m <= l; m++) {
            const i3 = l - m + 1;
            const val = data[i3 - 1];

            s2 += val * val;
            s1 += val;
            w++;

            v = s2 - (s1 * s1) / w;
            const i4 = i3 - 1;
            if (i4 !== 0) {
                for (let j = 2; j <= numClasses; j++) {
                    if (mat2[l][j] >= (v + mat2[i4][j - 1])) {
                        mat1[l][j] = i3;
                        mat2[l][j] = v + mat2[i4][j - 1];
                    }
                }
            }
        }
        mat1[l][1] = 1;
        mat2[l][1] = v;
    }

    // Backtrack to find class breaks
    const breaks = Array(numClasses + 1).fill(0);
    breaks[numClasses] = data[data.length - 1];
    let k = n;
    for (let j = numClasses; j >= 2; j--) {
        const id = mat1[k][j] - 2;
        breaks[j - 1] = data[id];
        k = mat1[k][j] - 1;
    }
    breaks[0] = data[0];
    roundedBreaks = breaks.map(b => Math.round(b / 5) * 5);

    return roundedBreaks.slice(1);
}

// Get the appropriate 
function getColorFromRenderer(renderer, tripCount) {
    const breakInfo = renderer.classBreakInfos.find(info => 
        tripCount >= info.minValue && tripCount <= info.maxValue
    );
    return breakInfo ? breakInfo.symbol.color : [0, 0, 0, 0];
}

// URL handling
const baseURL = "https://services3.arcgis.com/MV5wh5WkCMqlwISp/ArcGIS/rest/services/FifthForbes_ThruTrips/FeatureServer/";
const tableURL = {
        "layer": "0",
        "afterFifth": "1",
        "afterForbes": "2",
        "beforeFifth": "3",
        "beforeForbes": "4",
        "summaryTable": "5"
    };

// ArcOnline operations
require([
    "esri/Map",
    "esri/views/MapView",
    "esri/layers/FeatureLayer",
    "esri/widgets/Legend",
    "esri/widgets/Expand",
], function(Map, MapView, FeatureLayer, Legend, Expand) {
    // Initialize map with neutral basemap
    const map = new Map({
        basemap: "gray-vector"
    });

    const view = new MapView({
        container: "viewDiv",
        map: map,
        center: [-79.977711, 40.438776], // Central Oakland
        zoom: 10
    });

    // Initialize state variables
    let selectedOrigins = new Set();
    let tripData = {};
    let selectedRoute = "Both";
    let selectedScenario = "before";

    // Create tooltip
    const tooltip = document.createElement("div");
    tooltip.id = "tripTooltip";
    tooltip.style.cssText = `
        display: none;
        position: fixed;
        background-color: white;
        padding: 5px;
        border: 1px solid black;
        border-radius: 3px;
        z-index: 1000;
        pointer-events: none;
        font-family: Arial, sans-serif;
        font-size: 12px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    `;
    view.ui.add(tooltip);

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

    // Update filterDiv innerHTML to include the mode selection dropdown
    filterDiv.innerHTML = `
    <div style="margin-bottom: 10px;">
        <label for="routeSelect">Through Route:</label></br>
        <select id="routeSelect" style="border: 1px solid #ccc">
            <option value="Both">Both Fifth & Forbes Avenues</option>
            <option value="Fifth">Fifth Avenue</option>
            <option value="Forbes">Forbes Avenue</option>
        </select>
    </div>
    <div style="margin-bottom: 10px;">
        <label for="scenarioSelect">Scenario:</label>
        <select id="scenarioSelect" style="border: 1px solid #ccc">
            <option value="before">Before Contraflow Lane Closure</option>
            <option value="after">After Contraflow Lane Closure</option>
        </select>
    </div>
    <div style="margin-bottom: 10px">
        <p style="font-size:smaller;">*Estimates are daily averages.</p>
    </div>
    `;
    view.ui.add(filterDiv, "top-right");

    // Function to cache query tables
    const queryTables = {};
    function getQueryTable(key) {
        if (!queryTables[key]) {
            queryTables[key] = new FeatureLayer({
                url: baseURL + tableURL[key],
                outFields: ["*"],
                visible: false
            });
        }
        return queryTables[key];
    }

    // Black Outline
    const outlineRenderer = {
        type: "simple",
        symbol: {
            type: "simple-fill",
            color: [255, 255, 255, 0], // Transparent white 
            outline: { color: [0, 128, 0], width: 1 } // Green outline
        }
    };

    // Layer for TAZ outlines (green)
    const zoneBoundary = new FeatureLayer({
        url: baseURL + tableURL.layer,
        id: "zoneOutline",
        outFields: ["*"],
        visible: true,
        renderer: outlineRenderer
    });
    map.add(zoneBoundary);

    // Layer for display
    const displayLayer = new FeatureLayer({
        url: baseURL + tableURL.layer,
        id: "mapLayer",
        outFields: ["*"],
        visible: true
    });
    map.add(displayLayer);

    // Function to create side panel if it doesn't exist
    function createSidePanel() {
        const sidePanel = document.createElement("div");
        sidePanel.id = "sidePanel";
        sidePanel.style.cssText = `
            position: absolute;
            left: 39px;
            background: white;
            padding: 15px;
            border-radius: 3px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            width: 270px;
            z-index: 1000;
            display: none;
            max-height: 300%;
            overflow-y: auto;
        `;
        view.ui.add(sidePanel, "top-left");
        return sidePanel;
    }

    // Function to update base display
    function updateBaseMap() {
        // Refresh
        view.graphics.removeAll();
        tripData = {};
        let targetCols;

        // Get target column & query the table
        if (selectedRoute === "Both") {
            targetCols = [selectedScenario + "Forbes", selectedScenario + "Fifth"];
        } else {
            targetCols = selectedScenario + selectedRoute;
        }
        
        // Create feature layer for query
        const queryTable = getQueryTable("summaryTable");
        queryTable.load().then(() => {
        console.log("Selected:", targetCols);
        return queryTable.queryFeatures({
            where: "1=1",
            outFields: ["*"],
            returnGeometry: false
            });
        }).then(results => {
            results.features.forEach(feature => {
                const attrs = feature.attributes;
                const zone = attrs["Zone"];

                if (selectedRoute === "Both") {
                    const total = targetCols.reduce((sum, fieldName) => {
                        return sum + (Number(attrs[fieldName]) || 0);
                    }, 0);
                    tripData[zone] = total;
                } else {
                    tripData[zone] = Number(attrs[targetCols]) || 0;
                }
            });
        });

        const sortedCounts = Object.values(tripData).flatMap(obj => Object.values(obj)).sort((a, b) => a - b);
        if (sortedCounts[sortedCounts.length - 1] > 200) {
            displayLayer.renderer = generateRenderer(generateClassBreaks(sortedCounts));
        } else {
           displayLayer.renderer = generateRenderer([5, 10, 25, 50]);
        }

        displayLayer.features.forEach(feature => {
            const zone = feature.attributes["CUBE_ZONE"];
            const tripCount = tripData[zone] || 0;
            const color = getColorFromRenderer(displayLayer.renderer, tripCount);

            view.graphics.add({
                        geometry: f.geometry,
                        symbol: {
                            type: "simple-fill",
                            color: color,
                            outline: { color: [0, 128, 0], width: 1 } 
                        }
                    });
        });
        baseSidePanel();
    }

    // Function to update side-panel display with base map information
    function baseSidePanel() {
        const sidePanel = document.getElementById("sidePanel");

        const totalTrips = Object.entries(tripData)
            .filter(([column]) => column !== "Zone")
            .reduce((total, [, values]) => {
                return total + values.reduce((sum, value) => sum + Number(value), 0);
            }, 0);

        const content = `
            <div style="text-align: right;">
                <button onclick="this.parentElement.parentElement.style.display='none'" 
                        style="border: none; background: none; cursor: pointer;">✕</button>
            </div>
            <h3 style="margin-block-start:0px; margin-block-end:0px;">Total Through Trips</h3>
            <p style="margin-block-start:0px;"><em>${selectedRoute} Avenue ${selectedScenario} Contraflow Closure</em></p>
            <div style="margin-bottom: 2px;">
                <p style="margin-block-start:0px;"><strong>Total Through Trips:</strong> ${totalTrips}</p>
                <hr>
            </div>
        `;

        sidePanel.innerHTML = content;
        sidePanel.style.display = "block";
    }

    // Initialize base map
    updateBaseMap();

    // Helper to aggregate results
    function aggregate(results) {
        results.features.forEach(f => {
            const destId = f.attributes["toZone"];
            const trips = parseInt(f.attributes["vehTrip"]);
            
            aggregatedTrips[destId] = (aggregatedTrips[destId] || 0) + trips;                    
        });
    }

    // Function to handle origin click
    function handleOriginClick(clickedZone) {

        let aggregatedTrips = {};

        // Generate query
        const whereClause = `fromZone = '${clickedZone}'`;
        console.log("Query for TAZs:", whereClause);

        if (selectedRoute === "Both") {
            const fifthTable = getQueryTable(selectedScenario + "Fifth");
            fifthTable.load().then(() => {
                return fifthTable.queryFeatures({
                    where: whereClause,
                    outFields: ["*"],
                    returnGeometry: false
                });
            }).then(function (results) {

                if (!results.features.length) {
                    console.log("No thru-Fifth destinations found for origin:", clickedZone);
                    return;
                }

                console.log("Fifth results:", {
                    originId: clickedZone,
                    featuresFound: results.features.length
                });
            
                aggregate(results);
            });

            const forbesTable = getQueryTable(selectedScenario + "Forbes");
            forbesTable.load().then(() => {
                return forbesTable.queryFeatures({
                    where: whereClause,
                    outFields: ["*"],
                    returnGeometry: false
                });
            }).then(function (results) {
                
                if (!results.features.length) {
                    console.log("No thru-Forbes destinations found for origin:", clickedZone);
                    return;
                }

                console.log("Forbes results:", {
                    originId: clickedZone,
                    featuresFound: results.features.length
                });
                
                aggregate(results);
            });

        } else {
            const queryTable = getQueryTable(selectedScenario+selectedRoute);
            queryTable.load().then(() => {
                return queryTable.queryFeatures({
                    where: whereClause,
                    outFields: ["*"],
                    returnGeometry: false
                });
            }).then(function(results) {
                
                if (!results.features.length) {
                    console.log("No destinations found for origin:", clickedZone);
                    return;
                }

                console.log("Query results:", {
                    originId: clickedZone,
                    featuresFound: results.features.length
                });
                
                aggregate(results);
            });
        }
        
        if (aggregatedTrips.length === 0) {
            return;
        } else {
            // Store aggregated results
            tripData[clickedZone] = {};
            Object.entries(aggregatedTrips).forEach(([destId, trips]) => {
                tripData[clickedZone][destId] = trips;
            });
            
            console.log("Results summary:", {
                originId: clickedZone,
                totalDestinations: Object.keys(aggregatedTrips).length,
                totalTrips: Object.values(aggregatedTrips).reduce((sum, trips) => sum + trips, 0)
            });

            updateDisplay();
        }}

    // Function to dynamically update display after an origin click
    function updateDisplay() {
        view.graphics.removeAll();

        if (selectedOrigins.size === 0) {
            updateBaseMap();
            return;
        }

        const originIds = Array.from(selectedOrigins).map(id => `'${id}'`).join(",");
        const originQuery = displayLayer.createQuery();
        originQuery.where = `CUBE_ZONE IN (${originIds})`;
        originQuery.outFields = ["CUBE_ZONE"];

        // Generate classbreaks dynamically        
        const sortedCounts = Object.values(tripData).flatMap(destObj => Object.values(destObj)).sort((a, b) => a - b);
        if (sortedCounts[sortedCounts.length - 1] > 200) {
            displayLayer.renderer = generateRenderer(generateClassBreaks(sortedCounts));
        } else {
           displayLayer.renderer = generateRenderer([5, 10, 25, 50]);
        }

        displayLayer.queryFeatures(originQuery).then(function(originResults) {
            // Calculate combined trips for all destinations
            let combinedTrips = {};
            Object.values(tripData).forEach(originData => {
                Object.entries(originData).forEach(([destId, trips]) => {
                    combinedTrips[destId] = (combinedTrips[destId] || 0) + trips;
                });
            });

            // Update side panel content
            updateSidePanel(originResults.features, combinedTrips);

            // Query and highlight destinations (no borders)
            const destQuery = displayLayer.createQuery();
            const destIds = Object.keys(combinedTrips);
            if (destIds.length === 0) return;

            destQuery.where = `CUBE_ZONE IN (${destIds.join(",")})`;
            destQuery.outFields = ["CUBE_ZONE"];

            displayLayer.queryFeatures(destQuery).then(function(destResults) {
                // First, add all destinations with color fills but no borders
                destResults.features.forEach(function(f) {
                    const destId = f.attributes.CUBE_ZONE;
                    const tripCount = combinedTrips[destId] || 0;
                    const color = getColorFromRenderer(displayLayer.renderer, tripCount);
                    
                    // Only add fill color, no border
                    view.graphics.add({
                        geometry: f.geometry,
                        symbol: {
                            type: "simple-fill",
                            color: color,
                            outline: { color: [0, 128, 0], width: 1 } // Green border
                        }
                    });
                });
                
                // Then add prominent borders ONLY to selected origins (on top of fills)
                originResults.features.forEach(function(f) {
                    view.graphics.add({
                        geometry: f.geometry,
                        symbol: {
                            type: "simple-fill",
                            color: [0, 0, 0, 0], // Transparent fill
                            outline: { 
                                color: [255, 0, 0], // Bright red border
                                width: 3          // Thick border
                            }
                        }
                    });
                });
            });
        });
    }

    // Click handler
    view.on("click", function(event) {
        view.hitTest(event).then(function(response) {
            const result = response.results.find(r =>
                r.graphic?.layer?.id === "displayLayer"
            );
            if (!result) {
                updateBaseMap()
                return;
            }

            const clickedZone = result.graphic.attributes.CUBE_ZONE;
            if (!clickedZone) {
                console.error("No TAZ found in clicked feature.");
                return;
            }

            // Click tracking - toggle selection
            if (selectedOrigins.has(clickedZone)) {
                selectedOrigins.delete(clickedZone);
                delete tripData[clickedZone];
                updateDisplay();
                return;
            }

            // If not selected, add it
            selectedOrigins.add(clickedZone);
            handleOriginClick(clickedZone);
        
        }).catch(error => {
            console.error("Error in hitTest:", error);
        });
    });

    // Function to update side panel content
    function updateSidePanel(originFeatures, combinedTrips) {
        const sidePanel = document.getElementById("sidePanel") || createSidePanel();

        let content = `
            <div style="text-align: right;">
                <button onclick="this.parentElement.parentElement.style.display='none'" 
                        style="border: none; background: none; cursor: pointer;">✕</button>
            </div>
            <h3 style="margin-block-start:0px; margin-block-end:0px;">Selected TAZ</h3>
            <p style="margin-block-start:0px;"><em>${selectedRoute} Avenue ${selectedScenario} Contraflow Closure</em></p>
        `;

        originFeatures.forEach(feature => {
            const zoneID = feature.attributes.CUBE_ZONE;
            const totalTrips = Object.values(tripData[zoneID] || {}).reduce((sum, trips) => sum + trips, 0);
            
            content += `
                <div style="margin-bottom: 2px;">
                    <p style="margin-block-end:0px;"><strong>Block Group:</strong> ${zoneID}</p>
                    <p style="margin-block-start:0px;"><strong>Total Outbound Trips:</strong> ${totalTrips}</p>
                    <hr>
                </div>
            `;
        });

        sidePanel.innerHTML = content;
        sidePanel.style.display = "block";
    }

    // Linking logic
    function updateLayerFilter() {
        tripData = {};
        view.graphics.removeAll();
        // Re-run click logic for each already-selected origin
        if (selectedOrigins.size === 0) {
            updateBaseMap();
        } else {
            selectedOrigins.forEach(zoneID => handleOriginClick(zoneID));
        }
        
    }

    // Event handlers for filters
    document.getElementById("routeSelect").addEventListener("change", function(e) {
        selectedRoute = e.target.value;
        // Log the selection
        console.log("Selected route:", selectedRoute);
        updateLayerFilter();
    });

    document.getElementById("scenarioSelect").addEventListener("change", function(e) {
        selectedScenario = e.target.value;
        // Log the selection
        console.log("Selected scenario:", selectedScenario);       
        updateLayerFilter();
    });

     // Update the legend configuration
    const legend = new Legend({
        view: view,
        style: "classic",
        layerInfos: [
            {
                layer: displayLayer,
                title: "Inbound Trips"
            },
            {
                layer: zoneBoundary,
                title: "Traffic Analysis Zone"
            }
        ]
    });

    const legendExpand = new Expand({
        view: view,
        content: legend,
        expanded: true,
        expandIconClass: "esri-icon-legend",
        mode: "floating"
    });

    view.ui.add(legendExpand, "bottom-left");

});
