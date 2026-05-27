import Phaser from "phaser"

export class Collider {
    constructor(separate) {
        this.objects = []
        this.radius = []
        this.separate = separate
    }

    add = (object, radius) => {
        this.objects.push(object)
        this.radius.push(radius)
    }

    update = () => {
        var averageV = []
        var countArray = []

        this.objects = this.objects.filter(obj => {return obj.body !== undefined})

        for (let i = 0; i < this.objects.length; i++) {
            averageV.push(new Phaser.Math.Vector2())
            countArray.push(0)
        }

        for (let i = 0; i < this.objects.length; i++) {
            const object1 = this.objects[i]
            const radius1 = this.radius[i]
            const v1 = object1.body.velocity
            
            for (let j = i + 1; j < this.objects.length; j++) {
                const object2 = this.objects[j]
                const radius2 = this.radius[j]
                const v2 = object2.body.velocity

                if (Phaser.Math.Distance.Between(object1.body.x, object1.body.y, object2.body.x, object2.body.y) < radius1 + radius2) {
                    const dist1 = new Phaser.Math.Vector2(object2.body.x - object1.body.x, object2.body.y - object1.body.y)
                    const dist2 = new Phaser.Math.Vector2(object1.body.x - object2.body.x, object1.body.y - object2.body.y)
                    
                    const angle1 = dist1.angle()
                    const angle2 = dist2.angle()
                    
                    const relativeV = v1.clone().subtract(v2)
                    const relativeP = object1.body.position.clone().subtract(object2.body.position)
                    var approaching = false

                    if (relativeV.dot(relativeP) < 0) {
                        approaching = true
                    }
                    else {
                        ///console.log('not approaching')
                        continue
                    }

                    var v1_component = dist1.clone().normalize().scale(v1.dot(dist1.clone().normalize()))
                    var v2_component = dist2.clone().normalize().scale(v2.dot(dist2.clone().normalize()))

                    if (this.separate) {
                        var t = 0.1
                        while(Phaser.Math.Distance.Between(object1.body.x, object1.body.y, object2.body.x, object2.body.y) < radius1 + radius2) {
                            object1.body.x -= t * Math.cos(angle1)
                            object1.body.y -= t * Math.sin(angle1)
                            object2.body.x -= t * Math.cos(angle2)
                            object2.body.y -= t * Math.sin(angle2)
                        }
                    }

                    averageV[i].add((v1.clone().subtract(v1_component)).add(v2_component))
                    averageV[j].add((v2.clone().subtract(v2_component)).add(v1_component))

                    countArray[i] += 1
                    countArray[j] += 1
                }
            }
        }

        for (let i = 0; i < this.objects.length; i++) {
            const object = this.objects[i];
            const count = countArray[i];
            if (count > 0) {
                object.body.velocity.x = averageV[i].x / count
                object.body.velocity.y = averageV[i].y / count
                object.body.preUpdate(true, 0)
            }  
        }
    }
}