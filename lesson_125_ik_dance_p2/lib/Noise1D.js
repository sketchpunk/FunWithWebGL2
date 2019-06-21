class Perlin {
    constructor() {
        // Quick and dirty permutation table
        this.perm = (() => {
            const tmp = Array.from({length: 256}, () => Math.floor(Math.random() * 256));
            return tmp.concat(tmp);
        })();
    }

    grad(i, x) {
        const h = i & 0xf;
        const grad = 1 + (h & 7);

        if ((h & 8) !== 0) {
            return -grad * x;
        }

        return grad * x;
    }

    get(x) {
        const i0 = Math.floor(x);
        const i1 = i0 + 1;

        const x0 = x - i0;
        const x1 = x0 - 1;

        let t0 = 1 - x0 * x0;
        t0 *= t0;

        let t1 = 1 - x1 * x1;
        t1 *= t1;

        const n0 = t0 * t0 * this.grad(this.perm[i0 & 0xff], x0);
        const n1 = t1 * t1 * this.grad(this.perm[i1 & 0xff], x1);

        return 0.395 * (n0 + n1); //Output is between -1 and 1.
    }
}

/*
Value noise
What I'm especially proud of with this one is how I made the octaves work properly. For 2 octaves, the division is 2/3 + 1/3, for 3, 4/7, 2/7 and 1/7. This means that amplitude stays reasonably constant.
Feedback on this would be highly appreciated.
Code:

function ValueNoise(values) {
    this.values = Array.isArray(values) ? values : this.generateValues();
    this.smooth = this.interpolate;
}
ValueNoise.prototype = {
    generateValues: function () {
        var result = [];
        for (var i = 0; i < 1234; i++) {
            result.push(Math.random() * 2 - 1); //Output is between -1.. 1
        }
        return result;
    },
    smoothstep: function(a, b, f) {
        var f = f * f * (3 - 2 * f);
        return a + f * (b - a);
    },
    interpolate: function (a, b, f) {
        var f = .5 - Math.cos(f * Math.PI) * .5;
        return a + f * (b - a);
    },
    getValue: function (x) {
        let max = this.values.length,
            ix = Math.floor(x),
            fx = x - ix, // "gradient"
            i1 = (ix % max + max) % max,
            i2 = (i1 + 1) % max;
        return this.smooth(this.values[i1], this.values[i2], fx);
    },
    getValueOctaves: function (x, octaves) {
        if (octaves < 2) {
            return this.getValue(x);
        }
        let result = 0, m, io, c,
                maxo = 1 << octaves,
                fract = 1 / (maxo - 1);
        for (var i = 1; i <= octaves; i++) {
            io = i - 1;
            m = fract * (1 << (octaves - i));
            result += this.getValue(x * (1 << io) + io * .1234) * m;
        }
        return result;
    }
};
*/

export { Perlin };