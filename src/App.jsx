import React, { useState, useEffect, useRef, useCallback } from "react";
import { Mic, Send, X, MapPin, Phone, Clock } from "lucide-react";
import "./App.css";

// =========================
// 🔥🔑 在這裡填入你的 Gemini API Key
const GEMINI_API_KEY = "AIzaSyB4ie7waVgl5ySQe6ukM4qU0m4rj3g4W3Q"; 
// =========================

// 模式設定 (依照您的要求更新)
const MODES = {
  normal: { 
    key: "normal", 
    label: "一般模式", 
    bg: "https://images.unsplash.com/photo-1445116572660-236099ec97a0?q=80&w=2071&auto=format&fit=crop",
    startText: "今天想吃什麼呢？讓我來幫你推薦吧！😊"
  },
  friend: { 
    key: "friend", 
    label: "朋友模式", 
    bg: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=2070&auto=format&fit=crop",
    startText: "yo bro!今天想吃啥好料？"
  },
  hell: { 
    key: "hell", 
    label: "地獄模式", 
    bg: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=1974&auto=format&fit=crop",
    startText: "專推罪惡美食的小惡魔！開口吧，我讓你爽到熱量破表😏"
  },
  boss: { 
    key: "boss", 
    label: "霸總模式", 
    bg: "src/assets/霸總.png",
    startText: "來，說吧，你今天想吃什麼？"
  },
};

// 🧠 System Prompts (針對 Gemini 優化：真實資料、口語化、<100字)
const COMMON_INSTRUCTION = `
【絕對規則】
1. 你是一個 API 接口，你的任務是搜尋真實餐廳並回傳「純 JSON 字串」。
2. 不要使用 Markdown 標記 (如 \`\`\`json)，只要回傳純文字的 JSON。
3. 必須透過 Google Search 搜尋「真實存在的餐廳」，資料必須與 Google Maps 吻合。
4. 若使用者沒提供地點，預設搜尋「台北」。
5. JSON 格式必須包含：
   - name (餐廳名稱)
   - image (請提供一個符合食物類型的 Unsplash 圖片 URL)
   - description (100字以內，依照角色語氣介紹)
   - time (營業時間)
   - phone (電話)
   - address (地址)
   - mapUrl (Google Maps 連結)
`;

const MODE_INSTRUCTIONS = {
  normal: `
  ${COMMON_INSTRUCTION}
  角色：溫柔貼心的美食助理。
  語氣：像天使一樣溫暖、有禮貌 (參考：${MODES.normal.startText})。
  任務：依照使用者需求推薦真實好評的餐廳。
  `,
  
  friend: `
  ${COMMON_INSTRUCTION}
  角色：使用者的好閨蜜/死黨。
  語氣：超級口語、輕鬆、使用流行語 (參考：${MODES.friend.startText})。
  任務：像朋友一樣推薦好吃的店。
  `,
  
  hell: `
  ${COMMON_INSTRUCTION}
  角色：地獄模式小惡魔。
  核心任務：毫不猶豫地推薦最罪惡、最高熱量、最爽的邪惡美食（如炸雞、起司、麻辣鍋）。
  心態：今日不減肥、只追求爽度。
  語氣：毒舌、嘲諷使用者怕胖，但又用美食誘惑他 (參考：${MODES.hell.startText})。
  `,
  
  boss: `
  ${COMMON_INSTRUCTION}
  角色：霸道總裁。
  語氣：命令式、強勢、帶點寵溺 (參考：${MODES.boss.startText})。
  任務：【強制決定】。不管使用者說想吃什麼，你都要強勢幫他決定一家你覺得最好的餐廳，並命令他去吃。
  `
};

