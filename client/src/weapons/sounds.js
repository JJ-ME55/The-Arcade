import Phaser from "phaser"

/**
 * @param {Phaser.Scene} scene
 */

const assetLoader = (scene) => {
    scene.load.audio('launch', ['assets/sounds/others/launch.mp3'])
    scene.load.audio('split', ['assets/sounds/others/rocket.wav'])
    scene.load.audio('expmedium', ['assets/sounds/others/expmedium.wav'])
    scene.load.audio('expmedium2', ['assets/sounds/others/expmedium2.wav'])
    scene.load.audio('expshort', ['assets/sounds/others/expshort.wav'])
    scene.load.audio('expshort2', ['assets/sounds/others/expshort2.wav'])
    scene.load.audio('explong', ['assets/sounds/others/explong.wav'])
    scene.load.audio('exphuge', ['assets/sounds/others/exphuge.wav'])
    scene.load.audio('tracer', ['assets/sounds/others/tick.wav'])
    scene.load.audio('sniper', ['assets/sounds/others/bigpop.wav'])
    scene.load.audio('magicwall', ['assets/sounds/others/magicbeans_grow.wav'])
    scene.load.audio('zapper', ['assets/sounds/others/laser1.wav'])
    scene.load.audio('napalm', ['assets/sounds/others/napalm.wav'])
    scene.load.audio('hailstorm', ['assets/sounds/others/hailstorm.wav'])
    scene.load.audio('aquabomb_splash', ['assets/sounds/others/aquabomb_splash.wav'])
    scene.load.audio('homing', ['assets/sounds/others/homingmissile.wav'])
    scene.load.audio('skipperbounce', ['assets/sounds/others/rubberbullet.wav'])
    scene.load.audio('clusterbombs_exp', ['assets/sounds/others/clusterbombs_exp.wav'])
    scene.load.audio('firecracker', ['assets/sounds/others/firecracker.wav'])
    scene.load.audio('rungun', ['assets/sounds/others/rungun.wav'])
    scene.load.audio('rockslide', ['assets/sounds/others/rockslide.wav'])
    scene.load.audio('rock', ['assets/sounds/others/rock.wav'])
}

export default assetLoader