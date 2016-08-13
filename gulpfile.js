'use strict';
// IMPORTS
// ================================================================================================
const gulp  = require('gulp');
const del   = require('del');
const exec  = require('child_process').exec;
const mocha = require('gulp-mocha');
const gutil = require('gulp-util');

// TASKS
// ================================================================================================
// delete bin folder
gulp.task('clean', function(cb) {
  del(['bin']).then(paths => cb());
});

// compile TypeScript files
gulp.task('compile', ['clean'], function (cb) {  
  exec('tsc -p .', function (err, stdout, stderr) {
    if (stdout.length > 0) console.log(stdout);
    if (stderr.length > 0) console.error(stderr);
    cb(err);
  });
});

// build the project
gulp.task('build', ['compile'], function (cb) {
  gulp.src('./package.json').pipe(gulp.dest('./bin'));
  gulp.src('./pg-dao.d.ts').pipe(gulp.dest('./bin'));
  gulp.src('./.settings/.npmignore').pipe(gulp.dest('./bin'));
  gulp.src('./README.md').pipe(gulp.dest('./bin'));
  cb();
});


// run tests
gulp.task('test', ['build'], function () {
    return gulp.src('./bin/tests/**/*.js', { read: false })
        .pipe( mocha( { reporter: 'spec', timeout: 25000, bail: false } ) )
        .on( 'error', err => {
            if ( err && ( !err.message || !err.message.match( /failed/ ) ) ) {
                gutil.log( gutil.colors.red( JSON.stringify( err, null, 2 ) ) );
            }
        } )
        .once( 'error', () => process.exit( 1 ) )
        .on( 'end', () =>  process.exit( 0 ) );
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