// ----------------------- SERIAL SETTINGS -----------------------
const BAUD_RATE = 9600;

let port;                // Serial port object
let connectBtn;          // Connect Arduino button
let connected = false;   // Is Arduino connected?


// ----------------------- GAME STATES -----------------------
// Possible states: disconnected Arduino, start game, countdown, playing, gameover
let gameState = "disconnected"; 


// ----------------------- GAME VARIABLES -----------------------
let sequence = [];       // LED sequence
let userIndex = 0;       // Index of user's current input
let level = 1;           // Current level
let score = 0;           // Current score
let highScore = 0;       // Highest score
let playerTurn = false;  // Is it the player's turn?


// ----------------------- COUNTDOWN -----------------------
let countdownValue = 3;      // Countdown number before game starts
let countdownTimer = 0;      // Timer to track countdown


// ----------------------- MODES -----------------------
let modeIndex = 1;                       // 0=Easy,1=Normal,2=Hard
let modeNames = ["Easy","Normal","Hard"];
let modeSpeeds = [700,500,250];          // Flash speed per mode
let flashSpeed = 500;                    // Current flash speed
let modeMessage = "";                    // Temporary mode notification message
let modeMessageTimer = 0;                // Timer for message display


// ----------------------- LED VISUALS -----------------------
// index 0 → pin 8  → blue
// index 1 → pin 9  → red
// index 2 → pin 10 → green
// index 3 → pin 11 → yellow

// LED colors in clockwise order: Up, Right, Down, Left
const ledColors = ["#2196F3","#F44336","#4CAF50", "#C9A000"];
const arrows    = ["↑","→","←","↓"];                                    // Arrow labels
let ledStates = [false,false,false,false];                              // LEDs ON/OFF state


// ----------------------- SETUP -----------------------
function setup(){
  createCanvas(windowWidth, windowHeight);  // Fullscreen canvas
  textFont("monospace");                        // Retro pixel font
  textAlign(CENTER, CENTER);

  setupSerial();                            // Initialize Arduino serial
  flashSpeed = modeSpeeds[modeIndex];       // Set initial flash speed
}


// ----------------------- MAIN DRAW LOOP -----------------------
function draw(){
  background(20);           
  checkConnection();        // Update connection state
  drawBackground();         // Draw background gradient

  // Display different screens based on game state
  if(gameState==="disconnected"){ drawDisconnected(); return; }
  if(gameState==="start"){ drawStartScreen(); return; }
  if(gameState==="countdown"){ drawCountdown(); return; }
  if(gameState==="gameover"){ drawGameOverScreen(); return; }

  // Main gameplay UI
  drawGameUI();             
  drawLEDs();               
  drawModeNotification();   
}

// ----------------------- BACKGROUND GRADIENT -----------------------
function drawBackground(){

  let pixel = 40;

  // Create a noise-based gradient background that changes with level and time
  for(let x=0; x<width; x+=pixel){
    for(let y=0; y<height; y+=pixel){

      // Use Perlin noise to create a dynamic, organic background that evolves as the player progresses through levels and time
      let n = noise(x*0.01, y*0.01, frameCount*0.01);

      // Map the noise value to a color range that becomes more intense as the level increases
      let base = map(level,1,20,30,120);

      // Create a color palette that shifts with the noise and level
      let r = base + n*40;
      let g = base + n*20;
      let b = 120 + n*80;

      fill(r,g,b,120);        // Semi-transparent fill for layered effect
      noStroke();             // No stroke for smooth rectangles
      rect(x,y,pixel,pixel);  // Draw the pixel rectangle with the calculated color
    }
  }

}

// ----------------------- SCREENS -----------------------

// Screen when no Arduino is connected
function drawDisconnected(){
  fill("white");
  textSize(40);
  text("Plug in an Arduino to Play!", width/2, height/2);
}

// Start screen with game title and instructions
function drawStartScreen(){
  fill("white");
  textSize(70); text("Memory Game", width/2, height/2-120);
  textSize(30); text("Press ENTER to Start", width/2, height/2);
  textSize(24); text("Use Arrow Keys to Repeat the Pattern", width/2, height/2+60);

}

