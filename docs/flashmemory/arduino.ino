// FlashMemory Arduino Code 


// ----------------------- Variables -----------------------
const int LED_PINS[4] = {8,9,10,11};    // Blue = 8, Red = 9, Green = 10, Yellow = 11
const int BUTTON_PIN = 2;               // Button to change difficulty

int lastButtonState = HIGH;             // For debouncing the button

unsigned long lastDebounce = 0;         // Timestamp of the last button press
int debounceDelay = 200;                // Debounce delay in milliseconds


// ----------------------- Setup -----------------------
void setup(){   

    Serial.begin(9600); // Start serial communication at 9600 baud rate

    // Set LED pins as OUTPUT
    for(int i=0;i<4;i++){
        pinMode(LED_PINS[i],OUTPUT);
    }
    pinMode(BUTTON_PIN,INPUT_PULLUP);   // Set the button pin as input with pull-up resistor

    Serial.println("READY");            // Send a ready signal to the web interface, indicates the Arduino is set up and waiting for input
}

// ----------------------- Main Loop -----------------------
void loop(){
  readButton();
}

// ----------------------- Button Reading -----------------------
void readButton(){
  int buttonState = digitalRead(BUTTON_PIN);        // Read the current state of the button

  // Check for button press (active LOW) and debounce
  if(buttonState==LOW && lastButtonState==HIGH){
    // If the button was just pressed and enough time has passed since the last press, send a signal to the web interface
    if(millis()-lastDebounce>debounceDelay){
      Serial.println("MODE_BUTTON");
      // Update the last debounce time to prevent multiple signals from a single press
      lastDebounce=millis();
    }
  }
  lastButtonState=buttonState; // Update the last button state for the next loop iteration
}

// ----------------------- Serial Event -----------------------
void serialEvent(){
    // Read incoming serial messages from the web interface and control the LEDs accordingly
    while(Serial.available()){
        String msg=Serial.readStringUntil('\n');
        // When the web interface sends a message to turn on an LED, the code extracts the LED index and turns on the corresponding LED.
        if(msg.startsWith("LED_ON")){
            int led=msg.substring(7).toInt();
            digitalWrite(LED_PINS[led],HIGH);
        }

        // When the web interface sends a message to turn off an LED, the code extracts the LED index and turns off the corresponding LED.
        if(msg.startsWith("LED_OFF")){
            int led=msg.substring(8).toInt();
            digitalWrite(LED_PINS[led],LOW);
        }
    }
}