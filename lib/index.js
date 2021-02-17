const { src, dest, series, parallel, watch } = require('gulp');

const del = require('del'); //清除

const browserSync = require('browser-sync');

// 自动导入gulp插件
const loadPlugins = require('gulp-load-plugins');

const plugins = loadPlugins();

const bs = browserSync.create();

// const sass = require('gulp-sass');
// const babel = require('gulp-babel');
// const swig = require('gulp-swig') //页面模板处理
// const imagemin = require('gulp-imagemin') //图片处理

const cwd = process.cwd();
let config = {
  // default config
  build: {
    src: 'src',
    dist: 'dist',
    temp: 'temp',
    public: 'public',
    paths: {
      styles: 'assets/styles/*.scss',
      scripts: 'assets/scripts/*.js',
      pages: '*.html',
      images: 'assets/images/**',
      fonts: 'assets/fonts/**',
    },
  },
};

try {
  const loadConfig = require(`${cwd}/pages.config.js`);
  config = Object.assign({}, config, loadConfig);
} catch (err) {}

const clean = () => {
  return del([config.build.dist, config.build.temp]);
};
const cleanTemp = () => {
  return del(config.build.temp);
};

const style = () => {
  return src(config.build.paths.styles, {
    base: config.build.src,
    cwd: config.build.src,
  })
    .pipe(plugins.sass({ outputStyle: 'expanded' }))
    .pipe(dest(config.build.temp))
    .pipe(bs.reload({ stream: true }));
};

const script = () => {
  return src(config.build.paths.scripts, {
    base: config.build.src,
    cwd: config.build.src,
  })
    .pipe(plugins.babel({ presets: [require('@babel/preset-env')] }))
    .pipe(dest(config.build.temp))
    .pipe(bs.reload({ stream: true }));
};

const page = () => {
  return src(config.build.paths.pages, {
    base: config.build.src,
    cwd: config.build.src,
  })
    .pipe(plugins.swig({ data: config.data, defaults: { cache: false } })) // 防止模板缓存导致页面不能及时更新
    .pipe(dest(config.build.temp))
    .pipe(bs.reload({ stream: true }));
};

const image = () => {
  return src(config.build.paths.images, {
    base: config.build.src,
    cwd: config.build.src,
  })
    .pipe(plugins.imagemin())
    .pipe(dest(config.build.dist));
};
const font = () => {
  return src(config.build.paths.fonts, {
    base: config.build.src,
    cwd: config.build.src,
  })
    .pipe(plugins.imagemin())
    .pipe(dest(config.build.dist));
};

const extra = () => {
  return src('**', {
    base: config.build.public,
    cwd: config.build.public,
  }).pipe(dest(config.build.dist));
};

const other = async () => {
  return await Promise.resolve(bs.reload());
};

const serve = () => {
  watch(config.build.paths.styles, {cwd: config.build.src}, style);
  watch(config.build.paths.scripts, {cwd: config.build.src}, script);
  watch(config.build.paths.pages, {cwd: config.build.src}, page);
  // watch('src/assets/images/**',image)
  // watch('src/assets/fonts/**',font)
  // watch('public/**',extra)

  watch([config.build.paths.images, config.build.paths.fonts] ,{cwd: config.build.src}, other);
  watch( '**' , {cwd: config.build.public}, other)

  bs.init({
    notify: false,
    port: 7777,
    // open: false,
    // files: 'dist/**',
    server: {
      baseDir: [config.build.temp, config.build.src, config.build.public],
      routes: {
        '/node_modules': 'node_modules',
      },
    },
  });
};

const useref = () => {
  return src(config.build.paths.pages, { base: config.build.temp,cwd: config.build.temp })
    .pipe(plugins.useref({ searchPath: [config.build.temp, '.'] }))
    .pipe(plugins.if(/\.js$/, plugins.uglify()))
    .pipe(plugins.if(/\.css$/, plugins.cleanCss()))
    .pipe(
      plugins.if(
        /\.html$/,
        plugins.htmlmin({
          collapseWhitespace: true,
          minifyCSS: true,
          minifyJS: true,
        })
      )
    )
    .pipe(dest(config.build.dist));
};

const compile = parallel(style, script, page);

// 上线之前执行的任务
const build = series(
  clean,
  parallel(series(compile, useref), image, font, extra),
  cleanTemp
);

const develop = series(compile, serve);

module.exports = {
  build,
  clean,
  develop,
};
