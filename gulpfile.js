var gulp = require('gulp');
var shell = require('gulp-shell');
var del = require('del');
var browserify = require('browserify');
var source = require('vinyl-source-stream');
var jasmine = require('gulp-jasmine');
var istanbul = require("gulp-istanbul");

gulp.task('build:compile', shell.task('tsc', {cwd: __dirname}))
gulp.task('build:browserify', ['build:compile'], () => {
	var b = browserify({ debug: true });
	b.require("./lib/index.js", {
		expose: '@cross-border-bridge/function-channel'
	});
	return b.bundle()
		.pipe(source('function-channel.js'))
		.pipe(gulp.dest('build'))
})
gulp.task('test', ['build:compile'], () => {
	gulp.src("lib/**/*.js")
		.pipe(istanbul())
		.pipe(istanbul.hookRequire())
		.on("finish",function(){
			gulp.src("spec/**/*Spec.js")
			.pipe(jasmine())
			.on('error', process.exit.bind(process, 1))
			.pipe(istanbul.writeReports());
		});
});
gulp.task('build', ['build:compile', 'build:browserify', 'test'])
gulp.task('clean', del.bind(null, ["./lib"]))
gulp.task('install:typings', ['clean:typings'], shell.task('typings install'))
gulp.task('clean:typings', del.bind(null, ["./typings"]))

