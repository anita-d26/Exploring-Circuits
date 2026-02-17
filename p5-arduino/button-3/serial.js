class SimpleSerial {
  constructor() {
    this._port = null;
    this._reader = null;
    this._buffer = "";
    this._isOpen = false;
  }

  // Prompt the user to select a port and open it
  async open(baudRate = 9600) {
    if (this._isOpen) return;
    this._port = await navigator.serial.requestPort();
    await this._port.open({ baudRate });
    this._isOpen = true;

    // Start background reading into buffer
    const decoder = new TextDecoderStream();
    this._port.readable.pipeTo(decoder.writable);
    this._reader = decoder.readable.getReader();
    this._readLoop();
  }

  async _readLoop() {
    try {
      while (true) {
        const { value, done } = await this._reader.read();
        if (done) break;
        this._buffer += value;
      }
    } catch (e) {
      // Port was closed or disconnected
    }
  }

  // Read from the buffer up to (and consuming) the given delimiter
  // Returns "" if the delimiter hasn't arrived yet
  readUntil(delimiter = "\n") {
    let idx = this._buffer.indexOf(delimiter);
    if (idx === -1) return "";
    let line = this._buffer.slice(0, idx);
    this._buffer = this._buffer.slice(idx + delimiter.length);
    return line;
  }

  // Send a string to the Arduino
  async write(data) {
    if (!this._isOpen || !this._port?.writable) return;
    const encoder = new TextEncoder();
    const writer = this._port.writable.getWriter();
    await writer.write(encoder.encode(data));
    writer.releaseLock();
  }

  opened() {
    return this._isOpen;
  }

  async close() {
    if (!this._isOpen) return;
    this._isOpen = false;
    await this._reader?.cancel();
    await this._port?.close();
    this._port = null;
    this._reader = null;
    this._buffer = "";
  }
}
