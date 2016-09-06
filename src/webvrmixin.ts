declare var gl: WebGLRenderingContext

interface Renderer {
    render(projectionMat: GLM.IArray, viewMat: GLM.IArray): void
}

declare namespace Gamepad {
    interface Gamepad {
        pose: VRPose // relatively new, missing in all typings
        haptics: any
    }
}

class WebVRMixin {
    vrDisplay: VRDisplay

    PLAYER_HEIGHT = 1.65

    projectionMat = mat4.create()
    viewMat = mat4.create()
    poseMat = mat4.create()
    gamepadMat = mat4.create()
    gamepadColor = vec4.create()
    standingPosition = vec3.create()

    debugGeom: any = null

    constructor(
        private canvas: HTMLCanvasElement,
        gl: WebGLRenderingContext,
        private renderer: Renderer) {
        window["gl"] = gl
    }

    static glAttribs() {
        return {
            alpha: false,
            antialias: true, // TODO: false if mobile
            preserveDrawingBuffer: true
        }
    }

    initWebGL() {
        // TODO!!
    }

    onVRRequestPresent() {
        this.vrDisplay.requestPresent([{ source: this.canvas }]).then(
            () => { },
            () => console.error("requestPresent failed.")
        )
    }

    onVRExitPresent() {
        if (!this.vrDisplay.isPresenting)
            return

        this.vrDisplay.exitPresent().then(
            () => { },
            () => console.error("exitPresent failed.")
        )
    }

    onVRPresentChange() {
        this.onResize(); // TODO

        if (this.vrDisplay.isPresenting) {
            if (this.vrDisplay.capabilities.hasExternalDisplay) {
                // TODO: set up "Exit VR" button that calls onVRExitPresent
            }
        }
        else if (this.vrDisplay.capabilities.hasExternalDisplay) {
            // TODO: set up "Enter VR button that calls onVRRequestPresent
        }
    }

    // TODO!!: call!
    setupDisplay() {
        if (!navigator.getVRDisplays) {
            console.error("Your browser does not support WebVR. See <a href='http://webvr.info'>webvr.info</a> for assistance.")
            return
        }

        navigator.getVRDisplays().then((displays: Array<VRDisplay>) => {
            if (!displays.length) {
                console.error("WebVR supported, but no VRDisplays found.")
            }

            this.vrDisplay = displays[0]

            this.initWebGL(true)

            if (this.vrDisplay.stageParameters &&
                this.vrDisplay.stageParameters.sizeX > 0 &&
                this.vrDisplay.stageParameters.sizeZ > 0) {
                // TODO: resize world? relevant?
            }

            // TODO!: add "Reset Pose" button that calls vrDisplay.resetPose()

            if (this.vrDisplay.capabilities.canPresent) {
                // TODO!: Add/enable "Enter VR" button that calls onVRRequestPresent
            }

            window.addEventListener('vrdisplaypresentchange', this.onVRPresentChange.bind(this), false);
            window.addEventListener('vrdisplayactivate', this.onVRRequestPresent.bind(this), false);
            window.addEventListener('vrdisplaydeactivate', this.onVRExitPresent.bind(this), false);
        })
    }

    onResize() {
        if (this.vrDisplay && this.vrDisplay.isPresenting) {
            let leftEye = this.vrDisplay.getEyeParameters("left")
            let rightEye = this.vrDisplay.getEyeParameters("right")

            this.canvas.width = Math.max(leftEye.renderWidth, rightEye.renderWidth) * 2
            this.canvas.height = Math.max(leftEye.renderHeight, rightEye.renderHeight)
        }
        else {
            this.canvas.width = this.canvas.offsetWidth * window.devicePixelRatio;
            this.canvas.height = this.canvas.offsetHeight * window.devicePixelRatio;
        }
    }

    getPoseMatrix(out: GLM.IArray, pose: VRPose, isGamepad: boolean) {
        let orientation = pose.orientation || [0, 0, 0, 1]
        let position = pose.position
        if (!position) {
            // If this is a gamepad without a pose set it out in front of us so
            // we can see it.
            position = new Float32Array(isGamepad ? [0.1, -0.1, -0.5] : [0, 0, 0])
        }

        if (this.vrDisplay.stageParameters) {
            mat4.fromRotationTranslation(out, orientation, position)
            mat4.multiply(out, this.vrDisplay.stageParameters.sittingToStandingTransform, out)
        }
        else {
            vec3.add(this.standingPosition, position, [0, this.PLAYER_HEIGHT, 0]);
        }
    }

