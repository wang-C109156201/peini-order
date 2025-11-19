import React, { useState } from "react";
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
    bg: "/images/bg-hell.jpg",
  },
  boss: {
    key: "boss",
    label: "霸總模式",
    bg: "/images/bg-boss.jpg",
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

  const handleModeChange = (modeKey) => {
    setCurrentMode(MODES[modeKey]);
  };

  const handleMicClick = () => {
    // 這裡可以串接實際的語音辨識
    setIsListening((prev) => !prev);
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    // 這裡可以把 inputText 丟給你的後端 / AI
    setShowResult(true);
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
      {/* 半透明遮罩，讓背景比較暗 */}
      <div className="app-overlay" />

      {/* 頂部導覽列 */}
      <header className="app-header">
        <div className="header-left">
          <button className="hamburger-btn" aria-label="menu">
            <span />
            <span />
            <span />
          </button>
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
      </header>

      {/* 中央人物/背景內容區：實際圖片寫在背景層，這裡保持空白即可 */}
      <main className="app-main">
        {/* 中下方提示文字 */}
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
                    <a href={mockRestaurant.mapUrl} target="_blank" rel="noreferrer">
                      Google Maps 連結
                    </a>
                  </div>
                </div>
              </div>

              {/* 右側切換箭頭（之後可用來切換多家餐廳） */}
              <button className="result-next" aria-label="next result">
                ▶
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
