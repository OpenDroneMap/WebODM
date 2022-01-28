// Sass configuration
var gulp = require("gulp"),
    sass = require("gulp-sass"),
    postcss = require("gulp-postcss"),
    autoprefixer = require("autoprefixer"),
    cssnano = require("cssnano"),
    sourcemaps = require("gulp-sourcemaps");

function watch() {

    style();

    gulp.watch('css/*.scss', style);

}

function style() {

    return (
        gulp
        .src('css/*.scss')
        .pipe(sourcemaps.init())
        .pipe(sass())
        .on("error", sass.logError)
        // Aggiungiamo i prefissi dove serve e minifichiamo
        .pipe(postcss([autoprefixer(), cssnano()]))
        // Le sourcemaps non fanno mai male
        .pipe(sourcemaps.write("."))
        .pipe(gulp.dest(function(f) {
            return "./css";
        }))
    );
}

exports.watch = watch;
exports.style = style;
