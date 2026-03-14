# TJA Renderer

A web based renderer of rhythm game charts in the TJA format.

The goal is to produce results that are:
* High quality: render at device native resolution with high DPI support
* High performance: potentially faster delivery of results than serving images; incremental rendering for high frequency updates
* Dynamic: chart elements sizing can scale automatically to available width; notes interactivity

## Usage

Please refer to `./src/api.ts` for API definitions. For basic usage, call `createChartView` with a TJA string and an HTML canvas.

## API Evolution

This package was originally created for [TJA Analyzer](https://github.com/jack9966qk/TJAAnalyzer). To support fast iterations, it offers APIs for low level controls, under the `Private` namespace.

The private APIs can be utilized from other project, however, please be aware that the interfaces have no stability guarantee.

In comparison, the public API is kept stable where possible. Ideally, more features will be made public over time as requirements clarify, although this may be a slow process as the bandwidth from the maintainer is limited. If you would like to use a particular feature not yet implemented or made public, feel free to reach out directly or by GitHub issues.
