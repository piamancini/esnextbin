'use strict';

var webpack = require('webpack');
var path = require('path');
var ExtractTextPlugin = require('extract-text-webpack-plugin');
var cssnext = require('postcss-cssnext');
var postcssImport = require('postcss-import');

module.exports = {
    devtool: 'eval',

    entry: {
        app: './src/app',
        embed: './src/embed'
    },

    output: {
        path: path.join(__dirname, 'build'),
        filename: '[name].js',
        publicPath: '/'
    },

    plugins: [
        new webpack.DefinePlugin({
            'process.env': {
                'NODE_ENV': JSON.stringify('development')
            }
        }),
        new ExtractTextPlugin('[name].css')
    ],

    resolve: {
        extensions: ['', '.js', '.jsx', 'json']
    },

    module: {
        loaders: [{
            test: /\.jsx?$/,
            exclude: /node_modules/,
            loader: 'babel'
        }, {
            test: /\.css$/,
            loader: ExtractTextPlugin.extract('style-loader', 'css!postcss')
        }]
    },

    postcss: function () {
        return [postcssImport, cssnext];
    }
};
