document.addEventListener("DOMContentLoaded", function() {
  // キャンバスの取得
  const canvas = document.getElementById("eq");
  const ctx = canvas.getContext("2d");

  // AudioContext の作成（ブラウザごとに名前が異なる場合への対応）
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  const audioCtx = new AudioContext();

  // Analyser ノードの作成
  const analyser = audioCtx.createAnalyser();
  analyser.fftSize = 8192; // 周波数分解能（必要に応じて調整）
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  window.sharedAudioContext = audioCtx;
  window.sharedAnalyser = analyser;

  // 5秒間の平均ノイズ（振幅）を計算するためのグローバル変数
  let accumulatedNoise = 0;
  let sampleCount = 0;
  let dynamicThreshold = 10; // 初期値

  // 5秒ごとに蓄積したノイズレベルの平均でしきい値を更新する
  setInterval(function(){
    if (sampleCount > 0) {
      dynamicThreshold = accumulatedNoise / sampleCount;
      // 蓄積値とサンプル数をリセット
      accumulatedNoise = 0;
      sampleCount = 0;
      console.log("Updated dynamic threshold:", dynamicThreshold);
    }
  }, 5000);

  // マイク使用の許可をユーザーに要求
  navigator.mediaDevices.getUserMedia({ audio: true, video: false })
    .then(function(stream) {
      // マイクの入力を AudioNode に変換して analyser に接続
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      // 描画開始
      draw();
      document.dispatchEvent(new Event("trainingStart"));
      if (audioCtx.state !== 'runnning'){
        audioCtx.resume().then(() =>{
          console.log("audio ctx resumed");
        });
      }
    })
    .catch(function(err) {
      console.error("マイクへのアクセスが拒否されました:", err);
      draw();
      document.dispatchEvent(new Event("trainingStart"));
    });

  // 描画関数（アニメーションループ）
  function draw() {
    requestAnimationFrame(draw);

    // 周波数データを dataArray に格納
    analyser.getByteFrequencyData(dataArray);

    // --- 5秒間の平均ノイズ更新用の処理 ---
    // フレームごとに全ビンの平均値を計算
    let frameSum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      frameSum += dataArray[i];
    }
    const frameAverage = frameSum / dataArray.length;
    accumulatedNoise += frameAverage;
    sampleCount++;

    // キャンバスのクリア（黒の背景でわずかに透過させ、トレイル効果を出す）
    ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 白い線でイコライザーを描画
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#fff";
    ctx.beginPath();

    const fMin = 230;
    const fMax = 690;
    const binFreq = (audioCtx.sampleRate / 2) / bufferLength;
    const startIndex = Math.floor(fMin / binFreq);
    const endIndex = Math.min(bufferLength - 1, Math.ceil(fMax / binFreq));
    for (let i = startIndex; i <= endIndex; i++){
      let freq = i * binFreq;
      let x = canvas.width * (freq - fMin) / (fMax - fMin);
      let v = dataArray[i] / 255;
      let y = canvas.height - (v * canvas.height);
      if(i === startIndex){
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    // ノイズ判定：更新された dynamicThreshold を使用
    const detectedNotePeak = detectNoteByPeak(dataArray, audioCtx, dynamicThreshold);

    if (detectedNotePeak) {
      document.getElementById("note-display").textContent = detectedNotePeak;
    } else {
      // しきい値未満の場合は、ノートなしとみなす
      document.getElementById("note-display").textContent = "";
    }
  }

  /**
   * FFTデータからピーク周波数を検出し、その周波数が属するノート帯域を判定する関数
   * @param {Uint8Array} dataArray - AnalyserNode.getByteFrequencyData() で取得したFFTデータ配列
   * @param {AudioContext} audioCtx - 現在の AudioContext (sampleRate取得用)
   * @param {number} threshold - ピーク振幅のしきい値。これ未満の場合はノート検出しない
   * @returns {string|null} - 検出されたノートの表示名（例："ド", "レ" など）、または条件を満たさない場合は null
   */
  function detectNoteByPeak(dataArray, audioCtx, threshold) {
    // サンプルレートとFFTデータのビン数から、各ビンが表す周波数幅を計算
    const sampleRate = audioCtx.sampleRate;
    const bufferLength = dataArray.length;
    const binFreq = (sampleRate / 2) / bufferLength;

    // FFTデータ全体からピーク（最大振幅）のビンを検出
    let peakIndex = 0;
    let peakValue = 0;
    for (let i = 0; i < bufferLength; i++) {
      if (dataArray[i] > peakValue) {
        peakValue = dataArray[i];
        peakIndex = i;
      }
    }

    // ピーク値がしきい値未満なら十分な信号がないと判断
    if (peakValue < threshold) {
      return null;
    }

    // ピークのビンから実際の周波数を算出
    const peakFreq = peakIndex * binFreq;

    // 各ノートの周波数帯域を定義
    const notes = [
      { name: "C4", display: "ド",    min: 254, max: 269 },
      { name: "C#4", display: "ド#",  min: 269, max: 285 },
      { name: "D4", display: "レ",    min: 285, max: 302 },
      { name: "D#4", display: "レ#",  min: 302, max: 320 },
      { name: "E4", display: "ミ",    min: 320, max: 339 },
      { name: "F4", display: "ファ",  min: 339, max: 360 },
      { name: "F#4", display: "ファ#", min: 360, max: 381 },
      { name: "G4", display: "ソ",    min: 381, max: 404 },
      { name: "G#4", display: "ソ#",  min: 404, max: 428 },
      { name: "A4", display: "ラ",    min: 428, max: 453 },
      { name: "A#4", display: "ラ#",  min: 453, max: 480 },
      { name: "B4", display: "シ",    min: 480, max: 509 },
      { name: "C5", display: "高ド",  min: 509, max: 539 },
      { name: "C#5", display: "ド#",  min: 539, max: 571 },
      { name: "D5", display: "高レ",  min: 571, max: 605 },
      { name: "D#5", display: "高レ#", min: 605, max: 641 },
      { name: "E5", display: "高ミ",  min: 641, max: 679 }
    ];

    // ピーク周波数がどのノート帯域に該当するかをチェック
    for (const note of notes) {
      if (peakFreq >= note.min && peakFreq < note.max) {
        return note.display;
      }
    }

    // どの帯域にも該当しなかった場合は null を返す
    return null;
  }


});