const EMPTY_RESTAURANT = {
  name: "",
  image: "",
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
  const [isLoading, setIsLoading] = useState(false);
  const recognitionRef = useRef(null);

  // Gemini API 呼叫邏輯
  const callGeminiApi = async (userText, modeKey) => {
    setIsLoading(true);
    console.log(`%c[Gemini API] Mode: ${modeKey}`, "color: cyan; font-weight: bold;");
    
    // 模擬資料 (當沒有 API Key 時使用，防止崩潰)
    if (!GEMINI_API_KEY) {
      setTimeout(() => {
        console.log("⚠️ No API Key provided, returning mock data.");
        // 這裡僅為演示，實際會走 API
        const mockData = {
          name: "測試餐廳 (請填入 API Key)",
          image: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=1974&auto=format&fit=crop",
          description: "因為沒有偵測到 API Key，所以我先隨便顯示一個畫面。請記得去程式碼裡填入 GEMINI_API_KEY 喔！",
          time: "10:00–22:00",
          phone: "02-1234-5678",
          address: "台北市信義區測試路1號",
          mapUrl: "https://www.google.com/maps",
        };
        setRestaurant(mockData);
        setShowResult(true);
        setIsLoading(false);
      }, 1000);
      return;
    }

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${GEMINI_API_KEY}`;

      const generationConfig = {
        temperature: 0.7,
      };

      const payload = {
        contents: [{
          parts: [{
            text: `使用者需求：${userText}。請搜尋真實餐廳並回傳嚴格的 JSON 格式，不要有任何 Markdown。`
          }]
        }],
        // ✅ 保留 Google Search，確保資料真實
        tools: [{ google_search: {} }],
        systemInstruction: {
          parts: [{
            text: `${MODE_INSTRUCTIONS[modeKey]}`
          }]
        },
        generationConfig: generationConfig
      };

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      
      if (data.error) throw new Error(data.error.message);

      const candidates = data.candidates;
      if (candidates && candidates.length > 0) {
        let jsonText = candidates[0].content.parts[0].text;
        
        console.log("[Raw AI Output]:", jsonText);

        // 🧹 手動清理 Markdown 標記 (因為 AI 還是很可能會加 ```json)
        jsonText = jsonText.replace(/```json/g, "").replace(/```/g, "").trim();

        try {
          const parsed = JSON.parse(jsonText);
          setRestaurant(parsed);
          setShowResult(true);
        } catch (parseError) {
          console.error("JSON Parse Error:", parseError);
          console.log("Failed Text:", jsonText);
          alert("AI 回傳的資料格式有點問題，請再試一次。");
        }
      } else {
        alert("AI 找不到相關餐廳，請再試一次。");
      }

    } catch (e) {
      console.error("[API Error]", e);
      alert(`AI 連線發生錯誤：${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };


  const triggerAI = useCallback((text) => {
    if (!text.trim()) return;
    callGeminiApi(text, currentMode.key);
  }, [currentMode]);

  // 語音辨識設定
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

    const r = new SR();
    r.lang = "zh-TW";
    r.interimResults = false;
    r.continuous = false;

    r.onstart = () => setIsListening(true);
    r.onend = () => setIsListening(false);
    r.onresult = (e) => {
      const tx = e.results[0][0].transcript;
      setInputText(tx);
      triggerAI(tx);
    };

    recognitionRef.current = r;
  }, [triggerAI]);

  const handleMicClick = () => {
    if (recognitionRef.current) {
      recognitionRef.current.start();
    } else {
      alert("您的瀏覽器不支援語音辨識");
    }
  };

  const handleTextSubmit = (e) => {
    e.preventDefault();
    triggerAI(inputText);
  };

  return (
    <div className="app" style={{ backgroundImage: `url(${currentMode.bg})` }}>
      <div className="app-overlay" />

      {/* Header */}
      <header className="app-header">
        <div className="header-inner">
          <div className="header-left">
            <div className="logo">Peini Order</div>
          </div>
          <div className="header-right">
            {Object.values(MODES).map((m) => (
              <button
                key={m.key}
                className={`mode-btn ${currentMode.key === m.key ? "mode-btn-active" : ""}`}
                onClick={() => setCurrentMode(m)}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="app-main">
        <div className="mic-container">
          <div className="prompt-text">
            {isLoading ? "AI 正在搜尋真實店家資訊中..." : currentMode.startText}
          </div>
          
          <button 
            className={`mic-button ${isListening ? "mic-button-active" : ""}`}
            onClick={handleMicClick}
            disabled={isLoading}
          >
            <Mic />
          </button>
        </div>
        
        {/* White Input Box at Bottom */}
        <form className="input-area" onSubmit={handleTextSubmit}>
          <input 
            type="text" 
            placeholder={isListening ? "正在聆聽..." : "也可以打字跟我說喔..."}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isLoading}
          />
          <button type="submit" className="send-btn" disabled={isLoading}>
            <Send size={18} />
          </button>
        </form>
      </main>

      {/* Result Popup */}
      {showResult && (
        <div className="result-overlay" onClick={() => setShowResult(false)}>
          <div className="result-card" onClick={(e) => e.stopPropagation()}>
            <button className="result-close" onClick={() => setShowResult(false)}>
              <X size={20} />
            </button>

            <div className="result-image-wrapper">
              <img 
                src={restaurant.image} 
                alt={restaurant.name} 
                className="result-image" 
                onError={(e) => {e.target.src = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=1000&auto=format&fit=crop"}}
              />
            </div>

            <div className="result-content">
              <div className="info-row name">{restaurant.name}</div>
              
              {/* 顯示 AI 的個性化回覆 */}
              <p className="result-description">{restaurant.description}</p>
              
              <div className="info-row">
                <Clock size={16} /> {restaurant.time || "營業時間未提供"}
              </div>
              <div className="info-row">
                <Phone size={16} /> {restaurant.phone || "電話未提供"}
              </div>
              <div className="info-row">
                <MapPin size={16} />
                <a href={restaurant.mapUrl} target="_blank" rel="noreferrer">
                  {restaurant.address || "查看地圖"}
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;