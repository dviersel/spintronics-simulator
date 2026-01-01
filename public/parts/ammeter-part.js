import { PartBase } from './partbase.js';
import { worldScale } from '../constants.js';

const ammeterRadius = 0.041168 / 2; // Same as other standard sprockets

// Conversion factor: angular velocity (rad/s) to current (mA)
// Based on typical Spintronics behavior - adjust as needed
const ANGULAR_VEL_TO_MA = 10; // 1 rad/s = 10 mA

export class AmmeterPart extends PartBase {
    // Available scale ranges in mA (max positive value)
    static scaleRanges = [50, 100, 200, 500];
    static scaleLabels = ['±50 mA', '±100 mA', '±200 mA', '±500 mA'];

    constructor(scene, x, y, planckWorld) {
        super(scene, x, y, planckWorld);
        this.partType = 'ammeter';
        this.scene = scene;

        // Current scale index
        this.scaleIndex = 1; // Default: ±100 mA
        this.maxCurrent = AmmeterPart.scaleRanges[this.scaleIndex];

        // Smoothed velocity for display (prevents jitter)
        this.smoothedVelocity = 0;

        // Create the sprocket image (rotates with chain)
        this.sprocketImage = scene.add.image(x, y, 'ammeter-sprocket');
        this.sprocketImage.setScale(0.5);
        this.sprocketImage.setDepth(10);

        // Create the gauge dial background (static)
        this.dialImage = scene.add.image(x, y, 'ammeter-dial');
        this.dialImage.setScale(0.5);
        this.dialImage.setDepth(12);

        // Create the gauge bezel/frame (static, on top)
        this.bezelImage = scene.add.image(x, y, 'ammeter-bezel');
        this.bezelImage.setScale(0.5);
        this.bezelImage.setDepth(14);

        // Create the needle (rotates based on current)
        this.needleImage = scene.add.image(x, y, 'ammeter-needle');
        this.needleImage.setScale(0.5);
        this.needleImage.setDepth(13);
        this.needleImage.setOrigin(0.5, 0.677); // Pivot at center ring: (CENTER + pivotY) / SIZE = (150 + 53) / 300 = 0.677

        // Create scale label text (positioned inside dial, in lower portion)
        this.scaleText = scene.add.text(x, y + 22, AmmeterPart.scaleLabels[this.scaleIndex], {
            font: '11px Roboto',
            color: '#4a3728',
            fontStyle: 'bold'
        });
        this.scaleText.setOrigin(0.5, 0.5);
        this.scaleText.setDepth(15);

        // Create current reading text (positioned inside dial, below scale label)
        this.currentText = scene.add.text(x, y + 36, '0.0 mA', {
            font: '10px Roboto',
            color: '#2a1f18',
        });
        this.currentText.setOrigin(0.5, 0.5);
        this.currentText.setDepth(15);

        // Configure 3-level sprockets (all share same body)
        for (let i = 0; i < 3; i++) {
            this.sprocketCenter[i] = { x: 0, y: 0 };
            this.sprocketRadius[i] = 117 / 2;
            this.sprocketExists[i] = true;
            this.sprocketPhysicsRadius[i] = ammeterRadius;
        }

        // Physics setup - create ground body
        this.ground = this.world.createBody();

        // Create the ammeter body with very low damping (meter shouldn't resist motion)
        this.ammeterBody = this.world.createDynamicBody({
            position: planck.Vec2(0, 0),
            angularDamping: 0.3
        });
        this.ammeterFixture = this.ammeterBody.createFixture(
            planck.Circle(ammeterRadius),
            { density: 0.1, filterGroupIndex: -1, friction: 0 }
        );

        // All 3 levels share the same physics body
        this.sprocketBodies[0] = this.ammeterBody;
        this.sprocketBodies[1] = this.ammeterBody;
        this.sprocketBodies[2] = this.ammeterBody;

        // Create revolute joint to anchor the sprocket
        this.ammeterJoint = this.world.createJoint(
            planck.RevoluteJoint({}, this.ground, this.ammeterBody,
                this.ammeterBody.getPosition())
        );
        this.sprocketJoints[0] = this.ammeterJoint;
        this.sprocketJoints[1] = this.ammeterJoint;
        this.sprocketJoints[2] = this.ammeterJoint;

        // Setup pointer interactions for all images
        this.setupInteractions();
    }

