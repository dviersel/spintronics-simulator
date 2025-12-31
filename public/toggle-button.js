export class ToggleButton extends Phaser.GameObjects.Container
{
    thisScene = null;

    constructor(scene, name, x, y, width, height, textureDefault, textureHover, texturePressed, textureIcon, pressedCallback, textureDisabled = null)
    {
        super(scene, x, y);
        this.thisScene = scene;
        this.name = name;
        this.textureDefault = textureDefault;
        this.textureHover = textureHover;
        this.texturePressed = texturePressed;
        this.textureIcon = textureIcon;
        this.toggledCallback = pressedCallback;
        this.textureDisabled = textureDisabled;
        this.buttonType = 'default';

        this.toggleState = false;
        this.disabled = false;

        // Add this container to the scene
        scene.add.existing(this);
        this.setSize(width, height);
        // Add event handlers
        this.setInteractive();
        this.on('pointerdown', (pointer, localx, localy, event) => this.onPointerDown(pointer, localx, localy, event));
        this.on('pointerup', (pointer, localx, localy, event) => this.onPointerUp(pointer, localx, localy, event));
        this.on('pointerover', (pointer, localx, localy, event) => this.onPointerOver(pointer, localx, localy, event));
        this.on('pointerout', (pointer, localx, localy, event) => this.onPointerOut(pointer, localx, localy, event));

        // Add button background
        this.buttonBackground = scene.add.image(0, 0, textureDefault);
        this.buttonBackground.alpha = 0.5;
        this.buttonBackground.setDisplaySize(width, height);
        this.add(this.buttonBackground);

        // Add icon
        this.buttonIcon = scene.add.image(0, 0, textureIcon);
        this.buttonIcon.alpha = 0.5;
        if (this.buttonIcon.displayWidth > this.buttonIcon.displayHeight) {
            if (this.buttonIcon.displayWidth > this.buttonBackground.displayWidth * 0.9)
                this.buttonIcon.setScale((this.buttonBackground.displayWidth * 0.9) / this.buttonIcon.displayWidth);
        }
        else {
            if (this.buttonIcon.displayHeight > this.buttonBackground.displayHeight * 0.9)
                this.buttonIcon.setScale((this.buttonBackground.displayHeight * 0.9) / this.buttonIcon.displayHeight);
        }
        //this.buttonIcon.setDisplaySize(width*0.8, height*0.8);
        this.add(this.buttonIcon);

        this.tooltipString = "";
        this.tooltipText = null;
        this.keyboardShortcut = null;
        this.keyboardShortcutText = null;
        this.keyLabelBackground = null;
    }

    // Sets the button type: 'toggle' or 'default'
    setButtonType(buttonType)
    {
        this.buttonType = buttonType;
        this.toggleState = false;
    }

    setDisabled(disabled)
    {
        this.disabled = disabled;
        if (disabled) {
            this.buttonBackground.setTexture(this.textureDisabled);
            this.buttonIcon.setTintFill(0x888888);
        }
        else
        {
            this.buttonBackground.setTexture(this.textureDefault);
            this.buttonIcon.clearTint();
        }
    }

    setImageScale(scaleFactor)
    {
        this.buttonIcon.setScale(scaleFactor);
    }

    getToggleState ()
    {
        return this.toggleState;
    }

    setTooltipString(tooltipString, tooltipJustify = 'right')
    {
        this.tooltipString = tooltipString;
        this.tooltipJustify = tooltipJustify;
    }

    setTooltipJustify(tooltipJustify)
    {
        this.tooltipJustify = tooltipJustify;
    }

    setKeyboardShortcut(key)
    {
        this.keyboardShortcut = key;

        // Create the visual keyboard shortcut label
        if (this.keyboardShortcutText == null && key != null) {
            // Create background rectangle for the key label
            const labelWidth = 18;
            const labelHeight = 18;
            const cornerOffset = 5;

            // Position in bottom-right corner of button
            const labelX = (this.width / 2) - labelWidth - cornerOffset;
            const labelY = (this.height / 2) - labelHeight - cornerOffset;

            // Create semi-transparent background
            this.keyLabelBackground = this.thisScene.add.graphics();
            this.keyLabelBackground.fillStyle(0x000000, 0.4);
            this.keyLabelBackground.fillRoundedRect(labelX, labelY, labelWidth, labelHeight, 3);
            this.add(this.keyLabelBackground);

            // Create text label
            this.keyboardShortcutText = this.thisScene.add.text(
                labelX + labelWidth / 2,
                labelY + labelHeight / 2,
                key,
                {
                    font: '12px Roboto',
                    fontSize: '12px',
                    color: '#FFFFFF',
                    fontStyle: 'bold'
                }
            );
            this.keyboardShortcutText.setOrigin(0.5, 0.5);
            this.keyboardShortcutText.alpha = 0.5;
            this.add(this.keyboardShortcutText);
        }
    }

    setToggleState (toggleState)
    {
        if (this.disabled)
            return;

        if (this.toggleState == false && toggleState == true)
        {
            this.buttonBackground.setTexture(this.texturePressed);
        }
        else if (this.toggleState == false && toggleState == false)
        {
            this.buttonBackground.setTexture(this.textureDefault);
        }
        else if (this.toggleState == true && toggleState == true)
        {
            this.buttonBackground.setTexture(this.texturePressed);
        }
        else if (this.toggleState == true && toggleState == false)
        {
            this.buttonBackground.setTexture(this.textureDefault);
        }
        this.toggleState = toggleState;
    }

    onPointerDown(pointer, localx, localy, event)
    {
        if (this.disabled)
            return;

        if (this.buttonType == 'default')
        {
            this.buttonBackground.setTexture(this.texturePressed);
        }
        else if (this.buttonType == 'toggle') {
            this.setToggleState(true);
            this.toggledCallback.bind(this.parentContainer)(this.name, this.toggleState);
        }
        event.stopPropagation();
    }

    onPointerUp(pointer, localx, localy, event)
    {
        if (this.disabled)
            return;

        if (this.buttonType == 'default')
        {
            this.buttonBackground.setTexture(this.textureHover);
            this.toggledCallback.bind(this.parentContainer)(this.name, true);
        }
        event.stopPropagation();
    }

    onPointerOver(pointer, localx, localy, event)
    {
        if (this.disabled)
            return;

        if (this.toggleState == false)
        {
            this.buttonBackground.setTexture(this.textureHover);
        }
        else
        {
            this.buttonBackground.setTexture(this.texturePressed);
        }

        this.buttonBackground.alpha = 1;
        this.buttonIcon.alpha = 1;

        // Also make keyboard shortcut label more visible on hover
        if (this.keyboardShortcutText != null) {
            this.keyboardShortcutText.alpha = 1;
        }

        // Draw the Tooltip
        if (this.tooltipString != "" && this.tooltipText == null) {
            // Make this button the top-most item
            this.setDepth(17);

            let textPos = {x: 0, y: 0};
            this.tooltipText = this.thisScene.add.text(textPos.x, textPos.y, this.tooltipString, {
                font: '20px Roboto',
                fontSize: '50px',
                color: "rgb(20,20,20)",
                fontStyle: 'strong'
            });
            this.tooltipText.setDepth(16);
            let textBounds = this.tooltipText.getBounds();

            // Draw white background
            this.toolTipGraphics = this.thisScene.add.graphics();
            this.toolTipGraphics.lineStyle(2, 0x111111, 1);
            this.toolTipGraphics.fillStyle(0xffffff, 1);
            if (this.tooltipJustify == 'right')
                this.toolTipGraphics.fillRoundedRect((this.width / 2) + 8 - 4, (-textBounds.height / 2) - 2, textBounds.width + 8, textBounds.height + 4, 6);
            else
                this.toolTipGraphics.fillRoundedRect(-((this.width / 2) + 8 + 4 + textBounds.width), (-textBounds.height / 2) - 2, textBounds.width + 8, textBounds.height + 4, 6);

            this.add(this.toolTipGraphics);

            //this.textRectangle = this.thisScene.add.rectangle((this.width / 2) + 8 + (textBounds.width / 2), (-textBounds.height / 2), textBounds.width, textBounds.height, 0xffffff);
            //this.add(this.textRectangle);

            if (this.tooltipJustify == 'right')
                this.tooltipText.setPosition(this.width / 2 + 8, -textBounds.height / 2);
            else
                this.tooltipText.setPosition(-(this.width / 2 + 8 + textBounds.width), -textBounds.height / 2);
            this.add(this.tooltipText);
        }

        event.stopPropagation();
    }

    onPointerOut(pointer, event)
    {
        if (this.disabled)
            return;

        // console.log('pointer out');
        if (this.toggleState == false)
        {
            this.buttonBackground.setTexture(this.textureDefault);
        }
        else
        {
            this.buttonBackground.setTexture(this.texturePressed);
        }

        this.buttonBackground.alpha = 0.5;
        this.buttonIcon.alpha = 0.5;

        // Restore keyboard shortcut label to semi-transparent
        if (this.keyboardShortcutText != null) {
            this.keyboardShortcutText.alpha = 0.5;
        }

        if (this.tooltipText != null)
        {
            this.setDepth(0);

            this.tooltipText.destroy();
            this.toolTipGraphics.destroy();
            this.tooltipText = null;
        }

        event.stopPropagation();
    }



}