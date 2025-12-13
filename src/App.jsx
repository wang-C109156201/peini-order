import React, { useState, useEffect, useRef, useCallback } from "react";
import { Mic, Send, X, MapPin, Phone, Clock, Loader2 } from "lucide-react";
import "./App.css";
import bossBg from "./assets/霸總.png";

// =========================
// 🔥🔑 Gemini API Key and Custom Search API
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
const GOOGLE_SEARCH_ENGINE_ID = import.meta.env.VITE_SEARCH_ENGINE_ID || "";
const GOOGLE_SEARCH_API_KEY = import.meta.env.VITE_GOOGLE_SEARCH_KEY || "";
// =========================

// 模式設定
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
    bg: "https://images.unsplash.com/photo-1758272134196-1ab895629bce?q=80&w=1631&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
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
    bg: bossBg,
    startText: "來，說吧，你今天想吃什麼？"
  },
};

// 🧠 System Prompts
const COMMON_INSTRUCTION = `
【絕對規則】
1. 你是一個 API 接口，你的任務是搜尋真實餐廳並回傳「純 JSON 字串」。
2. 不要使用 Markdown 標記 (如 \`\`\`json)，只要回傳純文字的 JSON。
3. 必須透過 Google Search 搜尋「真實存在的餐廳」，資料必須與 Google Maps 吻合。
4. 若使用者沒提供地點，預設搜尋「台北」。
5. 若使用者沒提供想吃的食物，預設搜尋「熱門餐廳」。
6. JSON 格式必須包含：
   - name (餐廳名稱)
   - image (請留空字串 ""，因為我們會用前端程式碼去呼叫 Google 圖片搜尋 API 來填入)
   - description (100字以內，依照角色語氣介紹)
   - time (營業時間)
   - phone (電話)
   - address (地址)
   - mapUrl (Google Maps 連結)
`;