// Countdown screen before the game starts
function drawCountdown(){
  fill("white");
  textSize(120); text(countdownValue,width/2,height/2);
  textSize(30); text("Get Ready!", width/2, height/2+120);

  // Countdown logic every 1 second
  if(millis() - countdownTimer > 1000){
    countdownValue--;
    countdownTimer = millis();

    if(countdownValue === 0){
      // Start the game after countdown
      setTimeout(()=>{
        gameState="playing";
        addStep();
        playSequence();
      },500);
    }
  }
}

// Game over screen showing final score and high score
function drawGameOverScreen(){
  fill("red"); textSize(70); text("Game Over", width/2, height/2-120);
  fill("white"); textSize(30);
  text(`Score: ${score}`, width/2, height/2-20);
  textSize(30); text("Change Mode?", width/2, height/2+60);
  textSize(20); text("Current: " + modeNames[modeIndex], width/2, height/2+90);
  textSize(30); text("Press ENTER to Restart", width/2, height/2+180);
}


// ----------------------- GAME UI -----------------------
function drawGameUI(){
  fill("white");
  textSize(25);
  text(`Score: ${score}`, width/2, 60);
  text(`High Score: ${highScore}`, width/2, 90);
  textSize(40); text(`Level ${level}`, width/2, height/2-180);
  textSize(25); text(playerTurn ? "Your Turn" : "Watch Carefully", width/2, height/2-140);
  textSize(20); text(`Mode: ${modeNames[modeIndex]}`, width-120, 40);
}

// ----------------------- KEY INPUT -----------------------
function keyPressed(){
  if(!connected) return;

  // Start game from start screen
  if(gameState==="start" && keyCode===ENTER){ startGame(); return; }

  // Restart from gameover
  if(gameState==="gameover" && keyCode===ENTER){ restartGame(); return; }

  // Only allow input during player's turn
  if(gameState!=="playing" || !playerTurn) return;

  if(keyCode === UP_ARROW)    handleUserInput(0); // Blue
  if(keyCode === RIGHT_ARROW) handleUserInput(1); // Red
  if(keyCode === LEFT_ARROW)  handleUserInput(2);
  if(keyCode === DOWN_ARROW)  handleUserInput(3); 
}

// ----------------------- GAME FLOW -----------------------

// Initialize game variables for a new game
function startGame(){
  sequence=[]; level=1; score=0;
  countdownValue=3; countdownTimer=millis();
  gameState="countdown";
}

// Reset game variables to restart after game over
function restartGame(){
  sequence=[]; level=1; score=0; userIndex=0;
  countdownValue=3; countdownTimer=millis();
  gameState="countdown";
}


// ----------------------- USER INPUT -----------------------
function handleUserInput(index){
  // Glow effect for key press
  port.write(`LED_ON,${index}\n`);
  setLEDVisual(index,true);

  // Turn off LED after short delay
  setTimeout(()=>{
    port.write(`LED_OFF,${index}\n`);
    setLEDVisual(index,false);
  },250);

  // Check if input matches sequence
  if(index===sequence[userIndex]){
    userIndex++;
    if(userIndex===sequence.length){
      // Player completed sequence
      score++;                            // Increment score
      highScore=max(score, highScore);    // Update high score
      level++;                            // Increment level
      playerTurn=false;                   // End player's turn

      // winAnimation();                  // Play win animation

      // Hard mode: random flashes between rounds
      if(modeNames[modeIndex]==="Hard"){
        hardModeFlash(()=>{ addStep(); playSequence(); });  
      } else {
        addStep();
        setTimeout(playSequence,600); // Normal/Easy: straight to next round
      }
    }
  } else {
    // Wrong input ends game
    gameState="gameover";
    playerTurn=false;
  }
}

// ----------------------- SEQUENCE FUNCTIONS -----------------------
function addStep(){ sequence.push(floor(random(0,4))); } // Add random LED to sequence

// Play the LED sequence with appropriate timing
async function playSequence(){
  playerTurn=false;

  // Loop through sequence
  for(let i=0;i<sequence.length;i++){
    let led=sequence[i];
    port.write(`LED_ON,${led}\n`);
    setLEDVisual(led,true);
    await sleep(flashSpeed);
    port.write(`LED_OFF,${led}\n`);
    setLEDVisual(led,false);
    await sleep(200);
  }

  // After sequence is played, allow player input
  playerTurn=true;
  userIndex=0;
}

