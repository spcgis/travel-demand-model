// Renderer for app
const [colorRendererCreator] = await $arcgis.import([
    "@arcgis/core/smartMapping/renderers/color.js",
]);

const zoneOutline = { color: [0, 0, 0], width: 1 } // Black outline

export const boundaryRenderer = {
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
//   "inbound": {
//     field: "inbound",
//     colors: tripColors,
//     unit: "trip"
//   },
//   "outbound": {
//     field: "inbound",
//     colors: tripColors,
//     unit: "trip"
//   },
  "intrazonal": {
    field: "intrazonal",
    colors: tripColors,
    unit: "trip"
  },

  "popden": {
    field: "popden",
    colors: [
      [239, 243, 255, 0.7],
      [189, 215, 231, 0.7],
      [107, 174, 214, 0.7],
      [49, 130, 189, 0.7],
      [8, 81, 156, 0.7]
    ],
    unit: "people/sq mile"
  },

  "emden": {
    field: "emden",
    colors: [
      [242, 240, 247, 0.7],
      [203, 201, 226, 0.7],
      [158, 154, 200, 0.7],
      [117, 107, 177, 0.7],
      [84, 39, 143, 0.7]
    ],
    unit: "employee/sq mile"
  }
};

export async function applyRenderer(type, layer) {
    if (type === "none") {
        return boundaryRenderer;
    }

    if (type == "areaType") {
        return areaTypeRenderer;
    }

    const config = rendererConfig[type];

    const { renderer } =
        await colorRendererCreator.createClassBreaksRenderer({
          layer: layer,
          field: config.field,
          classificationMethod: "natural-breaks",
          numClasses: 5
        });
    
    const overallMax = renderer.classBreakInfos.at(-1).maxValue;
    let increment;
    if (overallMax <= 100) {
        increment = 5;
    } else if (overallMax <= 500) {
        increment = 25;
    } else if (overallMax <= 1000) {
        increment = 50;
    } else {
        increment = 100;
    }

    renderer.classBreakInfos.forEach((info, index) => {
        info.minValue = Math.floor(info.minValue / increment) * increment;
        info.maxValue = Math.ceil(info.maxValue / increment) * increment;

        info.symbol.color = config.colors[index];
        info.symbol.outline = zoneOutline;
    });

    return renderer;

}