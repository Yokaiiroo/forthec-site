'use strict';
// Living energy/data field, used only by the index. Illustrative, not live client data.
(() => {
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const random=n=>{const v=Math.sin(n*127.1+93.7)*43758.5453;return v-Math.floor(v)};
 const colors=['67,235,235','144,112,255','119,255,169'];
 const total=126;
 const nodes=Array.from({length:total},(_,i)=>({group:i%3,seed:random(i+600),cloud:[random(i)*2-1,random(i+150)*2-1,(random(i+300)-.5)*1.5]}));
 let aimX=0,aimY=0,px=0,py=0;
 addEventListener('pointermove',e=>{if(reduced.matches)return;aimX=e.clientX/innerWidth-.5;aimY=e.clientY/innerHeight-.5},{passive:true});
 document.documentElement.addEventListener('pointerleave',()=>{aimX=0;aimY=0});
 const smooth=v=>v*v*(3-2*v),mix=(a,b,t)=>a+(b-a)*t;
 function pose(index,phase,time){const n=nodes[index],g=n.group,k=Math.floor(index/3),u=k/41;
  if(phase===0)return [n.cloud[0]+Math.sin(time*.3+n.seed*20)*.035,n.cloud[1]+Math.cos(time*.24+index)*.045,n.cloud[2]];
  if(phase===1){const branch=Math.floor(k/7),step=(k%7)/6,angle=branch*Math.PI/3-.7;return [Math.cos(angle)*(.2+step*.88),Math.sin(angle)*(.2+step*.88)*.86+(g-1)*.055,(g-1)*.25+Math.sin(step*3)*.13]}
  if(phase===2){const wave=Math.sin(u*6.28+(g*.8))* .21;return [(u-.5)*2.2,(g-1)*.52+wave+(u-.5)*-.34,(g-1)*.25]}
  // Points resolve into a document frame and structured rows of the final report.
  if(index<42){const edge=index/42*4;const side=Math.floor(edge),s=edge-side;return side===0?[-.59+s*1.18,-.92,0]:side===1?[.59,-.92+s*1.84,0]:side===2?[.59-s*1.18,.92,0]:[-.59,.92-s*1.84,0]}
  const row=Math.floor((index-42)/12),col=(index-42)%12;return [-.43+col*.076,-.66+row*.23,.035];
 }
 function draw(ctx,w,h,time){
  if(!ctx)return;ctx.clearRect(0,0,w,h);px+=(aimX-px)*.04;py+=(aimY-py)*.04;
  const mobile=w<650,count=mobile?96:total;const clock=reduced.matches?25:time;
  const phase=Math.floor(clock/8)%4,next=(phase+1)%4,position=(clock%8)/8,blend=smooth(Math.max(0,(position-.55)/.45));
  const yaw=.2+Math.sin(clock*.14)*.1+px*.12,tilt=-.12+py*.07,cy=Math.cos(yaw),sy=Math.sin(yaw),cx=Math.cos(tilt),sx=Math.sin(tilt);
  const scale=Math.min(w*(mobile?.69:.37),h*.52),centerX=w*(mobile?.91:.81),centerY=h*.51;
  const projected=[];
  for(let i=0;i<count;i++){const a=pose(i,phase,clock),b=pose(i,next,clock),p=a.map((v,j)=>mix(v,b[j],blend));const x=p[0]*cy+p[2]*sy,z=-p[0]*sy+p[2]*cy,y=p[1]*cx-z*sx,depth=p[1]*sx+z*cx,factor=3/(3-depth);projected.push({x:centerX+x*scale*factor,y:centerY+y*scale*factor,z:depth,group:nodes[i].group})}
  function edge(a,b,color,alpha,width=1){ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.strokeStyle=`rgba(${color},${alpha})`;ctx.lineWidth=width;ctx.stroke()}
  // Changing topology, rather than a fixed ornamental shape.
  const edges=[];
  for(let i=0;i<count;i++){const a=projected[i];let candidates=[];for(let j=i+1;j<count;j++){const b=projected[j],d=Math.hypot(a.x-b.x,a.y-b.y);if(d<scale*.34&&d>3)candidates.push({j,d})}candidates.sort((a,b)=>a.d-b.d);for(const c of candidates.slice(0,phase===1?3:2))edges.push([i,c.j,c.d])}
  ctx.save();ctx.globalCompositeOperation='screen';
  for(let i=0;i<edges.length;i++){const [a,b,d]=edges[i],p=projected[a],q=projected[b],color=colors[p.group],alpha=(1-d/(scale*.4))*.24;edge(p,q,color,alpha,.65);
   if(i%7===0){const travel=(clock*.3+nodes[a].seed)%1,tx=mix(p.x,q.x,travel),ty=mix(p.y,q.y,travel);const tail={x:mix(p.x,q.x,Math.max(0,travel-.16)),y:mix(p.y,q.y,Math.max(0,travel-.16))};edge(tail,{x:tx,y:ty},color,.75,1.3);ctx.fillStyle=`rgba(${color},.85)`;ctx.fillRect(tx-1,ty-1,2,2)}
  }
  // Three measured-looking series emerge during the analysis phase.
  const chartWeight=(phase===2?1-blend:next===2?blend:0);
  if(chartWeight>.01)for(let g=0;g<3;g++){const points=projected.filter((_,i)=>i%3===g);ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.strokeStyle=`rgba(${colors[g]},${chartWeight*.65})`;ctx.lineWidth=1.6;ctx.stroke()}
  for(let i=0;i<count;i++){const p=projected[i],color=colors[p.group],alpha=.48+Math.sin(clock*1.4+nodes[i].seed*20)*.15,size=i%14===0?4:1.8;
   if(i%14===0){ctx.fillStyle=`rgba(${color},.045)`;ctx.fillRect(p.x-12,p.y-12,24,24);ctx.strokeStyle=`rgba(${color},.22)`;ctx.lineWidth=.6;ctx.strokeRect(p.x-9,p.y-9,18,18)}
   ctx.fillStyle=`rgba(${color},${alpha})`;ctx.fillRect(p.x-size/2,p.y-size/2,size,size);
  }
  // Fine discontinuous energy bands give the network weight without fog or blur.
  for(let g=0;g<3;g++){const subset=projected.filter((_,i)=>i%3===g);for(let k=0;k<subset.length-2;k+=7){const a=subset[k],b=subset[k+1],c=subset[k+2];if(Math.hypot(a.x-c.x,a.y-c.y)>scale*.7)continue;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.lineTo(c.x,c.y);ctx.closePath();ctx.fillStyle=`rgba(${colors[g]},.035)`;ctx.fill()}}
  ctx.restore();
  const veil=ctx.createLinearGradient(0,0,w,0);veil.addColorStop(0,'rgba(3,12,11,.96)');veil.addColorStop(.4,'rgba(3,12,11,.75)');veil.addColorStop(.63,'rgba(3,12,11,0)');ctx.fillStyle=veil;ctx.fillRect(0,0,w,h);
  const label=document.getElementById('living-field-phase');if(label){const key=['DONNÉES ENTRANTES','RÉSEAU ÉNERGÉTIQUE','ANALYSE DES CONSOMMATIONS','STRUCTURATION DU RAPPORT'][phase];if(label.textContent!==key)label.textContent=key}
 }
 window.ForthecField={draw};
})();
