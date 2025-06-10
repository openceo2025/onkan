document.addEventListener("DOMContentLoaded", function() {
  // noteManager を空のオブジェクトとして定義
  window.noteManager = {};

  const VF = Vex.Flow;
  const div = document.getElementById("score");
  
  // 初期レンダラー設定
  let renderer = new VF.Renderer(div, VF.Renderer.Backends.SVG);
  renderer.resize(300, 300);
  let context = renderer.getContext();
  context.fillStyle = "#fff";
  context.strokeStyle = "#fff";
  context.setFont("Arial", 10, "normal");
  
  const startX = 10;
  const startY = 50;
  let currentStave; 

  // 小節を描画する関数（noteManager でも利用できるように登録）
  function drawStave(measureWidth) {
    // クリアはしない（container.innerHTMLを完全に空にしない）
    // もし必要ならここで Renderer を再生成するが、
    // ※ここでは譜面部分のみ再描画するようにする
    div.innerHTML = "";
    // 新たなRenderer生成
    renderer = new VF.Renderer(div, VF.Renderer.Backends.SVG);
    renderer.resize(measureWidth + 20, (window.innerWidth <= 768) ? 600 : 300);
    context = renderer.getContext();
    context.fillStyle = "#fff";
    context.strokeStyle = "#fff";
    context.setFont("Arial", 10, "normal");

    currentStave = new VF.Stave(startX, startY, measureWidth);
    currentStave.addClef("treble").addTimeSignature("4/4");
    currentStave.setContext(context).draw();

    // noteManagerに最新の値を更新
    window.noteManager.stave = currentStave;
    window.noteManager.context = context;
    window.noteManager.renderer = renderer;
  }
  
  // 画面幅に応じたmeasureWidthの算出
  function updateScoreScale() {
    let measureWidth;
    if (window.innerWidth <= 768) {
      measureWidth = window.innerWidth * 0.8;
    } else {
      measureWidth = 300;
    }
    // 保存しておく
    window.noteManager.measureWidth = measureWidth;
    // 描画
    drawStave(measureWidth);
    // もし以前に表示中の音符情報があれば再描画する
    if (window.noteManager.currentNoteData && window.noteManager.currentNoteDuration) {
      window.noteManager.displayNote(window.noteManager.currentNoteData, window.noteManager.currentNoteDuration);
    }
  };

  // 初回描画
  updateScoreScale();
  
  // リサイズ時にも更新
  window.addEventListener("resize", updateScoreScale);

  // グローバルな noteManager の機能を定義
  window.noteManager.displayNote = function(note, duration) {
      // 保存しておく（後の再描画用）
      window.noteManager.currentNoteData = note;
      window.noteManager.currentNoteDuration = duration;
    
      // 既存の音符があればクリア
      window.noteManager.clearNote();
      const VF = Vex.Flow;
      // VexFlow用にキーを作成 (例："C4" -> "c/4")
      let key = note.name[0].toLowerCase() + "/" + note.name.slice(1);
      // 四分音符の場合は "q" を指定（durationは外部から渡す）
      const staveNote = new VF.StaveNote({
        clef: "treble",
        keys: [key],
        duration: duration
      });
      window.noteManager.currentNotes = [staveNote];
      const voice = new VF.Voice({ num_beats: 1, beat_value: 4 });
      voice.addTickable(staveNote);
      window.noteManager.currentVoice = voice;
    const formatter = new VF.Formatter().joinVoices([voice]).format([voice], window.noteManager.stave.width - 20);
    voice.draw(window.noteManager.context, window.noteManager.stave);
  };

  // clearNote: 再描画時に現在の譜面（stave）を再構築する
  window.noteManager.clearNote = function() {
    // ここでは container.innerHTML をクリアするのではなく、
    // 保存した measureWidth を使って再描画する
    if (window.noteManager.measureWidth) {
      drawStave(window.noteManager.measureWidth);
    }
    window.noteManager.currentNotes = [];
  };

  window.noteManager.highlightNote = function() {
    if (window.noteManager.currentNotes.length > 0) {
      // 再描画：譜面を再生成する
      if (window.noteManager.measureWidth) {
        drawStave(window.noteManager.measureWidth);
      }
      // 現在の音符のスタイルを青に変更
        window.noteManager.currentNotes.forEach(function(note) {
           note.setStyle({ strokeStyle: "blue", fillStyle: "blue" });
        });
        // 変更後の音符を再描画
        window.noteManager.currentVoice.draw(window.noteManager.context, window.noteManager.stave);
      }
  };
});
