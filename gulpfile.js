const path = require('path');
const gulp = require('gulp');
const gulpPlugins = require('gulp-load-plugins')();
const $path = require('path');
// const gutil = require('gulp-util');

// console.log(gulpPlugins);

const tsProjects = {
  'esnext': gulpPlugins.typescript.createProject('tsconfig.json', {
    module: 'commonjs',
    // module: 'es',
    target: 'esnext',
  }),
  'es5': gulpPlugins.typescript.createProject('tsconfig.json', {
    module: 'amd',
    target: 'es5',
  })
};

// const BASE = './';
const BASE = './src';
const SRC_DIR = 'src';
const TS_MODULES_DIR = 'ts_modules';
// const SRC_TS_FILES = [path.join(SRC_DIR, '**', '*.ts'), path.join(TS_MODULES_DIR, '**', '*.ts')];
const SRC_TS_FILES = [path.join(SRC_DIR, '**', '*.ts')]; // , path.join(TS_MODULES_DIR, '**', '*.ts')
// const SRC_TS_FILES =  ['./src/decorator.ts', './src/classes/misc/ClassHelper.ts'];
const SRC_OTHER_FILES = [
  path.join(SRC_DIR, '**'),
  '!' + SRC_TS_FILES[0]
];

const DEST_DIR = 'dist';
const RASPI_DEST_DIR = '\\\\RASPI\\home\\workspace\\cnc_control\\dist';

function compileTs(buildOptions) {
  // options = Object.assign({
  //   sources: true,
  // }, options);

  let tsProjectConfig = {
    target: buildOptions.target,
    module: buildOptions.module
  };

  const tsProject = gulpPlugins.typescript.createProject('tsconfig.json', tsProjectConfig);

  return function _compileTs() {

    return gulp.src(SRC_TS_FILES, { base: BASE })
      .pipe(gulpPlugins.cached('tsc'))
      .pipe(gulpPlugins.progeny())
      .pipe(gulpPlugins.debug({ title: 'tsc:' }))
      .pipe(gulpPlugins.sourcemaps.init())
      .pipe(tsProject())
      .pipe(gulpPlugins.sourcemaps.write())
      // .pipe(gulp.dest(RASPI_DEST_DIR))
      .pipe(gulp.dest(path.join(DEST_DIR, buildOptions.target)));
  };
}

function copyOtherFiles(buildOptions) {
  return function _copyOtherFiles() {
    return gulp.src(SRC_OTHER_FILES, { base: BASE })
      .pipe(gulpPlugins.cached('others'))
      // .pipe(gulp.dest(RASPI_DEST_DIR))
      .pipe(gulp.dest(path.join(DEST_DIR, buildOptions.target)));
  };
}

function bundle(buildOptions) {
  return function _bundle() {
    console.log(path.join(DEST_DIR, buildOptions.target, buildOptions.main));

    // return gulp.src(path.join(DEST_DIR, buildOptions.target, '**', '*.js'))
    return gulp.src(path.join(DEST_DIR, buildOptions.target, '**', '*.js'))
      .pipe(gulpPlugins.rollup({
        entry: path.join(DEST_DIR, buildOptions.target, buildOptions.main)
      }))
      .pipe(gulp.dest(path.join(DEST_DIR, buildOptions.target, 'bundle')));
  };
}


function build(buildOptions) {
  return gulp.parallel(compileTs(buildOptions), copyOtherFiles(buildOptions));
}

function buildAndBundle(buildOptions) {
  return gulp.series(build(buildOptions), bundle(buildOptions));
}

const configs = {
  'esnext nodejs': {
    module: 'commonjs',
    // target: 'es5',
    target: 'esnext',
    env: 'nodejs',
    main: 'test.js'
  },
  'esnext browser': {
    module: 'es6',
    target: 'esnext',
    env: 'browser',
    main: 'webcomponents.js'
  },
  'es5 browser': {
    module: 'es6',
    target: 'es5',
    env: 'browser',
    main: 'webcomponents.js'
  }
};

const config = configs['esnext nodejs'];

gulp.task('build', build(config));
gulp.task('bundle', bundle(config));

// gulp.task('watch', ['build.js', 'build.others'], () => {
//   gulp.watch(path.join(SRC_DIR, '**'), ['build.js', 'build.others']);
// });
gulp.task('watch', () => {
  gulp.watch(
    path.join(SRC_DIR, '**'),
    build(config)
  );
});