// Win animation for feedback
async function winAnimation(){
  // Flash all LEDs in sequence
  for(let i=0;i<4;i++){
    port.write(`LED_ON,${i}\n`);
    setLEDVisual(i,true);
    await sleep(120);
    port.write(`LED_OFF,${i}\n`);
    setLEDVisual(i,false);
  }
}

// Hard mode random flashing between rounds
function hardModeFlash(callback){
  let flashes=0;
  // Flash random LEDs at intervals
  let interval = setInterval(()=>{
    let led=floor(random(4));
    port.write(`LED_ON,${led}\n`);
    setLEDVisual(led,true);

    // Turn off after short delay
    setTimeout(()=>{
      port.write(`LED_OFF,${led}\n`);
      setLEDVisual(led,false);
    },120);

    flashes++;
    // After 6 random flashes, stop and continue to next round
    if(flashes>6){
      clearInterval(interval);
      setTimeout(callback,300); // Continue next round
    }
  },150);
}

// ----------------------- LED DRAWING -----------------------
function drawLEDs(){
  const centerX=width/2;
  const centerY=height/2+80;
  const spacing=120;
  const positions=[
    [centerX,centerY-spacing],   // index 0 → UP
    [centerX+spacing,centerY],   // index 1 → RIGHT
    [centerX-spacing,centerY],   // index 2 → LEFT
    [centerX,centerY+spacing]    // index 3 → DOWN
  ];

  // Draw each LED with glow effect if active
  for(let i=0;i<4;i++){
    push();
    translate(positions[i][0], positions[i][1]);

    fill(ledColors[i]); noStroke(); ellipse(0,0,100);

    // Glow effect when LED is on
    if(ledStates[i]){
      for(let g=1; g<8; g++){
        stroke(ledColors[i]);
        noFill();
        ellipse(0,0,100+g*6);
      }
    }

    // Draw arrow labels
    stroke("black"); strokeWeight(4);
    fill("white"); textSize(35); text(arrows[i],0,0);
    pop();
  }
}

// Update LED visual states for drawing
function setLEDVisual(index,state){ ledStates[index]=state; }


// ----------------------- MODE FUNCTIONS -----------------------

// Cycle through game modes and update flash speed
function cycleMode(){
  modeIndex++;
  if(modeIndex>2) modeIndex=0;
    flashSpeed=modeSpeeds[modeIndex];
    modeMessage=`Mode: ${modeNames[modeIndex]}`;
    modeMessageTimer=millis();
}

// Display temporary mode change notification
function drawModeNotification(){
  if(millis()-modeMessageTimer<2000){
    fill("white"); textSize(30);
    text(modeMessage,width/2,height-80);
  }
}

// ----------------------- SERIAL FUNCTIONS -----------------------

// Read serial messages from Arduino
function readSerial(){
  if(!port || !port.opened()) return;
  let msg = port.readUntil("\n");
  if(!msg) return;
  msg = msg.trim();

  if(msg==="MODE_BUTTON"){ cycleMode(); }
}

// Initialize serial connection and setup connect button
function setupSerial(){
  port=createSerial();

  connectBtn=createButton("Connect Arduino");
  connectBtn.size(220,60);
  connectBtn.style("font-size","20px");
  connectBtn.mouseClicked(connectClicked);
  connectBtn.position(width/2 - connectBtn.width/2, height/2 + 80);
}

// Connect/disconnect button
async function connectClicked(){
  if(!port.opened()){
    await port.open(BAUD_RATE);
    connected=true;
    connectBtn.hide();
    gameState="start";
  } else {
    port.close();
    connected=false;
    gameState="disconnected";
    connectBtn.show();
  }
}

// Check Arduino connection every frame
function checkConnection(){
  if(port && port.opened()){
    connected=true;
    readSerial();
  } else {
    connected=false;
  }
}


// ----------------------- UTILITY -----------------------
function sleep(ms){ return new Promise(resolve=>setTimeout(resolve,ms)); } // Simple sleep function for async timing

// Adjust canvas & button on resize
function windowResized(){
  resizeCanvas(windowWidth,windowHeight);
  connectBtn.position(width/2 - connectBtn.width/2, height/2 + 80);
}