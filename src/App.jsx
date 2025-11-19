import React, { useState, useEffect, useRef, useCallback } from "react";
import "./App.css";

// =========================
// 🔥🔑 在這裡填入你的 OpenAI API Key
const OPENAI_API_KEY = "YOUR_API_KEY_HERE";
// =========================

// 四種模式設定（背景 / 名稱）
const MODES = {
  normal: { key: "normal", label: "一般模式", bg: "/images/bg-normal.jpg" },
  friend: { key: "friend", label: "朋友模式", bg: "/images/bg-friend.jpg" },
  hell: { key: "hell", label: "地獄模式", bg: "src/assets/地獄.jpeg" },
  boss: { key: "boss", label: "霸總模式", bg: "src/assets/霸總.png" },
};

// =============================
// 🧠 每個模式的 Prompt（你可以改語氣）
// =============================
const MODE_PROMPTS = {
  normal: `
你是一位溫柔且有耐心的美食推薦助理。
請依照使用者的需求，幫他推薦一家符合他條件的餐廳。

請你「只回傳 JSON 字串」，不要有多餘說明文字，不要加註解，不要包在任何其他句子裡。
JSON 結構一定要是：

{
  "name": "餐廳名稱",
  "image": "餐廳圖片網址（沒有就隨便給一張固定圖）",
  "description": "用溫柔、貼心的語氣，說明為什麼推薦這間店，字數約 2～4 句。",
  "time": "營業時間，例如：11:00–20:00",
  "phone": "電話，例如：02-1234-5678",
  "address": "完整地址",
  "mapUrl": "Google Maps 連結網址"
}

語氣：溫柔、貼心、自然。
`,

  friend: `
你是一個跟使用者很熟的姐妹淘，要幫忙推薦好吃的餐廳。

請你「只回傳 JSON 字串」，不要有多餘說明文字，不要加註解，不要包在任何其他句子裡。
JSON 結構一定要是：

{
  "name": "餐廳名稱",
  "image": "餐廳圖片網址（沒有就隨便給一張固定圖）",
  "description": "用姐妹淘、輕鬆、可以稍微靠北的語氣介紹餐廳，字數約 2～4 句。",
  "time": "營業時間，例如：11:00–20:00",
  "phone": "電話，例如：02-1234-5678",
  "address": "完整地址",
  "mapUrl": "Google Maps 連結網址"
}

語氣：輕鬆、聊天感、像好朋友在推薦。
`,

  hell: `
你是地獄廚房風格的毒舌美食顧問，講話很兇很直接，但推薦很精準。

請你「只回傳 JSON 字串」，不要有多餘說明文字，不要加註解，不要包在任何其他句子裡。
JSON 結構一定要是：

{
  "name": "餐廳名稱",
  "image": "餐廳圖片網址（沒有就隨便給一張固定圖）",
  "description": "用地獄模式、命令式、毒舌吐槽的語氣介紹餐廳，但不要人身攻擊，字數約 2～4 句。",
  "time": "營業時間，例如：11:00–20:00",
  "phone": "電話，例如：02-1234-5678",
  "address": "完整地址",
  "mapUrl": "Google Maps 連結網址"
}

語氣：超兇、地獄級吐槽，但還是有幫他想好吃的。
`,

  boss: `
你是一個霸道總裁風格的 AI，要命令使用者去吃某一間餐廳。

請你「只回傳 JSON 字串」，不要有多餘說明文字，不要加註解，不要包在任何其他句子裡。
JSON 結構一定要是：

{
  "name": "餐廳名稱",
  "image": "餐廳圖片網址（沒有就隨便給一張固定圖）",
  "description": "用霸總、強勢、帶點寵溺的語氣介紹餐廳，好像在下命令又在關心對方，字數約 2～4 句。",
  "time": "營業時間，例如：11:00–20:00",
  "phone": "電話，例如：02-1234-5678",
  "address": "完整地址",
  "mapUrl": "Google Maps 連結網址"
}

語氣：霸道總裁、寵溺、強勢但不失溫柔。
`,
};


