(function(){
  // Gamepad state for PS5/Xbox controllers
  const gamepad = {
    connected: false,
    index: -1,
    leftStick: { x: 0, y: 0 },
    rightStick: { x: 0, y: 0 },
    buttons: {
      fire: false,       // R2/RT
      boost: false,      // L2/LT
      select: false,     // Share/Select for fullscreen
      prevFire: false,
      prevBoost: false,
      prevSelect: false
    },
    deadzone: 0.15,     // Ignore small stick movements
    sensitivity: 2.5    // Look sensitivity multiplier
  };

  // Button mappings (standard gamepad layout)
  const BUTTONS = {
    A: 0,           // Cross/A
    B: 1,           // Circle/B
    X: 2,           // Square/X
    Y: 3,           // Triangle/Y
    LB: 4,          // L1/LB
    RB: 5,          // R1/RB
    LT: 6,          // L2/LT
    RT: 7,          // R2/RT
    SELECT: 8,      // Share/Select
    START: 9,       // Options/Start
    L_STICK: 10,    // L3
    R_STICK: 11,    // R3
    DPAD_UP: 12,
    DPAD_DOWN: 13,
    DPAD_LEFT: 14,
    DPAD_RIGHT: 15
  };

  // Axis mappings
  const AXES = {
    LEFT_X: 0,
    LEFT_Y: 1,
    RIGHT_X: 2,
    RIGHT_Y: 3
  };

  function applyDeadzone(value, deadzone) {
    if (Math.abs(value) < deadzone) return 0;
    // Scale the remaining range to 0-1
    const sign = Math.sign(value);
    const magnitude = Math.abs(value);
    return sign * ((magnitude - deadzone) / (1 - deadzone));
  }

  function pollGamepad() {
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];

    // Find first connected gamepad
    if (gamepad.index === -1) {
      for (let i = 0; i < gamepads.length; i++) {
        if (gamepads[i]) {
          gamepad.index = i;
          gamepad.connected = true;
          console.log('Gamepad connected:', gamepads[i].id);
          break;
        }
      }
    }

    if (gamepad.index === -1 || !gamepads[gamepad.index]) {
      gamepad.connected = false;
      return;
    }

    const gp = gamepads[gamepad.index];
    if (!gp) {
      gamepad.connected = false;
      return;
    }

    // Read analog sticks with deadzone
    gamepad.leftStick.x = applyDeadzone(gp.axes[AXES.LEFT_X] || 0, gamepad.deadzone);
    gamepad.leftStick.y = applyDeadzone(gp.axes[AXES.LEFT_Y] || 0, gamepad.deadzone);
    gamepad.rightStick.x = applyDeadzone(gp.axes[AXES.RIGHT_X] || 0, gamepad.deadzone);
    gamepad.rightStick.y = applyDeadzone(gp.axes[AXES.RIGHT_Y] || 0, gamepad.deadzone);

    // Debug: log stick values occasionally
    if (Math.random() < 0.01 && (Math.abs(gamepad.leftStick.x) > 0 || Math.abs(gamepad.leftStick.y) > 0)) {
      console.log('Left stick:', gamepad.leftStick.x.toFixed(2), gamepad.leftStick.y.toFixed(2));
    }

    // Read buttons
    gamepad.buttons.prevFire = gamepad.buttons.fire;
    gamepad.buttons.prevBoost = gamepad.buttons.boost;
    gamepad.buttons.prevSelect = gamepad.buttons.select;

    // R2/RT for fire (analog trigger)
    // Some controllers use buttons, some use axes for triggers
    let rtValue = 0;
    if (gp.buttons[BUTTONS.RT]) {
      rtValue = gp.buttons[BUTTONS.RT].value || (gp.buttons[BUTTONS.RT].pressed ? 1 : 0);
    }
    // Also support R1/RB as alternative fire button
    const rbPressed = gp.buttons[BUTTONS.RB] ? gp.buttons[BUTTONS.RB].pressed : false;
    gamepad.buttons.fire = (rtValue > 0.1) || rbPressed;

    // L2/LT for boost (analog trigger)
    // Some controllers use buttons, some use axes for triggers
    let ltValue = 0;
    if (gp.buttons[BUTTONS.LT]) {
      ltValue = gp.buttons[BUTTONS.LT].value || (gp.buttons[BUTTONS.LT].pressed ? 1 : 0);
    }
    // Also support L1/LB as alternative boost button
    const lbPressed = gp.buttons[BUTTONS.LB] ? gp.buttons[BUTTONS.LB].pressed : false;
    gamepad.buttons.boost = (ltValue > 0.1) || lbPressed;

    // Debug: log boost state occasionally
    if (Math.random() < 0.02 && (ltValue > 0 || lbPressed)) {
      console.log('LT/L2 value:', ltValue, 'LB pressed:', lbPressed, 'boost:', gamepad.buttons.boost);
    }

    // Select/Share button for fullscreen toggle
    const selectPressed = gp.buttons[BUTTONS.SELECT] ? gp.buttons[BUTTONS.SELECT].pressed : false;
    gamepad.buttons.select = selectPressed;

    // Trigger fullscreen on button press (not hold)
    if (gamepad.buttons.select && !gamepad.buttons.prevSelect) {
      if (typeof window.toggleFullscreen === 'function') {
        window.toggleFullscreen();
      }
    }
  }

  // Connect/disconnect events
  window.addEventListener('gamepadconnected', (e) => {
    console.log('Gamepad connected:', e.gamepad.id);
    gamepad.index = e.gamepad.index;
    gamepad.connected = true;
  });

  window.addEventListener('gamepaddisconnected', (e) => {
    console.log('Gamepad disconnected');
    if (gamepad.index === e.gamepad.index) {
      gamepad.connected = false;
      gamepad.index = -1;
    }
  });

  // Export gamepad state and poll function
  window.GamepadController = {
    state: gamepad,
    poll: pollGamepad,
    isConnected: () => gamepad.connected
  };
})();
