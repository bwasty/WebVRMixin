declare var gl: WebGLRenderingContext

interface Renderer {
    render(): void
}

class WebVRMixin {
    vrDisplay: VRDisplay

    PLAYER_HEIGHT = 1.65
    standingPosition = vec3.create()

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

    onVRRequestPresent () {
        this.vrDisplay.requestPresent([{ source: this.canvas }]).then(
            () => {},
            () => console.error("requestPresent failed.")
        )
    }

    onVRExitPresent () {
        if (!this.vrDisplay.isPresenting)
            return

        this.vrDisplay.exitPresent().then(
            () => {},
            () => console.error("exitPresent failed.")
        )
    }

    onVRPresentChange () {
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

    getPoseMatrix(out: GLM.IArray, pose: any, isGamepad: boolean) {
        let orientation = pose.orientation || [0, 0, 0, 1]
        let position = pose.position
        if (!position) {
            // If this is a gamepad without a pose set it out in front of us so
            // we can see it.
            position = isGamepad ? [0.1, -0.1, -0.5] : [0, 0, 0];
        }

        if (this.vrDisplay.stageParameters) {
            mat4.fromRotationTranslation(out, orientation, position)
            mat4.multiply(out, this.vrDisplay.stageParameters.sittingToStandingTransform, out)
        }
        else {
            vec3.add(this.standingPosition, position, [0, this.PLAYER_HEIGHT, 0]);
        }
    }
}