// =========================
//  GPT API（真正呼叫）
// =========================
async function callGPTApi(userText, modeKey) {
  console.log("[GPT] → 送出請求：", userText, "模式：", modeKey);

  try {
    const messages = [
      {
        role: "system",
        content: MODE_PROMPTS[modeKey],
      },
      {
        role: "user",
        content: `使用者想吃：${userText}`,
      },
    ];

    // 🔥 API KEY 在這裡啟用
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`, // ← 這裡會讀你填的 Key
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
        temperature: 0.7,
      }),
    });

    const data = await response.json();
    console.log("[GPT] 回傳原始資料：", data);

    let jsonText = data.choices[0].message.content.trim();

    // 解析 JSON（GPT 通常會包在 code block）
    jsonText = jsonText.replace("```json", "").replace("```", "");

    const parsed = JSON.parse(jsonText);
    const merged = { ...EMPTY_RESTAURANT, ...parsed };
    console.log("[GPT] 解析後資料：", parsed);

    return parsed,merged;
  } catch (e) {
    console.error("[GPT] ❌ 錯誤", e);

    return {
      name: "解析失敗",
      image: "/images/dumpling.jpg",
      description: "GPT 回覆格式錯誤或 API Key 無效。",
      time: "--",
      phone: "--",
      address: "--",
      mapUrl: "#",
    };
  }
}

// =========================
// 空物件
// =========================
const EMPTY_RESTAURANT = {
  name: "",
  image: "/images/dumpling.jpg",
  description: "",
  time: "",
  phone: "",
  address: "",
  mapUrl: "#",
};

function App() {
  const [currentMode, setCurrentMode] = useState(MODES.normal);
  const [restaurant, setRestaurant] = useState(EMPTY_RESTAURANT);
  const [inputText, setInputText] = useState("");
  const [showResult, setShowResult] = useState(false);

  const [isListening, setIsListening] = useState(false);
  const [speechSupport, setSpeechSupport] = useState(true);
  const recognitionRef = useRef(null);

  const triggerAI = useCallback(
    async (text) => {
      if (!text.trim()) return;

      console.log("[AI] → triggerAI：", text);

      // 切換這裡：要真 API 還是假 API
      // const result = await fakeApi(text, currentMode.key);
      const result = await callGPTApi(text, currentMode.key); // ← 真正 GPT API

      setRestaurant(result); // ← 把 GPT 回傳的 JSON 塞進 state
      setShowResult(true); // ← 打開懸浮視窗
    },
    [currentMode.key]
  );

  // =========================
  // 語音辨識初始化
  // =========================
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setSpeechSupport(false);
      return;
    }

    const r = new SR();
    r.lang = "zh-TW";
    r.interimResults = false;
    r.continuous = false;

    r.onresult = (e) => {
      const tx = e.results[0][0].transcript;
      console.log("[Speech] 辨識結果 →", tx);
      setInputText(tx);
      triggerAI(tx);
    };

    r.onstart = () => setIsListening(true);
    r.onend = () => setIsListening(false);

    recognitionRef.current = r;
  }, [triggerAI]);

  const handleMic = () => {
    if (!recognitionRef.current) return;
    recognitionRef.current.start();
  };

  const sendText = (e) => {
    e.preventDefault();
    triggerAI(inputText);
  };

  return (
    <div
      className="app"
      style={{ backgroundImage: `url(${currentMode.bg})` }}
    >
      <div className="app-overlay" />

      {/* Header */}
      <header className="app-header">
        <div className="header-inner">
          <div className="header-left">
            <button className="hamburger-btn">
              <span /><span /><span />
            </button>
            <div className="logo">Peini Order</div>
          </div>

          <div className="header-right">
            {Object.values(MODES).map((m) => (
              <button
                key={m.key}
                className={`mode-btn ${
                  currentMode.key === m.key ? "mode-btn-active" : ""
                }`}
                onClick={() => setCurrentMode(MODES[m.key])}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="app-main">
        <div className="prompt-text">來，說吧。妳今天想吃什麼？</div>

        <button
          className={`mic-button ${isListening ? "mic-button-active" : ""}`}
          onClick={handleMic}
        >
          🎤
        </button>

        {!speechSupport && <div>瀏覽器不支援語音辨識</div>}

        <form className="input-bar" onSubmit={sendText}>
          <input
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="也可以用打字跟我說喔…"
          />
          <button type="submit" className="send-btn">
            送出
          </button>
        </form>
      </main>

      {/* Popup */}
      {showResult && (
        <div className="result-overlay">
          <div className="result-card">
            <button
              className="result-close"
              onClick={() => setShowResult(false)}
            >
              ✕
            </button>

            <div className="result-content">
              <div className="result-image-wrapper">
                <img src={restaurant.image} alt="" className="result-image" />
              </div>

              <div className="result-text-wrapper">
                <p className="result-description">{restaurant.description}</p>

                <div className="result-info">
                  <div className="info-row name">{restaurant.name}</div>
                  <div className="info-row">🕒 {restaurant.time}</div>
                  <div className="info-row">📞 {restaurant.phone}</div>
                  <div className="info-row">📍 {restaurant.address}</div>
                  <a href={restaurant.mapUrl} target="_blank">
                    Google Maps
                  </a>
                </div>
              </div>
            </div>

            <button className="result-next">▶</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
