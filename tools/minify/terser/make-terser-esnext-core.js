const makeTerser = require('./make-terser');

makeTerser('dist/global/cnc_control.esnext.core.umd.js', {
  compress: {
    inline: false,
    ecma: 6,
    unsafe_arrows: true,
    unsafe_comps: true,
    unsafe_methods: true,
    unsafe_undefined: true,
    warnings: true,
  },
});
