import {WebVRMixin} from "../src/webvrmixin"

let canvas = <HTMLCanvasElement> document.getElementById("webgl-canvas")

let gl = <WebGLRenderingContext> canvas.getContext("webgl", WebVRMixin.glAttribs())
gl.clearColor(0.7, 0.7, 0.7, 1.0)
gl.enable(gl.DEPTH_TEST)
gl.enable(gl.CULL_FACE)

let renderer = {
  render() {
  }
}

let vrMixin = new WebVRMixin(canvas, gl, renderer)