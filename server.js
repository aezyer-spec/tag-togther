const express=require("express"),http=require("http"),{Server}=require("socket.io"),crypto=require("crypto");
const app=express(),server=http.createServer(app),io=new Server(server);
app.use(express.static(__dirname));app.get("/health",(q,r)=>r.json({ok:true}));
const rooms=new Map(),SPEED=.012,TAG_RADIUS=.065,WIN_TAGS=5;
const code=()=>crypto.randomBytes(3).toString("hex").toUpperCase();
const clean=r=>({players:Object.fromEntries([...r.players].map(([id,p])=>[id,{id,x:p.x,y:p.y,skin:p.skin}])),chaser:r.chaser,scores:r.scores});
const spawn=n=>n===0?{x:.25,y:.5}:{x:.75,y:.5};
io.on("connection",s=>{
 s.on("createRoom",()=>{
  let c;do{c=code()}while(rooms.has(c));let r={players:new Map(),chaser:null,scores:{},winner:null};
  rooms.set(c,r);s.join(c);let p=spawn(0);r.players.set(s.id,{id:s.id,x:p.x,y:p.y,skin:"boy"});r.scores[s.id]=0;s.data.room=c;
  console.log("ROOM CREATED",c);s.emit("roomCreated",{playerId:s.id,room:c,state:clean(r)});
 });
 s.on("joinRoom",c=>{
  c=String(c||"").trim().toUpperCase();console.log("JOIN ROOM",c);let r=rooms.get(c);
  if(!r)return s.emit("errorMessage","Room not found.");if(r.players.size>=2)return s.emit("errorMessage","That room is full.");
  s.join(c);let p=spawn(1);r.players.set(s.id,{id:s.id,x:p.x,y:p.y,skin:"girl"});r.scores[s.id]=0;r.chaser=[...r.players.keys()][0];s.data.room=c;
  io.to(c).emit("state",clean(r));s.emit("joined",{playerId:s.id,room:c,state:clean(r)});
 });
 s.on("move",v=>{
  let r=rooms.get(s.data.room),p=r?.players.get(s.id);if(!r||!p||r.players.size<2||r.winner)return;
  let x=Number(v?.x)||0,y=Number(v?.y)||0,d=Math.hypot(x,y);if(d>1){x/=d;y/=d}
  p.x=Math.max(.04,Math.min(.96,p.x+x*SPEED));p.y=Math.max(.04,Math.min(.96,p.y+y*SPEED));
  let o=[...r.players.values()].find(q=>q.id!==s.id);
  if(o&&r.chaser===s.id&&Math.hypot(p.x-o.x,p.y-o.y)<=TAG_RADIUS){
   r.scores[s.id]=(r.scores[s.id]||0)+1;r.chaser=o.id;io.to(s.data.room).emit("tag",{by:s.id,score:r.scores[s.id]});
   if(r.scores[s.id]>=WIN_TAGS){r.winner=s.id;io.to(s.data.room).emit("roundOver",{winner:s.id});
    setTimeout(()=>{if(!rooms.has(s.data.room))return;let rr=rooms.get(s.data.room);rr.winner=null;rr.scores={};for(let id of rr.players.keys())rr.scores[id]=0;rr.chaser=s.id;for(let [i,q] of [...rr.players.values()].entries()){let z=spawn(i);q.x=z.x;q.y=z.y}io.to(s.data.room).emit("state",clean(rr))},1800);
   }
  }io.to(s.data.room).emit("state",clean(r));
 });
 s.on("disconnect",()=>{let c=s.data.room,r=rooms.get(c);if(!r)return;r.players.delete(s.id);delete r.scores[s.id];if(!r.players.size)rooms.delete(c);else{r.chaser=[...r.players.keys()][0];io.to(c).emit("errorMessage","Your opponent disconnected.");io.to(c).emit("state",clean(r))}});
});
const PORT=process.env.PORT||3000;server.listen(PORT,"0.0.0.0",()=>console.log(`Tag Together running on port ${PORT}`));
