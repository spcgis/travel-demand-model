// URLS
const baseURL = "https://services3.arcgis.com/MV5wh5WkCMqlwISp/arcgis/rest/services/TDM_Validation/FeatureServer/"
export const featureURLS = {
  "ZoneLayer": "https://services3.arcgis.com/MV5wh5WkCMqlwISp/ArcGIS/rest/services/FifthForbes_ThruTrips/FeatureServer/0",
  "cubeLink": baseURL + "0",
  "cubeNode": baseURL + "1",
  "pennDot": baseURL + "2",
  "pennDot_node": baseURL + "3",
  "streetlight": baseURL + "4",
  "streetlight_node": baseURL +"5",
  "zoneData": baseURL + "6"
}


// RENDERER
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
  "intrazonal": {
    field: "intrazonal",
    colors: tripColors,
    unit: "trips"
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
    if (type === "bound") {
        return boundaryRenderer;
    }

    if (type === "areaType") {
        return areaTypeRenderer;
    }

    const config = rendererConfig[type];
    const { renderer } =
        await colorRendererCreator.createClassBreaksRenderer({
          layer: layer,
          field: config.field,
          where: `${config.field} != 0`,
          classificationMethod: "natural-breaks",
          numClasses: 5,
          legendOptions: {
          title:`${config.unit}`
        }
      });
    
    const breaks = renderer.classBreakInfos;
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

    breaks.forEach((info, index) => {
      info.maxValue =
          Math.ceil(info.maxValue / increment) * increment;

      info.minValue =
          index === 0
              ? 1
              : breaks[index - 1].maxValue;

      if (index===4) {
        info.label = `> ${info.minValue.toLocaleString()}`
      } else {
        info.label = `${info.minValue.toLocaleString()} - ${info.maxValue.toLocaleString()}`
      }
      info.symbol.color = config.colors[index];
      info.symbol.outline = zoneOutline;
    });

    renderer.defaultSymbol = {
      type: "simple-fill",
      color: [128, 128, 128, 0.7], 
      outline: zoneOutline
  };
    renderer.defaultLabel = "0";

    return renderer;

}

export const cubeRenderer = {
  type: "unique-value",
  valueExpression: `
    var value = Text($feature.CAPCLASS);
    return Mid(value, 1, 1);
  `,
  valueExpressionTitle: "Functional Class",
  uniqueValueInfos: [
    {
    value: "1",
    symbol: {
      type: "simple-line",
      color: [228, 26, 28, 0.7], 
      width: 4
    },
    label: "Freeway"
  },
  {
    value: "2",
    symbol: {
      type: "simple-line",
      color: [255, 234, 0, 0.7], 
      width: 3
    },
    label: "Expressway"
  },
  {
    value: "3",
    symbol: {
      type: "simple-line",
      color: [51, 51, 255, 0.7], 
      width: 2
    },
    label: "Principal Arterial"
  },
  {
    value: "4",
    symbol: {
      type: "simple-line",
      color: [31, 81, 255, 0.7], 
      width: 2
    },
    label: "Other Arterial / Collector"
  },
  {
    value: "5",
    symbol: {
      type: "simple-line",
      color: [255, 0, 255, 0.7],
      width: 1
    },
    label: "Centroid Connector"
  },
  {
    value: "6",
    symbol: {
      type: "simple-line",
      color: [51, 255, 51, 0.7],
      width: 1
    },
    label: "Ramp"
  }]
}

export function createDiffRenderer (field) {
  return {
    type: "class-breaks",
    field: field,
    classBreakInfos: [
      {
        minValue: -999,
        maxValue: -50,
        label: "< -50%",
        symbol: {
          type: "simple-line",
          color: [27,94,32,0.7],
          width: 7
        }
      },
      {
        minValue: -50,
        maxValue: -25,
        label: "-50% to -25%",
        symbol: {
          type: "simple-line",
          color:[102,187,106,0.7],
          width: 5
        }
      },
      {
        minValue: -25,
        maxValue: -10,
        label: "-25% to -10%",
        symbol: {
          type: "simple-line",
          color: [156,204,101,0.7],
          width: 3
        }
      },
      {
        minValue: -10,
        maxValue: 10,
        label: "-10% to 10%",
        symbol: {
          type: "simple-line",
          color: [128,128,128,0.7],
          width: 2
        }
      },
      {
        minValue: 10,
        maxValue: 25,
        label: "10% to 25%",
        symbol: {
          type: "simple-line",
          color: [255,193,7,0.7],
          width: 3
        }
      },
      {
        minValue: 25,
        maxValue: 50,
        label: "25% to 50%",
        symbol: {
          type: "simple-line",
          color: [239,108,0,0.7],
          width: 5
        }
      },
      {
        minValue: 50,
        maxValue: 999,
        label: "> 50%",
        symbol: {
          type: "simple-line",
          color: [183,28,28,0.7],
          width: 7
        }
      }
    ]
  };
}

export const popupTemplate = {
  zone: {
    title: "Zone: {zone}",
    content: [
      {
        type: "fields",
        fieldInfos: [
          {
            fieldName: "intrazonal",
            label: "Intrazonal Trips"
          },
          {
            fieldName: "inbound",
            label: "Inbound Trips"
          },
          {
            fieldName: "outbound",
            label: "Outbound Trips"
          },
          {
            fieldName: "areaType",
            label: "Area Type"
          },
          {
            fieldName: "popden",
            label: "Population Density"
          },
          {
            fieldName: "emden",
            label: "Employment Density"
          }
        ]
      }
    ]

  },
  link: {
    title: "Link {A}-{B}",
    content: [
      {
        type: "fields",
        fieldInfos: [
          {
            fieldName: "A",
            type: "long"
          },
          {
            fieldName: "B",
            type: "long"
          },
          {
            fieldName: "DISTANCE",
            type: "long"
          },
          {
            fieldName: "CAPCLASS",
            type: "long"
          },
          {
            fieldName: "SPDCLASS",
            type: "long"
          },
          {
            fieldName: "LANES",
            type: "long"
          },
          {
            fieldName: "FUNC",
            type: "short"
          },
          {
            fieldName: "CO",
            type: "short"
          },
          {
            fieldName: "HOV",
            type: "short"
          },
          {
            fieldName: "DIrection",
            label: "Direction"
          },
          {
            fieldName: "UnBuild",
            label: "Unbuild"
          },
          {
            fieldName: "speedChange",
            label: "Speed Change"
          }
        ]
      }
    ]
  },
  node: {
    title: "Node {N}"
  },
  streetlight: {
    title: "Streetlight 2071238",
    content: [
      {
        type: "fields",
        fieldInfos: [{
          fieldName: "name",
          label: "Street Name"
        },
        {
          fieldName: "Estimated",
          label: "2025 ADT"
        }]
      }
    ]
  }
}