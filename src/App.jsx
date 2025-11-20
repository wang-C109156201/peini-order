import React, { useState, useEffect, useRef, useCallback } from "react";
import { Mic, Send, X, MapPin, Phone, Clock } from "lucide-react";
import "./App.css"; 

// =========================
// 🔥🔑 在這裡填入你的 Gemini API Key
const GEMINI_API_KEY = "AIzaSyB4ie7waVgl5ySQe6ukM4qU0m4rj3g4W3Q"; 
// =========================

// 模式設定
const MODES = {
  normal: { 
    key: "normal", 
    label: "一般模式", 
    bg: "https://images.unsplash.com/photo-1445116572660-236099ec97a0?q=80&w=2071&auto=format&fit=crop",
    startText: "來，說吧。妳今天想吃什麼？"
  },
  friend: { 
    key: "friend", 
    label: "朋友模式", 
    bg: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=2070&auto=format&fit=crop",
    startText: "欸！今天想吃點什麼好料的？"
  },
  hell: { 
    key: "hell", 
    label: "地獄模式", 
    bg: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=1974&auto=format&fit=crop",
    startText: "想吃什麼？先看看你的肚子再說吧。"
  },
  boss: { 
    key: "boss", 
    label: "霸總模式", 
    bg: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop",
    startText: "來說吧，你今天想吃什麼？"
  },
};

// 🧠 System Prompts (針對 Gemini 優化：口語化、個性化、<100字)
const MODE_INSTRUCTIONS = {
  normal: `角色：溫柔貼心的美食助理。
任務：推薦符合需求的餐廳。
語氣：像天使一樣溫暖、有禮貌。
限制：說明請用「口語」介紹，不要太像機器人，字數嚴格控制在 100 字以內。`,
  
  friend: `角色：使用者的好閨蜜/死黨。
任務：推薦餐廳。
語氣：超級口語、輕鬆、八卦，可以使用流行語（如：這家超頂、必吃、笑死）。
限制：像在跟朋友傳訊息一樣，字數嚴格控制在 100 字以內。`,
  
  hell: `角色：地獄廚房風格的毒舌顧問。
任務：先無情吐槽使用者的選擇（例如嫌胖、嫌沒品味），但最後還是要丟出一一家好吃的餐廳。
語氣：酸言酸語、尖銳、不留情面。
限制：字數嚴格控制在 100 字以內。`,
  
  boss: `角色：霸道總裁。
任務：【強制決定】使用者該吃什麼。不管使用者說什麼，你都要直接命令他去吃你選的（可以是高級料理或你覺得對他好的）。
語氣：命令式、強勢、帶點寵溺（例如：聽我的、不准拒絕）。
限制：展現絕對掌控權，說明文字嚴格控制在 100 字以內。`
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
    
    // 模擬資料 (當沒有 API Key 時使用)
    if (!GEMINI_API_KEY) {
      setTimeout(() => {
        console.log("⚠️ No API Key provided, returning mock data.");
        const mockData = {
          normal: { name: "八方雲集", desc: "這家鍋貼金黃酥脆，出餐又快，真的很適合不想動腦的今天。簡單吃也很幸福喔！😊" },
          friend: { name: "路邊攤鹹水雞", desc: "欸跟你說這家超頂的！那個蒜味加辣真的絕配，我們買回去邊看劇邊吃，爽啦！" },
          hell: { name: "二郎系拉麵", desc: "想吃這個？看看你的肚子！全是油跟澱粉，你是嫌自己不夠胖嗎？算了，拿去吃啦，胖死你！" },
          boss: { name: "茹絲葵牛排館", desc: "吃什麼路邊攤？沒營養。我已經幫你訂好牛排了，換件好看的衣服，司機在樓下等你。聽話。" },
        };
        
        setRestaurant({
          name: mockData[modeKey].name,
          image: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=1974&auto=format&fit=crop",
          description: mockData[modeKey].desc,
          time: "11:00–21:30",
          phone: "02-2771-0081",
          address: "台北市大安區新生南路一段...",
          mapUrl: "https://www.google.com/maps",
        });
        setShowResult(true);
        setIsLoading(false);
      }, 1000);
      return;
    }

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${GEMINI_API_KEY}`;

      const generationConfig = {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            name: { type: "STRING" },
            image: { type: "STRING" },
            description: { type: "STRING" },
            time: { type: "STRING" },
            phone: { type: "STRING" },
            address: { type: "STRING" },
            mapUrl: { type: "STRING" }
          }
        }
      };

      const payload = {
        contents: [{
          parts: [{
            text: `使用者想吃：${userText}。請根據你的角色設定推薦一家餐廳。若找不到真實餐廳，請虛構一個符合情境的。`
          }]
        }],
        systemInstruction: {
          parts: [{
            text: `${MODE_INSTRUCTIONS[modeKey]} \n\n 重要：你必須回傳純 JSON 格式。image 欄位請提供一個與食物相關的 Unsplash 圖片 URL。`
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

      const jsonText = data.candidates[0].content.parts[0].text;
      const parsed = JSON.parse(jsonText);
      
      setRestaurant(parsed);
      setShowResult(true);

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
            {isLoading ? "AI 正在幫你找好料的..." : currentMode.startText}
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