const MODE_INSTRUCTIONS = {
  normal: `
  ${COMMON_INSTRUCTION}
  角色：溫柔貼心的健康美食助理。
  任務：請根據使用者的「性別」與「體重」來評估適合的餐點熱量與份量。
  邏輯：
  - 語氣：像專業營養師一樣溫暖，說明為什麼這家店適合他的身體數值。
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
  任務：【強制決定】。不管使用者說想吃什麼，你都要強勢幫他決定一家你覺得好的餐廳，並命令他去吃。
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

  // ✅ 新增：使用者資料 State
  const [userWeight, setUserWeight] = useState("50");
  const [userGender, setUserGender] = useState("female"); // 'male' or 'female'

  const recognitionRef = useRef(null);
  const textareaRef = useRef(null);

  // 🔎 新增：呼叫 Google Custom Search API 找圖片
  const fetchGoogleImage = async (query) => {
    if (!GOOGLE_SEARCH_API_KEY || !GOOGLE_SEARCH_ENGINE_ID) {
      console.warn("⚠️ Google Search Key or CX ID is missing!");
      return null;
    }

    try {
      console.log(`[Google Search] 正在搜尋圖片: ${query}`);
      const url = `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(query)}&cx=${GOOGLE_SEARCH_ENGINE_ID}&key=${GOOGLE_SEARCH_API_KEY}&searchType=image&num=1`;
      
      const res = await fetch(url);
      const data = await res.json();
      
      if (data.items && data.items.length > 0) {
        const imgUrl = data.items[0].link;
        console.log(`[Google Search] 找到圖片: ${imgUrl}`);
        return imgUrl;
      }
    } catch (error) {
      console.error("[Google Search] 搜尋失敗:", error);
    }
    return null;
  };

  // Gemini API 呼叫邏輯
  const callGeminiApi = async (userText, modeKey) => {
    setIsLoading(true);
    console.log(`%c[Gemini API] Mode: ${modeKey}`, "color: cyan; font-weight: bold;");

    // ✅ 建構 Prompt：如果是一般模式，把體重和性別加進去
    let finalPrompt = `使用者需求：${userText}。`;
    
    if (modeKey === 'normal') {
      const genderText = userGender === 'male' ? '男性' : '女性';
      finalPrompt += `\n【使用者身體數據】\n性別：${genderText}\n體重：${userWeight}kg\n請根據這些數據，推薦適合他/她的份量與熱量的餐廳。`;
    }
    finalPrompt += `\n請搜尋真實餐廳並回傳嚴格的 JSON 格式，不要有任何 Markdown。`;
    console.log(`%c[Gemini Prompt]`, "color: cyan;", finalPrompt);

    if (!GEMINI_API_KEY) {
      setTimeout(() => {
        console.log("⚠️ No API Key provided, returning mock data.");
       // 模擬流程
        const mockName = "測試餐廳-好吃炸雞";
        const mockData = {
          name: mockName,
          image: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=1974&auto=format&fit=crop",
          description: `(測試模式) 因為你是${userGender === 'male' ? '男生' : '女生'}且體重${userWeight}kg，推薦你這家份量剛好的店！(請設定 API Key 以啟用 AI)`,
          time: "11:00-20:00",
          phone: "02-1234-5678",
          address: "台北市信義區測試路101號",
          mapUrl: "https://www.google.com/maps",
        };
        setRestaurant(mockData);
        setShowResult(true);
        setIsLoading(false);
      }, 1000); //  Loading 動畫
      return;
    }

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${GEMINI_API_KEY}`;

      const generationConfig = { temperature: 0.7 };

      const payload = {
        contents: [{
          parts: [{
            text: `使用者需求：${userText}。請搜尋真實餐廳並回傳嚴格的 JSON 格式，不要有任何 Markdown。`
          }]
        }],
        tools: [{ google_search: {} }],
        systemInstruction: {
          parts: [{ text: `${MODE_INSTRUCTIONS[modeKey]}` }]
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
        const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
        
        if (jsonMatch) {
          jsonText = jsonMatch[0];
          try {
            const parsed = JSON.parse(jsonText);
            
            // 🔥 關鍵步驟：在這裡呼叫 Google Image API
            // 搜尋策略：餐廳名稱 + "food" 或 "餐點"
            const realImage = await fetchGoogleImage(`${parsed.name} food`);
            
            // 如果找到圖，就覆蓋掉 image 欄位
            if (realImage) {
              parsed.image = realImage;
            } else {
              // 沒找到就用預設圖
              parsed.image = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=1000&auto=format&fit=crop";
            }

            setRestaurant(parsed);
            setShowResult(true);
          } catch (parseError) {
            console.error("JSON Parse Error:", parseError);
            alert("AI 回傳格式有誤，請再試一次。");
          }
        } else {
          console.error("No JSON found in response");
          alert("AI 沒有回傳正確的餐廳資料，請再試一次。");
        }
      } else {
        alert("AI 找不到相關餐廳，請再試一次。");
      }

    } catch (e) {
      console.error("[API Error]", e);
      if (e.message.includes("403") || e.message.includes("API key not valid")) {
        alert("API Key 無效。");
      } else {
        alert(`AI 連線發生錯誤：${e.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const triggerAI = useCallback((text) => {
    if (!text.trim()) return;
    callGeminiApi(text, currentMode.key);
  }, [currentMode, userWeight, userGender]);

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

  const handleInput = (e) => {
    setInputText(e.target.value);
    
    // 調整高度：先設為 auto 讓它縮回，再設為 scrollHeight 讓它長高
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  // ✅ 新增：處理按鍵事件 (Enter 送出, Shift+Enter 換行)
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault(); // 防止預設換行
      if (inputText.trim()) {
        handleSubmit(e);
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    
    triggerAI(inputText);
    setInputText("");
    
    // 送出後重置高度
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  return (
    <div className="app" style={{ backgroundImage: `url(${currentMode.bg})` }}>
      <div className="app-overlay" />

      {/* 1. 載入中全螢幕遮罩動畫 */}
      {isLoading && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          color: 'white'
        }}>
          <Loader2 size={64} className="spinner" style={{ marginBottom: '20px' }} />
          <h2 style={{ fontSize: '1.5rem', fontWeight: '500', letterSpacing: '1px' }}>
            AI 正在搜尋美食中...
          </h2>
          <p style={{ opacity: 0.8, marginTop: '8px' }}>請稍候，搜尋過程大概10~15秒，馬上為您送上推薦！</p>
        </div>
      )}

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
      

       <main className="app-main">
        {/* ✅ 新增：只在一般模式顯示的資料輸入卡片 */}
        {currentMode.key === 'normal' && (
          <div className="profile-card">
            <div className="profile-item">
              <span className="profile-label">體重 (kg)</span>
              <div className="profile-weight-input">
                <input 
                  type="number" 
                  className="weight-input" 
                  value={userWeight}
                  onChange={(e) => setUserWeight(e.target.value)}
                />
              </div>
            </div>
            
            <div className="profile-item">
              <span className="profile-label">性別</span>
              <div className="profile-input-group">
                <button 
                  className={`gender-btn ${userGender === 'male' ? 'active' : ''}`}
                  onClick={() => setUserGender('male')}
                >
                  男性
                </button>
                <button 
                  className={`gender-btn ${userGender === 'female' ? 'active' : ''}`}
                  onClick={() => setUserGender('female')}
                >
                  女性
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="mic-container">
          <div className="prompt-text">
            {isLoading ? "..." : currentMode.startText}
          </div>
          
          <button 
            className={`mic-button ${isListening ? "mic-button-active" : ""}`}
            onClick={handleMicClick}
            disabled={isLoading}
          >
            <Mic color="#ffffff" />
          </button>
        </div>
        
        <form className="input-area" onSubmit={handleSubmit}>
          <textarea
            ref={textareaRef}
            rows={1}
            placeholder={isListening ? "正在聆聽..." : "也可以打字跟我說喔... (Shift+Enter 換行)"}
            value={inputText}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
          />
          <button type="submit" className="send-btn" disabled={isLoading}>
            <Send color="#ffffff" size={18} />
          </button>
        </form>
      </main>


      {showResult && (
        <div className="result-overlay" onClick={() => setShowResult(false)}>
          {/* 2. 結果卡片與關閉按鈕 */}
          <div
            className="result-card"
            onClick={(e) => e.stopPropagation()}
            style={{ position: 'relative' }} // 確保絕對定位的按鈕是相對於這張卡片
          >
            {/* 明顯的右上角關閉按鈕 */}
            <button
              className="result-close"
              onClick={() => setShowResult(false)}
              style={{
                position: 'absolute',
                top: '15px',
                right: '15px',
                background: 'rgba(0, 0, 0, 0.6)',
                border: '2px solid white',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                cursor: 'pointer',
                zIndex: 20, // 確保在最上層
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
              }}
            >X
              <X size={20} />
            </button>

            <div className="result-image-wrapper">
              <img
                src={restaurant.image}
                alt={restaurant.name}
                className="result-image"
                onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=1000&auto=format&fit=crop" }}
              />
            </div>

            <div className="result-content">
              <div className="info-row name">{restaurant.name}</div>
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