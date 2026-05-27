export class Tween {

    constructor (config) {
        this.targets = config.targets ?? []
        this.loop = config.loop ?? 0
        this.frames = config.frames
        this.onUpdate = config.onUpdate
        this.onComplete = config.onComplete
        this.onLoop = config.onLoop
        this.ease = config.ease ?? 'linear'
        this.props = config.props ?? []

        this.completed = false
        this.destroyed = false

        this.config = config
    }

    calculateStep = (target, prop) => {
        if (this.ease === 'linear') {
            var current = target[prop.key]
            var final = prop.value
            var step = (final - current) / this.frames
        }
        return step
    }

    reset = () => {
        this.targets = this.config.targets ?? []
        //this.loop = this.config.loop ?? 0
        this.frames = this.config.frames
        this.onUpdate = this.config.onUpdate
        this.onComplete = this.config.onComplete
        this.onLoop = this.config.onLoop
        this.ease = this.config.ease ?? 'linear'
        this.props = this.config.props ?? []

        this.completed = false
        this.destroyed = false
    }

    update = () => {
        if (this.completed) return
        if (this.destroyed) return

        for (let i = 0; i < this.targets.length; i++) {
            const target = this.targets[i];
            for (let j = 0; j < this.props.length; j++) {
                const prop = this.props[j];
                var current = target[prop.key]
                var final = prop.value

                var step = this.calculateStep(target, prop)
                var next = current + step

                if (final >= 0 && next > final) {
                    target[prop.key] = final
                    this.completed = true
                }
                else if (final <= 0 && next < final) {
                    target[prop.key] = final
                    this.completed = true
                }
                else {
                    target[prop.key] = next
                }
            }
        }

        this.frames--

        if (this.frames === 0) {
            this.completed = true
        }

        if (this.onUpdate) {
            this.onUpdate()
        }

        if (this.completed && this.loop !== 0) {
            this.completed = false
            this.loop--

            if (this.onLoop) {
                this.onLoop()
            }
            this.reset()
        }

        if (this.completed) {
            if (this.onComplete) {
                this.onComplete()
            }
        }
    }

    destroy = () => {
        this.destroyed = true
    }
}