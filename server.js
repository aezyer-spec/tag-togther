const express=require("express");
const http=require("http");
const {Server}=require("socket.io");
const crypto=require("crypto");

const app=express(), server=http.createServer(app), io=new Server(server);
app.use(express.static(__dirname));

const rooms=new Map();
const SPEED=0.012;
const TAG_RADIUS=0.065;
const WIN_TAGS=5;

function code(){return crypto.randomBytes(3).toString("hex").toUpperCase()}
function cleanRoom(r){
  return {players:Object.fromEntries([...r.players].map(([id,p])=>[id,{id,x:p.x,y:p.y}])),chaser:r.chaser,scores:r.scores};
}
function spawn(n){return n===0?{x:.25,y:.5}:{x:.75,y:.5}}

io.on("connection",socket=>{
  socket.on("createRoom",()=>{
    let c; do{c=code()}while(rooms.has(c));
    const r={players:new Map(),chaser:null,scores:{},winner:null};
    rooms.set(c,r);
    socket.join(c);
    const p=spawn(0);r.players.set(socket.id,{id:socket.id,x:p.x,y:p.y});
    r.scores[socket.id]=0;
    socket.data.room=c;
    socket.emit("roomCreated",{playerId:socket.id,room:c,state:cleanRoom(r)});
  });

  socket.on("joinRoom",c=>{
    c=String(c||"").toUpperCase(); const r=rooms.get(c);
    if(!r)return socket.emit("errorMessage","Room not found.");
    if(r.players.size>=2)return socket.emit("errorMessage","That room is full.");
    socket.join(c);
    const p=spawn(1);r.players.set(socket.id,{id:socket.id,x:p.x,y:p.y});
    r.scores[socket.id]=0;
    r.chaser=[...r.players.keys()][0];
    socket.data.room=c;
    io.to(c).emit("state",cleanRoom(r));
    socket.emit("joined",{playerId:socket.id,room:c,state:cleanRoom(r)});
  });

  socket.on("move",v=>{
    const c=socket.data.room,r=rooms.get(c),p=r?.players.get(socket.id);
    if(!r||!p||r.players.size<2||r.winner)return;
    let x=Number(v?.x)||0,y=Number(v?.y)||0;
    const len=Math.hypot(x,y);if(len>1){x/=len;y/=len}
    p.x=Math.max(0.03,Math.min(.97,p.x+x*SPEED));
    p.y=Math.max(0.03,Math.min(.97,p.y+y*SPEED));
    const other=[...r.players.values()].find(q=>q.id!==socket.id);
    if(other && r.chaser===socket.id){
      const d=Math.hypot(p.x-other.x,p.y-other.y);
      if(d<=TAG_RADIUS){
        r.scores[socket.id]=(r.scores[socket.id]||0)+1;
        const tagged=socket.id;
        r.chaser=other.id;
        io.to(c).emit("tag",{by:tagged,score:r.scores[tagged]});
        if(r.scores[tagged]>=WIN_TAGS){
          r.winner=tagged;
          io.to(c).emit("roundOver",{winner:tagged});
          setTimeout(()=>{
            if(rooms.has(c)){
              const rr=rooms.get(c); rr.winner=null; rr.scores={};
              for(const id of rr.players.keys())rr.scores[id]=0;
              rr.chaser=tagged;
              for(const [i,q] of [...rr.players.values()].entries()){const s=spawn(i);q.x=s.x;q.y=s.y}
              io.to(c).emit("state",cleanRoom(rr));
            }
          },1800);
        }
      }
    }
    io.to(c).emit("state",cleanRoom(r));
  });

  socket.on("disconnect",()=>{
    const c=socket.data.room,r=rooms.get(c);if(!r)return;
    r.players.delete(socket.id);delete r.scores[socket.id];
    if(r.players.size===0)rooms.delete(c);
    else {r.chaser=[...r.players.keys()][0];io.to(c).emit("errorMessage","Your opponent disconnected.");io.to(c).emit("state",cleanRoom(r));}
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Tag Together running on port ${PORT}`);
});
