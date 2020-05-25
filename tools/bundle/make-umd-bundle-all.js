const rollupBundle = require('./rollup-bundle');

rollupBundle({
  input: 'dist/esm5_for_rollup/public.js',
  dest: 'dist/global/cnc_control.umd.js',
});