    setupInteractions() {
        const images = [
            this.sprocketImage,
            this.dialImage,
            this.bezelImage,
            this.needleImage
        ];

        for (const image of images) {
            image.setInteractive({
                draggable: true,
                pixelPerfect: true,
                alphaTolerance: 1
            });

            image.on('pointerdown', (pointer, localx, localy, event) =>
                this.onPointerDown(pointer, localx, localy, event));
            image.on('pointermove', (pointer, localx, localy, event) =>
                this.onPointerMove(pointer, localx, localy, event));
            image.on('pointerout', (pointer, event) =>
                this.onPointerOut(pointer, event));
            image.on('dragstart', (pointer, dragX, dragY) =>
                this.onDragStart(pointer, dragX, dragY, this.ammeterBody));
            image.on('dragend', (pointer, dragX, dragY) =>
                this.onDragEnd(pointer, dragX, dragY, this.ammeterBody));
            image.on('drag', (pointer, dragX, dragY) =>
                this.onDrag(pointer, dragX, dragY, this.ammeterBody));
        }
    }

    updatePhysics() {
        // Update sprocket rotation to match physics body
        this.sprocketImage.rotation = this.ammeterBody.getAngle();

        // Get current angular velocity
        const rawVelocity = this.ammeterBody.getAngularVelocity();

        // Smooth the reading to prevent jitter
        const smoothingFactor = 0.12;
        this.smoothedVelocity += (rawVelocity - this.smoothedVelocity) * smoothingFactor;

        // Convert to current (mA)
        const currentMA = this.smoothedVelocity * ANGULAR_VEL_TO_MA;

        // Normalize to current scale range and clamp to ±1
        const normalizedCurrent = Math.max(-1, Math.min(1, currentMA / this.maxCurrent));

        // Map to needle angle: 0 = center (pointing up), ±135° at extremes
        // Negative current = left deflection, positive = right deflection
        const needleAngle = normalizedCurrent * (135 * Math.PI / 180);
        this.needleImage.rotation = needleAngle;

        // Update digital readout
        const displayCurrent = Math.abs(currentMA) < 0.1 ? 0 : currentMA;
        this.currentText.setText(displayCurrent.toFixed(1) + ' mA');

        // Change text color if over-range
        if (Math.abs(currentMA) > this.maxCurrent) {
            this.currentText.setColor('#cc0000');
        } else {
            this.currentText.setColor('#2a1f18');
        }
    }

    // Click to cycle through scale ranges
    changePartProperty() {
        this.scaleIndex = (this.scaleIndex + 1) % AmmeterPart.scaleRanges.length;
        this.maxCurrent = AmmeterPart.scaleRanges[this.scaleIndex];
        this.scaleText.setText(AmmeterPart.scaleLabels[this.scaleIndex]);

        // Wake up the body to ensure physics updates
        this.ammeterBody.setAwake(true);
    }

    serialize() {
        return {
            type: this.partType,
            x: this.x,
            y: this.y,
            value: this.scaleIndex
        };
    }

    setPartTint(color) {
        this.sprocketImage.setTint(color);
        this.dialImage.setTint(color);
        this.bezelImage.setTint(color);
        this.needleImage.setTint(color);
    }

    clearPartTint() {
        this.sprocketImage.clearTint();
        this.dialImage.clearTint();
        this.bezelImage.clearTint();
        this.needleImage.clearTint();
    }

    setPosition(x, y) {
        this.x = x;
        this.y = y;

        if (this.sprocketImage) this.sprocketImage.setPosition(x, y);
        if (this.dialImage) this.dialImage.setPosition(x, y);
        if (this.bezelImage) this.bezelImage.setPosition(x, y);
        if (this.needleImage) this.needleImage.setPosition(x, y);
        if (this.scaleText) this.scaleText.setPosition(x, y + 22);
        if (this.currentText) this.currentText.setPosition(x, y + 36);
    }

    destroy() {
        this.sprocketImage.destroy();
        this.dialImage.destroy();
        this.bezelImage.destroy();
        this.needleImage.destroy();
        this.scaleText.destroy();
        this.currentText.destroy();

        this.world.destroyBody(this.ammeterBody);
        this.world.destroyBody(this.ground);
    }

    getPartExtents() {
        const radius = 117 / 2;
        return {
            left: this.x - radius,
            right: this.x + radius,
            top: this.y - radius,
            bottom: this.y + radius // Text is now inside the dial
        };
    }
}
