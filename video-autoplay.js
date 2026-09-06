'use strict';
(() => {
 const videos=[...document.querySelectorAll('video')],visible=new Set(),manualPause=new WeakSet();
 function pause(video){if(!video.paused){video.dataset.autoPaused='true';video.pause()}}
 function play(video){if(document.hidden||manualPause.has(video))return;video.play().catch(()=>{ /* Native controls remain available if autoplay is blocked. */ })}
 for(const video of videos){video.muted=true;video.defaultMuted=true;video.autoplay=true;video.loop=true;video.playsInline=true;video.controls=true;
  video.addEventListener('pause',()=>{if(video.dataset.autoPaused!=='true'&&!video.ended)manualPause.add(video)});
  video.addEventListener('play',()=>{delete video.dataset.autoPaused;manualPause.delete(video)});
 }
 const observer=new IntersectionObserver(entries=>entries.forEach(({target:video,isIntersecting})=>{if(isIntersecting){visible.add(video);play(video)}else{visible.delete(video);pause(video)}}),{threshold:.1});videos.forEach(v=>observer.observe(v));
 document.addEventListener('visibilitychange',()=>{for(const v of videos){if(document.hidden)pause(v);else if(visible.has(v))play(v)}});
})();
