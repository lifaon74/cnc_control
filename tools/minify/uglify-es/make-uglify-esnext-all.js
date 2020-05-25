const makeUglify = require('./make-uglify');

makeUglify('dist/global/cnc_control.esnext.umd.js', {
  compress: {
    inline: false
  },
});
