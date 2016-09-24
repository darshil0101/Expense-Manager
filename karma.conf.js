'use strict';
module.exports = function(config) {
    var browsers =  require('os').platform() === 'win32' ? ['Chrome'] :['PhantomJS'];
    config.set({
        browsers: browsers,
        frameworks: ['jasmine'],
        singleRun: true,
        files: [
            'bower_components/jquery/dist/jquery.js',
            'bower_components/angular/angular.js',
            'bower_components/angular-animate/angular-animate.js',
            'bower_components/angular-mocks/angular-mocks.js',
            'bower_components/lodash/lodash.js',
            'bower_components/angular-route/angular-route.js',
            'bower_components/angular-hotkeys/build/hotkeys.js',
            'bower_components/bootstrap/dist/js/bootstrap.js',
            { pattern: 'src/**/*.js', watched: false},
            { pattern: 'test/**/*spec.js', watched: false },
        ],

    preprocessors: {
      'src/**/*.js': ['babel', 'coverage'],
      'test/**/*spec.js': ['babel']
    },
    babelPreprocessor: {
      options: {
        presets: ['es2015'],
        sourceMap: 'inline'
      },
      filename: function (file) {
        return file.originalPath.replace(/\.js$/, '.es5.js');
      },
      sourceFileName: function (file) {
        return file.originalPath;
      }
    },
    reporters: [
      'coverage'
    ],

        specReporter: {
            suppressPassed: true
        },

        coverageReporter: {
            reporters: [
                { type: 'text' },
                { type: 'cobertura' }
            ]
        }
    });
};