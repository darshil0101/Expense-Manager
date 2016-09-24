var gulp = require('gulp');
var gulpif = require('gulp-if');
var gutil = require('gulp-util');
var newer          = require('gulp-newer');
var cache          = require('gulp-cached');
var concat         = require('gulp-concat');
var sourcemaps     = require('gulp-sourcemaps');
var rev            = require('gulp-rev');
var uglify         = require('gulp-uglify');
var babel          = require('gulp-babel');
var ngAnnotate     = require('gulp-ng-annotate');
var sass           = require('gulp-sass');
var mainBowerFiles = require('main-bower-files');
var argv           = require('yargs').argv;
var es             = require('event-stream');
var zip            = require('gulp-zip');
var childProcess    = require('child_process');
var fs              = require('fs');

var paths = {
    lintFiles: [
        'gulpfile.js',
        'src/**/*.js',
        'test/**/*.spec.js'
    ],

    sourceFiles: [
        'src/**/*.js'
    ],

    testFiles: [
        'test/**/*.spec.js'
    ]
};

var config = {
    appName:        'pat2App',
    dest:            'dist',
    sourceRoot:      'src',
    isProduction:    (process.env.GULP_ENV === 'production')
};

if (argv.production) {
    process.env.NODE_ENV = 'production';
}
else if (typeof process.env.NODE_ENV === 'undefined') {
    process.env.NODE_ENV = 'development';
}

/*
 * Clean up docs directory.
 */
gulp.task('clean:docs', function (done) {
    var del = require('del');

    del([
        'docs/'
    ], done);
});

/*
 * Clean up coverage directory.
 */
gulp.task('clean:coverage', function (done) {
    var del = require('del');

    del([
        'coverage/'
    ], done);
});

/*
 * Clean up dist directory.
 */
gulp.task('clean:dist', function (done) {
    var del = require('del');

    del([
        'dist/*.*',
        'deploy.zip'
    ], done);
});

/*
 * Run source files through JSCS style checks.
 */
gulp.task('jscs', function () {
    var jscs = require('gulp-jscs');

    return gulp.src(paths.lintFiles)
        .pipe(jscs({fix: true}))
        .pipe(jscs.reporter())
        .pipe(jscs.reporter('fail'));
});

/*
 * Generate source documentation.
 */
gulp.task('jsdoc', gulp.series('clean:docs', function jsdoc () {
    var jsdocTool   = require('gulp-jsdoc');
    var jsdocConfig = JSON.parse(require('fs').readFileSync('.jsdocrc'));

    return gulp.src(jsdocConfig.source.include)
        .pipe(jsdocTool(
            jsdocConfig.opts.destination,
            jsdocConfig.templates,
            jsdocConfig.opts
        ));
}));

/*
 * Run source files through JSHint lint checks.
 */
gulp.task('jshint', function () {
    var jshint = require('gulp-jshint');

    return gulp.src(paths.lintFiles)
        .pipe(jshint())
        .pipe(jshint.reporter('jshint-stylish'))
        .pipe(jshint.reporter('fail'));
});

/*...*/
gulp.task('bower', function () {
    return gulp.src(mainBowerFiles(), { base: '.' })
        .pipe(gulp.dest('dist'));
});

gulp.task('sha', function(done) {
    childProcess.exec('git rev-parse HEAD', function(err, stdout) { //to get the SHA1 of HEAD
        if (err) {
            done(err);
        } else {
            fs.readFile('./package.json', function(err, data) {
                if (err) {
                    done(err);
                } else {
                    var commit = JSON.parse(data).homepage + '/commit/' + stdout;

                    fs.stat('./dist', function(err) {
                        if (!err) {
                            fs.writeFile('./dist/sha.txt', commit, done);
                        } else {
                            fs.mkdir('./dist', function(err) {
                                if (err) {
                                    done(err);
                                } else {
                                    fs.writeFile('./dist/sha.txt', commit, done);
                                }
                            });
                        }
                    });
                }
            });
        }
    });
});

/*
 * Task to inject  links to css and js files (app and vendor)
 */
