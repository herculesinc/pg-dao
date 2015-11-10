var gulp = require('gulp');
var del = require('del');
var exec = require('child_process').exec;
var mocha = require('gulp-mocha');
var babel = require("gulp-babel");
var sourcemaps = require('gulp-sourcemaps');

// delete bin folder
gulp.task('clean', function(cb) {
  del(['bin'], cb);
});

// compile TypeScript files
gulp.task('build', ['transpile'], function (cb) {
  gulp.src('./package.json').pipe(gulp.dest('./bin'));
  gulp.src('./.settings/.npmignore').pipe(gulp.dest('./bin'));
  gulp.src('./README.md').pipe(gulp.dest('./bin'));
  cb();
});

// compile task (TypeScript->ES6)
gulp.task('compile', ['clean'], function (cb) {  
  exec('tsc -p .', function (err, stdout, stderr) {
    if (stdout.length > 0) console.log(stdout);
    if (stderr.length > 0) console.error(stderr);
    cb(err);
  });
});


// transpile task (ES6->ES5)
gulp.task('transpile', ['compile'], function () {
    return gulp.src('./bin/**/*.js')
        .pipe(sourcemaps.init({ loadMaps: true }))
        .pipe(babel({'whitelist': [
          'strict',
          //'es6.arrowFunctions',
          //'es6.blockScoping',
          //'es6.classes',
          //'es6.constants',
          'es6.destructuring',
          //'es6.forOf',
          //'es6.modules',
          'es6.parameters',
          //'es6.properties.computed',
          //'es6.properties.shorthand',
          //'es6.spread',
          //'es6.tailCall',
          //'es6.templateLiterals',
          //'es6.regex.unicode',
          //'es6.regex.sticky'
        ]}))
        .pipe(sourcemaps.write('../bin', { includeContent: false }))
        .pipe(gulp.dest('./bin'));
});

// run tests
gulp.task('test', ['build'], function () {
    return gulp.src('./bin/tests/**/*.js', {read: false})
        .pipe(mocha({reporter: 'spec'}))
        .once('end', function () {
          process.exit();
        });
});

// publish to npm
gulp.task('publish', ['build'], function (cb) {
  exec('npm publish bin --access=public', function (err, stdout, stderr) {
    if (stdout.length > 0) console.log(stdout);
    if (stderr.length > 0) console.error(stderr);
    cb(err);
  });
});

// define default task
gulp.task('default', ['build']);