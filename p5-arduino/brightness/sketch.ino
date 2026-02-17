void setup() {
  Serial.begin(9600);    // initialize serial communications
  Serial.setTimeout(10); // set the timeout for parseInt
  pinMode(5, OUTPUT);
}

void loop() {
  if (Serial.available() > 0) {   // if there's serial data
    int inByte = Serial.read();   // read it
    Serial.println(inByte);       // send it back as raw binary data
    analogWrite(5, inByte);       // use it to set the LED brightness
  }
}