gulp.task('inject', function () {
    var path            = require('path');
    var cdnizer = require('gulp-cdnizer');
    var inject = require('gulp-inject');
    return gulp
        .src([ 'src/*.html' ])
        .pipe(inject(gulp.src(mainBowerFiles(), { read: false }),
            { addRootSlash: false, relative: false, name: 'bower' }))
        .pipe(inject(gulp.src([ './*.js', './*.css' ],
            { read: false, cwd:path.join(__dirname, '/dist') }), { addRootSlash: false }))
        .pipe(cdnizer({
          defaultCDNBase: 'https://cdnjs.cloudflare.com/ajax/libs',
          defaultCDN: '${defaultCDNBase}/${package}/${versionFull}/${filenameMin}',
          files:[
            {
              file: 'bower_components/jquery/dist/jquery.min.js',
              package: 'jquery',
              cdn: '${defaultCDNBase}/${package}/${versionFull}/${filenameMin}',
              test: 'window.jQuery'
            },
            {
              file: 'bower_components/lodash/lodash.min.js',
              package: 'lodash',
              cdn: '${defaultCDNBase}/${package}/${versionFull}/${filenameMin}',
              test: 'window._'
            },
            {
              file: 'bower_components/angular/angular.min.js',
              package: 'angular',
              cdn: '${defaultCDNBase}/${package}/${versionFull}/${filenameMin}',
              test: 'window.angular'
            },
            {
              file: 'bower_components/angular-animate/angular-animate.min.js',
              package: 'angular-animate',
              cdn: '${defaultCDNBase}/${package}/${versionFull}/${filenameMin}',
            },
            {
              file: 'bower_components/angular-route/angular-route.min.js',
              package: 'angular-route',
              cdn: '${defaultCDNBase}/${package}/${versionFull}/${filenameMin}',
            }
          ]
        }))
        .pipe(gulp.dest('./dist'));
});

function getTemplateCache() {
    var minifyHtml = require('gulp-minify-html');
    var templatecache  = require('gulp-angular-templatecache');
    return gulp
        .src([ config.sourceRoot + '/**/*.html' ])
        .pipe(minifyHtml({
            empty: true,
            spare: true,
            quotes: true
        }))
        .pipe(templatecache('templateCacheHtml.js', {
            module: 'pat2App',
            root: ''
        }));
}

/*
 * Task to concat and minify scripts
 */
gulp.task('scripts', function () {

    return es.merge([ gulp.src([ config.sourceRoot + '/app.js', config.sourceRoot + '/**/*.js' ]), getTemplateCache() ])
        .pipe(newer('app.js'))
        .pipe(sourcemaps.init({ loadMaps: true }))
        .pipe(cache('app.js'))
        .pipe(babel())
        .pipe(ngAnnotate())
        .pipe(concat('app.js'))
        .pipe(gulpif(argv.production, uglify()))
        .pipe(rev())
        .pipe(sourcemaps.write('./'))
        .pipe(gulp.dest(config.dest));
});

/*
 * Task to concat and minify CSS files
 */
gulp.task('styles', function () {
    var concatCss = require('gulp-concat-css');
    var minifyCss = require('gulp-minify-css');
    return gulp
        .src([ config.sourceRoot + '/**/*.scss' ])
        .pipe(newer('app.css'))
        .pipe(sourcemaps.init())
        .pipe(cache('app.css'))
        .pipe(sass({
            style: 'expanded'
        }))
        .pipe(concatCss('app.css'))
        .pipe(minifyCss())
        .pipe(rev())
        .pipe(sourcemaps.write()) //todo figure out why sourcemap does not work properly
        .pipe(gulp.dest(config.dest));
});

gulp.task('test:unit', function (done) {
    var server = require('karma').Server;
    new server({
        configFile: __dirname + '/karma.conf.js',
        singleRun: true
    }, done).start();
});

gulp.task('compress', function () {
    return gulp.src('dist/**')
        .pipe(zip('deploy.zip'))
        .pipe(gulp.dest('./'));
});

/*
 * Register aggregate tasks.
 */
gulp.task('clean',   gulp.parallel('clean:docs', 'clean:coverage', 'clean:dist'));
gulp.task('lint',    gulp.parallel('jshint', 'jscs'));
gulp.task('build',   gulp.series('lint', 'clean', gulp.parallel('styles', 'scripts'), 'inject'));
gulp.task('test',    gulp.parallel('test:unit'));
gulp.task('default', gulp.parallel('build', 'test', 'jsdoc'));
gulp.task('deploy', gulp.series('default', 'bower', 'compress'));
gulp.task('release', gulp.series('build','jsdoc','bower', 'sha', 'compress'));

/*
 * Watch for file changes to either source, or test, files, and execute the appropriate task(s) associated with the
 * changed file(s).
 */
gulp.task('watch', gulp.series('default', function () {
    var watch = require('gulp-watch');

    watch(paths.lintFiles, function () {
        gulp.start('lint');
    });

    watch(paths.sourceFiles.concat(paths.testFiles), function () {
        gulp.start('test');
    });

    //watch(paths.sourceFiles, function () {
    //    //gulp.start('jsdoc');
    //});
}));