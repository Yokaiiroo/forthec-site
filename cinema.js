'use strict';
(() => {
  const cinema = document.querySelector('.cinema');
  const canvas = document.getElementById('energy-field');
  const context = canvas.getContext('2d');
  const world = document.querySelector('.cinema-world');
  const viewport = document.querySelector('.cinema-viewport');
  const chapters = [
    { key:'gains', title:'Un audit plus rapide. Du temps valorisé.', description:'4 000 € estimés sur un audit type. Le détail, étape par étape.', duration:7000 },
    { key:'import', title:'Vos fichiers entrent. Le dossier prend forme.', description:'Consommations, sous-comptages et production réunis.', duration:5700 },
    { key:'calculations', title:'Les calculs prennent le relais.', description:'Courbes de charge, IPE et régressions ISO 50006.', duration:6300 },
    { key:'actions', title:'Le plan d’actions se précise.', description:'Avec Mistral ou manuellement. Vous gardez la validation.', duration:6500 },
    { key:'report', title:'Le livrable fait la différence.', description:'Téléchargez le vrai rapport. Jugez sa qualité.', duration:8500 }
  ];
  const tabs = [...document.querySelectorAll('.chapter-controls button')];
  const scenes = [...document.querySelectorAll('.cinema-scene')];
  const play = document.querySelector('.cinema-play');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(pointer: fine)');
  const effects = document.createElement('button');
  effects.type='button'; effects.className='motion-toggle';
  document.querySelector('footer').append(effects);
  const transfer = document.createElement('div');
  transfer.className = 'inventory-transfer';
  transfer.innerHTML = '<span>INVENTORY<strong>ÉQUIPEMENTS + CARACTÉRISTIQUES</strong></span><i class="transfer-trace" aria-hidden="true"></i><span>PRÊT POUR ENERGY<strong>RAPPORT & PLAN D’ACTIONS</strong></span>';
  document.getElementById('scan-demo').append(transfer);
  let backgroundPaused=motion.matches, paused=motion.matches, finished=motion.matches;
  let current=motion.matches?chapters.length-1:0, elapsed=0, frame=0, last=0, drawLast=0, time=0, width=0, height=0, inView=true;
  function updatePlay() {
    play.querySelector('.play-label').textContent=finished?'Rejouer':paused?'Lire':'Pause';
    play.querySelector('.play-icon').textContent=paused?'▷':'Ⅱ';
    play.setAttribute('aria-label',finished?'Rejouer le parcours Energy':paused?'Lire le parcours Energy':'Mettre le parcours Energy en pause');
    play.setAttribute('aria-pressed',String(paused));
    cinema.dataset.paused=String(paused);
  }
  function updateEffects() {
    document.body.dataset.motion=backgroundPaused?'paused':'active';
    effects.textContent=backgroundPaused?'Effets visuels : en pause':'Effets visuels : actifs';
    effects.setAttribute('aria-pressed',String(!backgroundPaused));
    effects.setAttribute('aria-label',backgroundPaused?'Activer les effets visuels':'Mettre les effets visuels en pause');
  }
  function showChapter(index) {
    current=index; elapsed=0;
    const chapter=chapters[index];
    cinema.dataset.chapter=chapter.key;
    tabs.forEach((tab,i)=>{
      const active=i===index;
      tab.setAttribute('aria-selected',String(active)); tab.tabIndex=active?0:-1;
      tab.style.setProperty('--chapter-progress',active&&paused?'1':'0');
      scenes[i].setAttribute('aria-hidden',String(!active)); scenes[i].inert=!active;
    });
    document.getElementById('cinema-counter').textContent=`0${index+1} / 0${chapters.length}`;
    document.getElementById('cinema-title').textContent=chapter.title;
    document.getElementById('cinema-description').textContent=chapter.description;
  }
  tabs.forEach((tab,index)=>{
    tab.querySelector('span').textContent=String(index+1).padStart(2,'0');
    const select=()=>{paused=true;finished=false;showChapter(index);updatePlay();};
    tab.addEventListener('click',select);
    tab.addEventListener('keydown',event=>{
      let next;
      if(event.key==='ArrowRight') next=(index+1)%tabs.length;
      if(event.key==='ArrowLeft') next=(index+tabs.length-1)%tabs.length;
      if(event.key==='Home') next=0;
      if(event.key==='End') next=tabs.length-1;
      if(next!==undefined){event.preventDefault();tabs[next].click();tabs[next].focus();}
    });
  });
  play.addEventListener('click',()=>{
    if(finished){finished=false;paused=false;showChapter(0);}
    else paused=!paused;
    updatePlay(); start();
  });
  effects.addEventListener('click',()=>{
    backgroundPaused=!backgroundPaused;
    if(backgroundPaused) {paused=true;updatePlay();}
    updateEffects();start();
  });
  motion.addEventListener('change',()=>{
    backgroundPaused=motion.matches;
    if(motion.matches){paused=true;finished=true;showChapter(chapters.length-1);}
    updatePlay();updateEffects();draw();start();
  });
  function resize(){
    width=innerWidth;height=innerHeight;
    const ratio=Math.min(devicePixelRatio||1,1.5);
    canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);
    if(context)context.setTransform(ratio,0,0,ratio,0,0);
    const scale=Math.min(viewport.clientWidth/660,1.12);
    cinema.style.setProperty('--world-scale',String(scale));
    draw();
  }
  function draw(){ window.ForthecField.draw(context,width,height,time); }
  function tick(timestamp){
    if(document.hidden){frame=0;return;}
    const delta=last?Math.min(timestamp-last,100):0;last=timestamp;
    if(!paused&&inView){
      elapsed+=delta;
      tabs[current].style.setProperty('--chapter-progress',String(Math.min(elapsed/chapters[current].duration,1)));
      if(elapsed>=chapters[current].duration){
        if(current<chapters.length-1)showChapter(current+1);
        else{paused=true;finished=true;updatePlay();}
      }
    }
    if(!backgroundPaused&&timestamp-drawLast>33){time+=Math.min((timestamp-drawLast)/1000,.1);drawLast=timestamp;draw();}
    if(backgroundPaused&&paused){frame=0;return;}
    frame=requestAnimationFrame(tick);
  }
  function start(){last=0;if(!frame&&!document.hidden&&(!paused||!backgroundPaused))frame=requestAnimationFrame(tick);}
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;}else start();});
  if('IntersectionObserver' in window){
    new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;cinema.dataset.offscreen=String(!inView);if(inView)start();},{threshold:.1}).observe(cinema);
    const reveal=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-revealed');reveal.unobserve(entry.target);}}),{threshold:.2});
    document.querySelectorAll('.product').forEach(element=>reveal.observe(element));
  }
  cinema.addEventListener('pointermove',event=>{
    if(!finePointer.matches||motion.matches||backgroundPaused)return;
    const rect=cinema.getBoundingClientRect(),x=(event.clientX-rect.left)/rect.width-.5,y=(event.clientY-rect.top)/rect.height-.5;
    world.style.setProperty('--pointer-x',`${-y*3}deg`);world.style.setProperty('--pointer-y',`${x*4}deg`);
  });
  cinema.addEventListener('pointerleave',()=>{world.style.setProperty('--pointer-x','0deg');world.style.setProperty('--pointer-y','0deg');});
  window.addEventListener('resize',resize);
  if('ResizeObserver' in window)new ResizeObserver(resize).observe(viewport);
  resize();showChapter(current);updatePlay();updateEffects();start();
})();
