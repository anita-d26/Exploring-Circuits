// Web Serial API variables
let port, reader, inputDone, inputStream;

// Joystick and potentiometer values, button state
let joyX = 0, joyY = 0, potVal = 0, buttonVal = 1;

// Brush position on canvas
let brushX = 300, brushY = 200, brushSize = 20;
let targetX = 300, targetY = 200;

// Brush color values (RGB)
let brushR = 0, brushG = 0, brushB = 255;
let lastButtonState = 1; // Track last button state to detect presses

// --------------------- SETUP --------------------- //
function setup() {
  createCanvas(600, 400); // Create a 600x400 drawing canvas
  background(255);         // Set canvas background to white
  textSize(14);            // Set text size for any debug info

  // Create a button to connect to Arduino via Web Serial
  createButton("Connect to Arduino")
    .position(10, 10)                  // Position button near top-left
    .mousePressed(connectSerial);     // Call connectSerial() on click
}

// --------------------- DRAW --------------------- //
function draw() {
  // Map joystick values to canvas coordinates
  targetX = map(joyX, 0, 1023, 0, width);  // X: joystick 0–1023 → canvas width
  targetY = map(joyY, 0, 1023, 0, height); // Y: joystick 0–1023 → canvas height

  // Smoothly move brush toward target (creates easing effect)
  brushX = lerp(brushX, targetX, 0.2);
  brushY = lerp(brushY, targetY, 0.2);

  // Map potentiometer value to brush size (range 5–80)
  brushSize = map(potVal, 0, 1023, 5, 80);

  // Draw brush as a semi-transparent circle
  noStroke();                          // No outline
  fill(brushR, brushG, brushB, 150);   // Fill color with transparency
  circle(brushX, brushY, brushSize);   // Draw circle at brushX, brushY

  // Detect joystick button press to change color
  if (buttonVal == 0 && lastButtonState == 1) {  // Button just pressed
    cycleColor();                                // Cycle RGB colors
    sendColorToArduino();                        // Send new color to LED immediately
  }
  lastButtonState = buttonVal;    // Update last button state
}

// --------------------- CYCLE --------------------- //
// Cycle through RGB colors on each button press
function cycleColor() {
  if (brushR == 0 && brushG == 0 && brushB == 255) {         // Currently blue
    brushR = 255; brushG = 0; brushB = 0;                    // Change to red
  } else if (brushR == 255 && brushG == 0 && brushB == 0) {  // Currently red
    brushR = 0; brushG = 255; brushB = 0;                    // Change to green
  } else {                                                   // Currently green
    brushR = 0; brushG = 0; brushB = 255;                    // Change to blue
  }
}

// Clear canvas when 'c' key is pressed
function keyPressed() {
  if (key === 'c') background(255); // Reset background to white
}

// ------------------ SERIAL ------------------ //
// Connect to Arduino via Web Serial API
async function connectSerial() {
  port = await navigator.serial.requestPort();  // Prompt user to select port
  await port.open({ baudRate: 9600 });          // Open port at 9600 baud

  const decoder = new TextDecoderStream();     // Create text decoder for serial data
  inputDone = port.readable.pipeTo(decoder.writable); // Pipe serial to decoder
  inputStream = decoder.readable;             // Get readable stream
  reader = inputStream.getReader();           // Get reader for reading lines

  readLoop();                                 // Start reading incoming data
  sendColorToArduino();                        // Send initial brush color to LED
}
// Buffer to store incomplete serial lines
let buffer = "";

// Continuously read serial data from Arduino
async function readLoop() {
  while (true) {
    const { value, done } = await reader.read(); // Read chunk of serial data
    if (done) { reader.releaseLock(); break; }   // Exit loop if port closed
    if (value) {
      buffer += value;                            // Append incoming data
      let lines = buffer.split("\n");            // Split into lines
      buffer = lines.pop();                       // Keep incomplete line

      // Parse each complete line of data
      for (let line of lines) {
        line = line.trim();                       // Remove whitespace
        if (!line) continue;                      // Skip empty lines
        const parts = line.split(",");            // Split comma-separated values
        if (parts.length === 4) {                 // Expect 4 values: joyX, joyY, pot, button
          joyX = parseInt(parts[0]);             // Convert X to integer
          joyY = parseInt(parts[1]);             // Convert Y to integer
          potVal = parseInt(parts[2]);           // Convert potentiometer value
          buttonVal = parseInt(parts[3]);        // Convert button state
        }
      }
    }
  }
}

// --------------------- BACK TO ARDUINO --------------------- //
// Send current brush RGB color to Arduino
async function sendColorToArduino() {
  if (!port || !port.writable) return;                            // Exit if no port
  const encoder = new TextEncoder();                              // Create encoder for text
  const writer = port.writable.getWriter();                       // Get writer to send data
  let colorString = brushR + "," + brushG + "," + brushB + "\n";  // Format RGB
  await writer.write(encoder.encode(colorString));                // Send to Arduino
  writer.releaseLock();                                           // Release lock after writing
}