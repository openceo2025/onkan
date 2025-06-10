const keys = document.querySelectorAll(".key"),
  note = document.querySelector(".nowplaying"),
  hints = document.querySelectorAll(".hints");

function playNote(e) {
  if(window.sharedAudioContext && window.sharedAudioContext.state === 'suspended'){
    window.sharedAudioContext.resume()
  }
  const audio = document.querySelector(`audio[data-key="${e.keyCode}"]`),
    key = document.querySelector(`.key[data-key="${e.keyCode}"]`);

  if (!key) return;

  const keyNote = key.getAttribute("data-note");

  key.classList.add("playing");
  note.innerHTML = keyNote;
  audio.currentTime = 0;
  audio.play();
}

function removeTransition(e) {
  if (e.propertyName !== "transform") return;
  this.classList.remove("playing");
}

function hintsOn(e, index) {
  e.setAttribute("style", "transition-delay:" + index * 50 + "ms");
}

hints.forEach(hintsOn);

keys.forEach(key => key.addEventListener("transitionend", removeTransition));

window.addEventListener("keydown", playNote);
keys.forEach(function(key){
  key.addEventListener("click",function(){
    const keyCode = key.getAttribute("data-key");
    playNote({keyCode: keyCode});
  });

  key.addEventListener("touchstart",function(e){
    const keyCode = key.getAttribute("data-key");
    playNote({keyCode: keyCode});
    e.preventDefault();
  });
});

document.addEventListener("DOMContentLoaded", function(){
  const audioElements = document.querySelectorAll("audio[data-key]");
  audioElements.forEach(function(audio){
    if(window.sharedAudioContext && window.sharedAnalyser){
      const mediaSource = window.sharedAudioContext.createMediaElementSource(audio);
      mediaSource.connect(window.sharedAnalyser);
      mediaSource.connect(window.sharedAudioContext.destination);
    }
  })
})
