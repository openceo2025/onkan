// training.js
(function() {
  // 自然音のみのリスト
  const allowedNotes = [
    { name: "C4", display: "ド" },
    { name: "D4", display: "レ" },
    { name: "E4", display: "ミ" },
    { name: "F4", display: "ファ" },
    { name: "G4", display: "ソ" },
    { name: "A4", display: "ラ" },
    { name: "B4", display: "シ" },
    { name: "C5", display: "高ド" },
    { name: "D5", display: "高レ" },
    { name: "E5", display: "高ミ" }
  ];

  let currentTargetNote = null;
  let trainingActive = false;
  let answerLocked = false; // 正解処理中は true にする

  // トレーニング開始処理
  function startTraining() {
    trainingActive = true;
    nextNote();
    listenForNote();
  }

  // 次の音符をランダムに選択して譜面に表示
  function nextNote() {
    const randomIndex = Math.floor(Math.random() * allowedNotes.length);
    currentTargetNote = allowedNotes[randomIndex];
    // score.js の noteManager.displayNote() を利用して四分音符("q")として表示
    if (window.noteManager && window.noteManager.displayNote) {
      window.noteManager.displayNote(currentTargetNote, "q");
    }
  }

  // analyze.js (eq.js) による検出結果から正解判定を行う
  function listenForNote() {
    if (!trainingActive) return;
    // 正解処理中は何もしない
    if (answerLocked) {
      setTimeout(listenForNote, 100);
      return;
    }
    // eq.js は #note-display に検出結果を表示しているので、その値を取得
    const detected = document.getElementById("note-display").textContent;
    // 例えば "ド ド" のように2種類の検出結果がスペース区切りで出るので、分割してチェック
    const detectedNotes = detected.split(" ");
    if (detectedNotes.indexOf(currentTargetNote.display) !== -1) {
      // 正解の場合、正解処理をロック
      answerLocked = true;
      if (window.noteManager && window.noteManager.highlightNote) {
        window.noteManager.highlightNote();
      }
      // 1秒後に音符を消去して次の音符へ切り替え、ロックを解除
      setTimeout(function() {
        if (window.noteManager && window.noteManager.clearNote) {
          window.noteManager.clearNote();
        }
        nextNote();
        answerLocked = false;
      }, 1000);
    }
    setTimeout(listenForNote, 100);
  }

  // 外部からトレーニング開始を呼び出せるようにグローバルに公開
  window.startTraining = startTraining;

  // もしカスタムイベント "trainingStart" が送られたら開始する場合
  document.addEventListener("trainingStart", function() {
    startTraining();
  });
})();
