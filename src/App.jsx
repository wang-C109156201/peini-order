import React, { useState, useEffect, useRef } from "react";
import "./App.css";

const MODES = {
  normal: {
    key: "normal",
    label: "一般模式",
    bg: "/images/bg-normal.jpg",
  },
  friend: {
    key: "friend",
    label: "朋友模式",
    bg: "/images/bg-friend.jpg",
  },
  hell: {
    key: "hell",
    label: "地獄模式",
    bg: "src/assets/地獄.jpeg",
  },
  boss: {
    key: "boss",
    label: "霸總模式",
    bg: "src/assets/霸總.png",
  },
};

// 假資料：AI 推薦的餐廳
const mockRestaurant = {
  name: "八方雲集",
  image: "/images/dumpling.jpg",
  description:
    "聽好了，今天中午就去吃水餃。最近便宜、方便、速度又快，高麗菜或番茄口味都可以，你自己選，別磨蹭。",
  time: "11:00–20:00",
  phone: "02 2771 0081",
  address: "10652 台北市大安區新生南路一段 1 號",
  mapUrl: "https://maps.app.goo.gl/xxxxx", // 換成你自己的連結
};

function App() {
  const [currentMode, setCurrentMode] = useState(MODES.normal);
  const [isListening, setIsListening] = useState(false);
  const [inputText, setInputText] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [supportSpeech, setSupportSpeech] = useState(true);

  const recognitionRef = useRef(null);

  // 初始化 Web Speech API
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSupportSpeech(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "zh-TW";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onresult = (event) => {
      if (!event.results || !event.results[0] || !event.results[0][0]) return;
      const transcript = event.results[0][0].transcript;
      setInputText(transcript);
      triggerAI(transcript);
    };

    recognitionRef.current = recognition;
  }, []);

  const handleModeChange = (modeKey) => {
    setCurrentMode(MODES[modeKey]);
  };

  const triggerAI = (text) => {
    if (!text.trim()) return;

    // TODO: 這裡串接你的後端 / AI API
    // 目前用 mockRestaurant 當示意
    setShowResult(true);
  };

  const handleMicClick = () => {
    if (!recognitionRef.current) {
      alert("這個瀏覽器暫時不支援語音辨識，可以先用打字跟我說喔！");
      return;
    }

    if (!isListening) {
      try {
        recognitionRef.current.start();
      } catch (err) {
        // 某些瀏覽器如果重複 start 會丟錯誤
        console.error(err);
      }
    } else {
      recognitionRef.current.stop();
    }
  };

  const handleSend = (e) => {
    e.preventDefault();
    triggerAI(inputText);
  };

  const closeResult = () => {
    setShowResult(false);
  };

  return (
    <div
      className="app"
      style={{
        backgroundImage: `url(${currentMode.bg})`,
      }}
    >
      <div className="app-overlay" />

      {/* 頂部導覽列 */}
      <header className="app-header">
        <div className="header-inner">
          <div className="header-left">
            <div className="logo">Peini Order</div>
          </div>

          <div className="header-right">
            {Object.values(MODES).map((mode) => (
              <button
                key={mode.key}
                className={`mode-btn ${
                  currentMode.key === mode.key ? "mode-btn-active" : ""
                }`}
                onClick={() => handleModeChange(mode.key)}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* 主內容區（人物背景在底圖） */}
      <main className="app-main">
        <div className="prompt-text">
          來，說吧。妳今天想吃什麼？
        </div>

        {/* 語音按鈕 */}
        <button
          className={`mic-button ${isListening ? "mic-button-active" : ""}`}
          onClick={handleMicClick}
        >
          <span className="mic-icon">🎤</span>
        </button>
        {!supportSpeech && (
          <div className="speech-hint">
            你的瀏覽器不支援語音辨識，可以先用打字輸入喔。
          </div>
        )}

        {/* 文字輸入列 */}
        <form className="input-bar" onSubmit={handleSend}>
          <input
            type="text"
            placeholder="也可以用打字跟我說喔…"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          />
          <button type="submit" className="send-btn">
            送出
          </button>
        </form>
      </main>

      {/* AI 回覆懸浮視窗 */}
      {showResult && (
        <div className="result-overlay">
          <div className="result-card">
            <button className="result-close" onClick={closeResult}>
              ✕
            </button>

            {/* 左側切換箭頭（預留，如果之後有多家餐廳可以用） */}
            {/* <button className="result-prev" aria-label="previous result">
              ◀
            </button> */}

            <div className="result-content">
              {/* 左側餐廳圖片 */}
              <div className="result-image-wrapper">
                <img
                  src={mockRestaurant.image}
                  alt={mockRestaurant.name}
                  className="result-image"
                />
              </div>

              {/* 右側文字敘述 */}
              <div className="result-text-wrapper">
                <p className="result-description">
                  {mockRestaurant.description}
                </p>

                {/* 底部資訊 */}
                <div className="result-info">
                  <div className="info-row name">{mockRestaurant.name}</div>

                  <div className="info-row">
                    <span className="info-icon">🕒</span>
                    <span>{mockRestaurant.time}</span>
                  </div>

                  <div className="info-row">
                    <span className="info-icon">📞</span>
                    <a href={`tel:${mockRestaurant.phone.replace(/\s/g, "")}`}>
                      {mockRestaurant.phone}
                    </a>
                  </div>

                  <div className="info-row">
                    <span className="info-icon">📍</span>
                    <span>{mockRestaurant.address}</span>
                  </div>

                  <div className="info-row">
                    <span className="info-icon">🔗</span>
                    <a
                      href={mockRestaurant.mapUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Google Maps 連結
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* 右側垂直置中的切換箭頭 */}
            <button className="result-next" aria-label="next result">
              ▶
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
