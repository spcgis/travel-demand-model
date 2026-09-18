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

    let originTripData = {};  
    let displayRun = 0;       
    let filterVersion = 0;    

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
    async function updateBaseMap() {
        view.graphics.removeAll();
        tripData = {};

        let targetCols;

        if (selectedRoute === "Both") {
            targetCols = [
                selectedScenario + "Forbes",
                selectedScenario + "Fifth"
            ];
        } else {
            targetCols = [
                selectedScenario + selectedRoute
            ];
        }

        const queryTable = getQueryTable("summaryTable");

        try {
            await queryTable.load();

            console.log("Selected:", targetCols);

            const results = await queryTable.queryFeatures({
                where: "1=1",
                outFields: ["*"],
                returnGeometry: false
            });

            results.features.forEach(feature => {
                const attrs = feature.attributes;
                const zone = attrs["Zone"];

                const total = targetCols.reduce((sum, fieldName) => {
                    return sum + (Number(attrs[fieldName]) || 0);
                }, 0);

                tripData[zone] = total;
            });

            const sortedCounts = Object.values(tripData)
                .sort((a, b) => a - b);

            if (
                sortedCounts.length > 0 &&
                sortedCounts[sortedCounts.length - 1] > 200
            ) {
                displayLayer.renderer = generateRenderer(
                    generateClassBreaks(sortedCounts)
                );
            } else {
                displayLayer.renderer = generateRenderer([
                    5, 10, 25, 50
                ]);
            }

            // Query the display layer for the geometries to draw
            const displayResults = await displayLayer.queryFeatures({
                where: "1=1",
                returnGeometry: true,
                outFields: ["CUBE_ZONE"]
            });

            displayResults.features.forEach(feature => {
                const zone = feature.attributes["CUBE_ZONE"];
                const tripCount = tripData[zone] || 0;

                const color = getColorFromRenderer(
                    displayLayer.renderer,
                    tripCount
                );

                view.graphics.add({
                    geometry: feature.geometry,
                    symbol: {
                        type: "simple-fill",
                        color: color,
                        outline: {
                            color: [0, 128, 0],
                            width: 1
                        }
                    }
                });
            });

            baseSidePanel();
            updateLegend("Outbound Trips");

        } catch (error) {
            console.error("Error updating base map:", error);
        }
    }


    // Function to update side-panel display with base map information
    function baseSidePanel() {
        let sidePanel = document.getElementById("sidePanel");
        if (!document.getElementById("sidePanel")) {
            sidePanel = createSidePanel();
        }

        const totalTrips = Object.values(tripData)
            .reduce((total, value) => {
                return total + (Number(value) || 0);
            }, 0);

        const content = `
            <div style="text-align: right;">
                <button onclick="this.parentElement.parentElement.style.display='none'" 
                        style="border: none; background: none; cursor: pointer;">✕</button>
            </div>
            <h3 style="margin-block-start:0px; margin-block-end:0px;">Total Through Trips</h3>
            <p style="margin-block-start:0px;">
                <em>${selectedRoute} Avenue ${selectedScenario} Contraflow Closure</em>
            </p>
            <div style="margin-bottom: 2px;">
                <p style="margin-block-start:0px;">
                    <strong>Total Through Trips:</strong> ${totalTrips}
                </p>
                <hr>
            </div>
        `;

        sidePanel.innerHTML = content;
        sidePanel.style.display = "block";
    }

    // Initialize base map
    updateBaseMap();

    // Helper to aggregate results into a target object
    function aggregate(results, target) {
        results.features.forEach(f => {
            const destId = f.attributes["toZone"];
            const trips = Number(f.attributes["vehTrip"]) || 0;
            target[destId] = (target[destId] || 0) + trips;
        });
    }

    // Query the needed table(s) for one origin and return { dest -> trips }
    async function fetchOriginTrips(clickedZone) {
        const whereClause = `fromZone = '${clickedZone}'`;
        console.log("Query for TAZs:", whereClause);

        const tableNames = selectedRoute === "Both"
            ? [selectedScenario + "Fifth", selectedScenario + "Forbes"]
            : [selectedScenario + selectedRoute];

        const resultsList = await Promise.all(tableNames.map(async name => {
            const table = getQueryTable(name);
            await table.load();
            const results = await table.queryFeatures({
                where: whereClause,
                outFields: ["toZone", "vehTrip"],
                returnGeometry: false
            });
            console.log(`${name} results:`, {
                originId: clickedZone,
                featuresFound: results.features.length
            });
            return results;
        }));

        const aggregated = {};
        resultsList.forEach(r => aggregate(r, aggregated));
        return aggregated;
    }

    // Function to handle origin click
    async function handleOriginClick(clickedZone) {
        const version = filterVersion;
        try {
            const aggregated = await fetchOriginTrips(clickedZone);

            // Discard if the scenario/route changed or the origin was deselected while loading
            if (version !== filterVersion || !selectedOrigins.has(clickedZone)) return;

            // An empty {} is fine: the origin still gets its red border
            originTripData[clickedZone] = aggregated;

            console.log("Results summary:", {
                originId: clickedZone,
                totalDestinations: Object.keys(aggregated).length,
                totalTrips: Object.values(aggregated).reduce((sum, t) => sum + t, 0)
            });

            updateDisplay();
        } catch (error) {
            console.error("Error handling origin click:", error);
        }
    }

    // Linking logic: re-run every selected origin after scenario/route changes
    async function updateLayerFilter() {
        const version = ++filterVersion;
        originTripData = {};
        view.graphics.removeAll();

        if (selectedOrigins.size === 0) {
            updateBaseMap();
            return;
        }

        try {
            const entries = await Promise.all(
                Array.from(selectedOrigins).map(async zone => [zone, await fetchOriginTrips(zone)])
            );
            if (version !== filterVersion) return;   // superseded by a newer change

            entries.forEach(([zone, dests]) => { originTripData[zone] = dests; });
            updateDisplay();
        } catch (error) {
            console.error("Error refreshing origins:", error);
        }
    }

    // Function to dynamically update display after an origin click
    async function updateDisplay() {
        const run = ++displayRun;
        view.graphics.removeAll();

        if (selectedOrigins.size === 0) {
            updateBaseMap();
            return;
        }

        // Combine first so the class breaks match the values actually colored
        const combinedTrips = {};
        Object.values(originTripData).forEach(dests => {
            Object.entries(dests).forEach(([destId, trips]) => {
                combinedTrips[destId] = (combinedTrips[destId] || 0) + trips;
            });
        });

        const sortedCounts = Object.values(combinedTrips).sort((a, b) => a - b);
        displayLayer.renderer = generateRenderer(
            sortedCounts.length && sortedCounts[sortedCounts.length - 1] > 200
                ? generateClassBreaks(sortedCounts)
                : [5, 10, 25, 50]
        );

        try {
            const originQuery = displayLayer.createQuery();
            originQuery.where = `CUBE_ZONE IN (${Array.from(selectedOrigins).map(id => `'${id}'`).join(",")})`;
            originQuery.outFields = ["CUBE_ZONE"];
            originQuery.returnGeometry = true;

            // Drop the quotes on both IN lists if CUBE_ZONE is a numeric field
            const destIds = Object.keys(combinedTrips);
            let destQuery = null;
            if (destIds.length) {
                destQuery = displayLayer.createQuery();
                destQuery.where = `CUBE_ZONE IN (${destIds.map(id => `'${id}'`).join(",")})`;
                destQuery.outFields = ["CUBE_ZONE"];
                destQuery.returnGeometry = true;
            }

            const [originResults, destResults] = await Promise.all([
                displayLayer.queryFeatures(originQuery),
                destQuery ? displayLayer.queryFeatures(destQuery) : Promise.resolve({ features: [] })
            ]);
            if (run !== displayRun) return;   // a newer update superseded this one

            updateSidePanel(originResults.features);

            // Destinations: color fills
            destResults.features.forEach(f => {
                const tripCount = combinedTrips[f.attributes.CUBE_ZONE] || 0;
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

            // Selected origins: red border on top (drawn even with zero destinations)
            originResults.features.forEach(f => {
                view.graphics.add({
                    geometry: f.geometry,
                    symbol: {
                        type: "simple-fill",
                        color: [0, 0, 0, 0],
                        outline: { color: [255, 0, 0], width: 3 }
                    }
                });
            });
        updateLegend("Inbound Trips");
        } catch (error) {
            console.error("Error updating display:", error);
        }
    }

    view.on("click", function (event) {
        view.hitTest(event, { include: [displayLayer] }).then(function (response) {
            const result = response.results[0];

            // Click on empty space
            if (!result) {
                return;
            }

            const clickedZone = result.graphic.attributes.CUBE_ZONE;
            if (!clickedZone) {
                console.error("No TAZ found in clicked feature.");
                return;
            }

            if (selectedOrigins.has(clickedZone)) {
                selectedOrigins.delete(clickedZone);
                delete originTripData[clickedZone];
                updateDisplay();
                return;
            }

            selectedOrigins.add(clickedZone);
            handleOriginClick(clickedZone);
        }).catch(error => {
            console.error("Error in hitTest:", error);
        });
    });
    
    function updateSidePanel(originFeatures) {
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
            const totalTrips = Object.values(originTripData[zoneID] || {})
                .reduce((sum, trips) => sum + trips, 0);

            content += `
                <div style="margin-bottom: 2px;">
                    <p style="margin-block-end:0px;"><strong>TAZ:</strong> ${zoneID}</p>
                    <p style="margin-block-start:0px;"><strong>Total Outbound Trips:</strong> ${Math.round(totalTrips)}</p>
                    <hr>
                </div>
            `;
        });

        sidePanel.innerHTML = content;
        sidePanel.style.display = "block";
    }

    let legend;
    let legendExpand;

    legend = new Legend({
        view: view,
        style: "classic",
        layerInfos: [
            {
                layer: displayLayer,
                title: "Outbound Trips"
            },
            {
                layer: zoneBoundary,
                title: "Traffic Analysis Zone"
            }
        ]
    });

    legendExpand = new Expand({
        view: view,
        content: legend,
        expanded: true,
        expandIconClass: "esri-icon-legend",
        mode: "floating"
    });

    view.ui.add(legendExpand, "bottom-left");

    function updateLegend(countLabel) {
        legend.layerInfos = [
            {
                layer: displayLayer,
                title: countLabel
            },
            {
                layer: zoneBoundary,
                title: "Traffic Analysis Zone"
            }
        ];
    }

    // Event handlers for filters
    document.getElementById("routeSelect").addEventListener("change", function (e) {
        selectedRoute = e.target.value;
        console.log("Selected route:", selectedRoute);
        updateLayerFilter();
    });

    document.getElementById("scenarioSelect").addEventListener("change", function (e) {
        selectedScenario = e.target.value;
        console.log("Selected scenario:", selectedScenario);
        updateLayerFilter();
    });
});
