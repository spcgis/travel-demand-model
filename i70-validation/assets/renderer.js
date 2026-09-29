// Standardized SPC class break functions
// 5 jenks class breaks, each limit is rounded and divisible by 5

// Jenks class breaks algorithm
export function generateClassBreaks(data, numClasses = 5) {
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

// Function to generate arcgis renderer
export function generateRenderer(breaks, colors, outline) {
    return {
        type: "class-breaks",
        defaultSymbol: {
            type: "simple-fill",
            color: colors[0], // for no or null trips
            outline: outline
        },
        defaultLabel: "0 trip",
        classBreakInfos: [
        {
            minValue: 1,
            maxValue: breaks[0],
            symbol: {
                type: "simple-fill",
                color: colors[1],
                outline: outline
            },
            label: `1-${breaks[0]} trips`
        },
        {
            minValue: breaks[0]+1,
            maxValue: breaks[1],
            symbol: {
                type: "simple-fill",
                color: colors[2],
                outline: outline
            },
            label: `${breaks[0]+1}-${breaks[1]} trips`
        },
        {
            minValue: breaks[1]+1,
            maxValue: breaks[2],
            symbol: {
                type: "simple-fill",
                color: colors[3],
                outline: outline
            },
            label: `${breaks[1]+1}-${breaks[2]} trips`
        },
        {
            minValue: breaks[2]+1,
            maxValue: breaks[3],
            symbol: {
                type: "simple-fill",
                color: colors[4],
                outline: outline
            },
            label: `${breaks[2]+1}-${breaks[3]} trips`
        },
        {
            minValue: breaks[3]+1,
            maxValue: 99999999999,
            symbol: {
                type: "simple-fill",
                color: colors[5],
                outline: outline
            },
            label: `>${breaks[3]} trips`
        }
    ]};
}