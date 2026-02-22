const canvas = document.getElementById("tetris-board");
const ctx = canvas.getContext("2d");
const nextCanvas = document.getElementById("next-canvas").getContext("2d");
const holdCanvas = document.getElementById("hold-canvas").getContext("2d");

const scoreEl = document.getElementById("score");
const levelEl = document.getElementById("level");
const linesEl = document.getElementById("lines");

const ROWS = 20;
const COLS = 10;
const BLOCK = 30;

let board = Array.from({length: ROWS}, () => Array(COLS).fill(0));

const COLORS = {
  'I':'#a7e0eb',   // pastel cyan
  'O':'#fff2a8',   // pastel yellow
  'T':'#d1b3ff',   // pastel purple
  'S':'#a8e6a3',   // pastel green
  'Z':'#ffb3b3',   // pastel red
  'J':'#a3c8ff',   // pastel blue
  'L':'#ffd6a3'    // pastel orange
};

// Semua tetromino 4x4 matrix
const SHAPES = {
  I:[
    [0,0,0,0],
    [1,1,1,1],
    [0,0,0,0],
    [0,0,0,0]
  ],
  O:[
    [0,1,1,0],
    [0,1,1,0],
    [0,0,0,0],
    [0,0,0,0]
  ],
  T:[
    [0,1,0,0],
    [1,1,1,0],
    [0,0,0,0],
    [0,0,0,0]
  ],
  S:[
    [0,1,1,0],
    [1,1,0,0],
    [0,0,0,0],
    [0,0,0,0]
  ],
  Z:[
    [1,1,0,0],
    [0,1,1,0],
    [0,0,0,0],
    [0,0,0,0]
  ],
  J:[
    [1,0,0,0],
    [1,1,1,0],
    [0,0,0,0],
    [0,0,0,0]
  ],
  L:[
    [0,0,1,0],
    [1,1,1,0],
    [0,0,0,0],
    [0,0,0,0]
  ]
};

// Piece Class dengan wall kick sederhana
class Piece {
  constructor(type){
    this.type = type;
    this.shape = SHAPES[type].map(row => [...row]);
    this.x = 3;
    this.y = 0;
    this.color = COLORS[type];
  }

  rotate(){
    const N = this.shape.length;
    const newShape = Array.from({length: N}, () => Array(N).fill(0));
    for(let y=0;y<N;y++){
      for(let x=0;x<N;x++){
        newShape[x][N-1-y] = this.shape[y][x];
      }
    }

    const kicks = [0,-1,1,-2,2];
    for(let i=0;i<kicks.length;i++){
      if(!collision(board,{shape:newShape,x:this.x+kicks[i],y:this.y})){
        this.shape = newShape;
        this.x += kicks[i];
        return;
      }
    }
    // Tidak bisa rotasi → tetap posisi lama
  }
}

function drawBlock(ctx,x,y,color){
  ctx.fillStyle = color;
  ctx.fillRect(x*BLOCK,y*BLOCK,BLOCK,BLOCK);
  ctx.strokeStyle = "#333";
  ctx.strokeRect(x*BLOCK,y*BLOCK,BLOCK,BLOCK);
}

function drawBoard(){
  ctx.fillStyle="#DDD";
  ctx.fillRect(0,0,COLS*BLOCK,ROWS*BLOCK);

  for(let y=0;y<ROWS;y++){
    for(let x=0;x<COLS;x++){
      if(board[y][x]) drawBlock(ctx,x,y,board[y][x]);
    }
  }

  for(let y=0;y<currentPiece.shape.length;y++){
    for(let x=0;x<currentPiece.shape[y].length;x++){
      if(currentPiece.shape[y][x])
        drawBlock(ctx,currentPiece.x+x,currentPiece.y+y,currentPiece.color);
    }
  }
}

function drawMini(ctx, piece){
  const CANVAS_SIZE = 100;
  const PADDING = 10;

  ctx.fillStyle = "#DDD";
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  if(!piece) return;

  // Hitung bounding box aktual tetromino
  let minX = 4, maxX = 0, minY = 4, maxY = 0;
  for(let y=0; y<4; y++){
    for(let x=0; x<4; x++){
      if(piece.shape[y][x]){
        if(x < minX) minX = x;
        if(x > maxX) maxX = x;
        if(y < minY) minY = y;
        if(y > maxY) maxY = y;
      }
    }
  }

  const width = maxX - minX + 1;
  const height = maxY - minY + 1;

  // Ukuran blok agar muat di canvas dengan padding
  const blockSize = Math.min((CANVAS_SIZE - 2 * PADDING) / width, (CANVAS_SIZE - 2 * PADDING) / height);

  // Offset supaya tetromino di tengah canvas
  const offsetX = PADDING + (CANVAS_SIZE - 2 * PADDING - width * blockSize) / 2 - minX * blockSize;
  const offsetY = PADDING + (CANVAS_SIZE - 2 * PADDING - height * blockSize) / 2 - minY * blockSize;

  for(let y=0; y<4; y++){
    for(let x=0; x<4; x++){
      if(piece.shape[y][x]){
        ctx.fillStyle = piece.color;
        ctx.fillRect(offsetX + x*blockSize, offsetY + y*blockSize, blockSize, blockSize);
        ctx.strokeStyle = "#333";
        ctx.strokeRect(offsetX + x*blockSize, offsetY + y*blockSize, blockSize, blockSize);
      }
    }
  }
}