    renderSceneView(poseInMat: GLM.IArray, gamepads: Array<Gamepad.Gamepad>, eye: VREyeParameters) {
        Gamepad
        if (eye) {
            mat4.translate(this.viewMat, poseInMat, eye.offset)
            mat4.perspectiveFromFieldOfView(this.projectionMat, eye.fieldOfView, 0.1, 1024.0)
            mat4.invert(this.viewMat, this.viewMat)
        }
        else {
            mat4.perspective(this.projectionMat, Math.PI * 0.4, this.canvas.width / this.canvas.height, 0.1, 1024.0)
            mat4.invert(this.viewMat, poseInMat)
        }

        this.renderer.render(this.projectionMat, this.viewMat)

        // TODO? debug geom part -> https://github.com/toji/webgl-utils (no NPM package!)

        // Render every gamepad with a pose we found
        for (let gamepad of gamepads) {
          // Because this sample is done in standing space we need to apply
          // the same transformation to the gamepad pose as we did the
          // VRDisplay's pose.
          this.getPoseMatrix(this.gamepadMat, gamepad.pose, true);

          // Scaled down to from 1 meter to be something closer to the size of
          // a hand.
          mat4.scale(this.gamepadMat, this.gamepadMat, [0.1, 0.1, 0.1]);

          // Loop through all the gamepad's axes and rotate the cube by their
          // value.
          for (var j = 0; j < gamepad.axes.length; ++j) {
              switch (j % 3) {
                  case 0:
                      mat4.rotateX(this.gamepadMat, this.gamepadMat, gamepad.axes[j] * Math.PI);
                      break;
                  case 1:
                      mat4.rotateY(this.gamepadMat, this.gamepadMat, gamepad.axes[j] * Math.PI);
                      break;
                  case 2:
                      mat4.rotateZ(this.gamepadMat, this.gamepadMat, gamepad.axes[j] * Math.PI);
                      break;
              }
          }

          // Show the gamepad's cube as red if any buttons are pressed, blue
          // otherwise.
          vec4.set(this.gamepadColor, 0, 0, 1, 1);
          for (var j = 0; j < gamepad.buttons.length; ++j) {
              if (gamepad.buttons[j].pressed) {
                  vec4.set(this.gamepadColor, gamepad.buttons[j].value, 0, 0, 1);
                  break;
              }
          }

          this.debugGeom.drawBoxWithMatrix(this.gamepadMat, this.gamepadColor);

        }
    }

    onAnimationFrame(t: number) {
        // stats.begin
        let vrDisplay = this.vrDisplay

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

        if (vrDisplay) {
            vrDisplay.requestAnimationFrame(this.onAnimationFrame.bind(this))

            // Loop over every gamepad and if we find any that have a pose use it.
            let vrGamepads: Array<Gamepad.Gamepad> = []
            for (let gamepad of navigator.getGamepads()) {
                // The array may contain undefined gamepads, so check for that as
                // well as a non-null pose.
                if (!gamepad)
                    continue

                if (gamepad.pose)
                    vrGamepads.push(gamepad)

                if ("haptics" in gamepad && gamepad.haptics.length > 0) {
                    for (let button of gamepad.buttons) {
                        if (button.pressed) {
                            // Vibrate the gamepad using to the value of the button as
                            // the vibration intensity.
                            gamepad.haptics[0].vibrate(button.value, 100);
                            break;
                        }
                    }
                }

            }

            let pose = vrDisplay.getPose()
            let poseMat = this.poseMat
            this.getPoseMatrix(poseMat, pose, false)

            let canvas = this.canvas,
                width = canvas.width,
                height = canvas.height
            if (vrDisplay.isPresenting) {
                gl.viewport(0, 0, width * 0.5, height)
                this.renderSceneView(poseMat, vrGamepads, vrDisplay.getEyeParameters("left"))

                gl.viewport(width * 0.5, 0, width * 0.5, height)
                this.renderSceneView(poseMat, vrGamepads, vrDisplay.getEyeParameters("right"))

                vrDisplay.submitFrame(pose)
            }
            else {
                gl.viewport(0, 0, width, height)
                this.renderSceneView(poseMat, vrGamepads, null)
                // stats.renderOrtho
            }
        }
        else {
            window.requestAnimationFrame(this.onAnimationFrame.bind(this))

            // No VRDisplay found.
            gl.viewport(0, 0, this.canvas.width, this.canvas.height);
            mat4.perspective(this.projectionMat, Math.PI*0.4, this.canvas.width / this.canvas.height, 0.1, 1024.0);
            mat4.identity(this.viewMat);
            mat4.translate(this.viewMat, this.viewMat, [0, -this.PLAYER_HEIGHT, 0]);
            this.renderer.render(this.projectionMat, this.viewMat /*, stats */);

            //stats.renderOrtho();
        }

        // stats.end()
    }
}