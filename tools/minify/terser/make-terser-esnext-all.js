const makeTerser = require('./make-terser');

makeTerser('dist/global/cnc_control.esnext.umd.js', {
  compress: {
    inline: false
  },
});
