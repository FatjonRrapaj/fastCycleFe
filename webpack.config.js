const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");

const pages = ["projects", "experience", "contact", "blog"];
const lessons = [
  "notes/js-arrays-objects-for-loops",
  "notes/js-event-listeners",
  "notes/js-interactions-html-forms",
  "notes/css-box-model",
  "notes/css-flexbox",
  "notes/css-element-positioning",
  "notes/hyrje-ne-html",
  "notes/html-tables",
  "notes/html-forms-and-form-elements",
  "notes/hyrje-ne-react",
  "notes/jsx",
  "notes/react-useeffect-hook",
];

module.exports = {
  entry: {
    main: "./src/index.js",
    site: "./src/site.js",
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].bundle.js",
    clean: true,
    publicPath: "/",
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"],
      },
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: ["@babel/preset-env"],
          },
        },
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: "./src/index.html",
      filename: "index.html",
      chunks: ["main"],
    }),
    ...pages.map(
      (page) =>
        new HtmlWebpackPlugin({
          template: `./src/pages/${page}.html`,
          filename: `${page}.html`,
          chunks: ["site"],
        })
    ),
    ...lessons.map(
      (lesson) =>
        new HtmlWebpackPlugin({
          template: `./src/pages/${lesson}.html`,
          filename: `${lesson}.html`,
          chunks: ["site"],
        })
    ),
    new CopyWebpackPlugin({
      patterns: [
        { from: "public", to: "." },
        {
          from: "node_modules/three/examples/jsm/libs/draco/gltf",
          to: "draco",
        },
      ],
    }),
  ],
  devServer: {
    static: [
      {
        directory: path.join(__dirname, "public"),
      },
      {
        directory: path.join(
          __dirname,
          "node_modules/three/examples/jsm/libs/draco/gltf"
        ),
        publicPath: "/draco",
      },
    ],
    historyApiFallback: true,
    port: 8080,
    hot: true,
  },
};
