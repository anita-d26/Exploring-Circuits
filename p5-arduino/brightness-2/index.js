const BAUD_RATE = 9600;
let port;

function setup() {
  noCanvas();

  port = createSerial();

  let usedPorts = usedSerialPorts();
  if (usedPorts.length > 0) {
    port.open(usedPorts[0], BAUD_RATE);
  }

  document.getElementById("connectBtn").addEventListener("click", function () {
    if (!port.opened()) {
      port.open(BAUD_RATE);
    } else {
      port.close();
    }
  });

  // When the slider changes, send the value to the Arduino as a raw byte
  document.getElementById("slider").addEventListener("input", function () {
    let val = Number(this.value);
    document.getElementById("value").textContent = val;

    if (port.opened()) {
      port.write([val]);
    }
  });
}

function draw() {
  const statusEl = document.getElementById("status");
  const btn = document.getElementById("connectBtn");

  if (!port.opened()) {
    btn.textContent = "Connect";
    statusEl.textContent = "Not connected";
    return;
  }
  statusEl.textContent = "Connected";
  btn.textContent = "Disconnect";

  // Read the Arduino's echo
  let str = port.readUntil("\n");
  if (str.length === 0) return;

  let brightness = Number(str.trim());
  document.getElementById("value").textContent = brightness;
  document.getElementById("slider").value = brightness;

  // Tint page background to visualize brightness
  document.body.style.backgroundColor = `rgb(${brightness}, ${brightness}, ${brightness})`;
  document.body.style.color = `rgb(${255 - brightness}, ${255 - brightness}, ${255 - brightness})`;
}
