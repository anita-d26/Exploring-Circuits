const BAUD_RATE = 9600;
let port;

function setup() {
  noCanvas(); // No p5 canvas — we're using plain DOM elements

  port = createSerial();

  // Auto-reconnect to a previously used port
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
}

function draw() {
  const statusEl = document.getElementById("status");
  const btn = document.getElementById("connectBtn");

  if (!port.opened()) {
    btn.textContent = "Connect";
    statusEl.textContent = "Not connected";
    return;
  }

  btn.textContent = "Disconnect";

  let str = port.readUntil("\n");
  if (str.length === 0) return;

  let val = str.trim();
  if (val === "1") {
    statusEl.textContent = "Pressed!";
  } else if (val === "0") {
    statusEl.textContent = "Not pressed";
  }
}