function collision(board,piece,xOffset=0,yOffset=0){
  for(let y=0;y<piece.shape.length;y++){
    for(let x=0;x<piece.shape[y].length;x++){
      if(piece.shape[y][x]){
        const nx = piece.x+x+xOffset;
        const ny = piece.y+y+yOffset;
        if(nx<0 || nx>=COLS || ny>=ROWS) return true;
        if(ny>=0 && board[ny][nx]) return true;
      }
    }
  }
  return false;
}

function merge(board,piece){
  for(let y=0;y<piece.shape.length;y++){
    for(let x=0;x<piece.shape[y].length;x++){
      if(piece.shape[y][x] && piece.y+y>=0) board[piece.y+y][piece.x+x] = piece.color;
    }
  }
}

function clearLines(){
  let linesCleared=0;
  for(let y=ROWS-1;y>=0;y--){
    if(board[y].every(cell=>cell)){
      board.splice(y,1);
      board.unshift(Array(COLS).fill(0));
      linesCleared++;
      y++;
    }
  }
  if(linesCleared>0){
    score += linesCleared*10;
    lines += linesCleared;
    if(lines>=level*10) level++;
    scoreEl.textContent = score;
    linesEl.textContent = lines;
    levelEl.textContent = level;
  }
}

function drop(){
  if(!collision(board,currentPiece,0,1)){
    currentPiece.y++;
  } else {
    merge(board,currentPiece);
    clearLines();
    currentPiece = nextPiece;
    nextPiece = randomPiece();
    canHold = true;
    if(collision(board,currentPiece)){
      alert("Game Over! Score: "+score);
      board = Array.from({length:ROWS},()=>Array(COLS).fill(0));
      score=0;lines=0;level=1;
      scoreEl.textContent=score;
      linesEl.textContent=lines;
      levelEl.textContent=level;
      currentPiece = randomPiece();
      nextPiece = randomPiece();
    }
  }
  drawBoard();
  drawMini(nextCanvas,nextPiece);
  drawMini(holdCanvas,holdPiece);
}

function randomPiece(){
  const types = Object.keys(SHAPES);
  return new Piece(types[Math.floor(Math.random()*types.length)]);
}

// Inisialisasi
let currentPiece = randomPiece();
let nextPiece = randomPiece();
let holdPiece = null;
let canHold = true;
let score = 0;
let lines = 0;
let level = 1;

// Kontrol keyboard
document.addEventListener("keydown", e => {
  // Cegah default behavior untuk tombol yang digunakan di Tetris
  if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," ","Enter"].includes(e.key)){
    e.preventDefault();
  }

  switch(e.key){
    case "ArrowLeft":
      if(!collision(board, currentPiece, -1, 0)) currentPiece.x--;
      break;
    case "ArrowRight":
      if(!collision(board, currentPiece, 1, 0)) currentPiece.x++;
      break;
    case "ArrowDown":
      drop(); // soft drop
      break;
    case " ":
      currentPiece.rotate(); // rotasi sekarang pakai space
      break;
    case "Enter":
      while(!collision(board, currentPiece, 0, 1)) currentPiece.y++; // hard drop
      drop(); // merge & generate piece baru
      break;
    case "Shift":
      if(canHold){
        if(!holdPiece){
          holdPiece = currentPiece;
          currentPiece = nextPiece;
          nextPiece = randomPiece();
        } else {
          [holdPiece, currentPiece] = [currentPiece, holdPiece];
          currentPiece.x = 3; 
          currentPiece.y = 0;
        }
        canHold = false;
      }
      break;
  }

  drawBoard();
  drawMini(nextCanvas, nextPiece);
  drawMini(holdCanvas, holdPiece);
});

// Loop utama
setInterval(drop,500);
drawBoard();
drawMini(nextCanvas,nextPiece);
drawMini(holdCanvas,holdPiece);