import React, { useState, useEffect, useRef, useCallback } from "react";
import { Mic, Send, X, MapPin, Phone, Clock, Loader2 } from "lucide-react";
import "./App.css";
import bossBg from "./assets/霸總.png";
import logo from "./assets/Logo.png";
import balanced from "./assets/均衡.png";
import muscle from "./assets/增肌.png";
import fat from "./assets/減脂.png";
import vegetarian from "./assets/素食.png";
import meat from "./assets/葷食.png";

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
    startText: "想吃什麼？讓我根據你的身體狀況幫你推薦吧！😊"
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
  角色：專業且貼心的健康飲食顧問。
  任務：你已經知道使用者的「性別」、「身高」、「體重」、「飲食偏好(葷/素)」以及最重要的「飲食目標」。
  
  【核心推薦邏輯】：
  1. 優先順序：**使用者的「飲食目標」> BMI 建議**。
     - 如果使用者 BMI 過重但目標是「增重/增肌」，請**尊重他的選擇**，推薦高蛋白食物。
     - 如果使用者 BMI 過輕但目標是「減脂」，請**溫柔提醒**並推薦營養均衡的食物。
  
  2. 飲食偏好：
     - 如果是「素食」，請務必推薦素食餐廳或有豐富素食選項的店家。
  
  3. 推薦方向：
     - 減脂：低卡、原型食物、海鮮、雞胸肉。
     - 均衡：一般美味餐廳、定食。
     - 增肌：高蛋白、肉量多、優質澱粉。

  4. 特殊情境 (阻止機制)：
     - 如果 BMI 過重且想減脂，但卻點了「炸雞/吃到飽」，請**溫柔阻止**並推薦替代方案。
  
  語氣：溫暖、專業、不帶批判性。
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
  bmiInfo: null,
  imageCandidates: [], // ✅ 新增：存放多張候選圖片的陣列
};

function App() {
  const [currentMode, setCurrentMode] = useState(MODES.normal);
  const [restaurant, setRestaurant] = useState(EMPTY_RESTAURANT);
  const [inputText, setInputText] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // ✅ 新增：使用者資料 State
  const [userHeight, setUserHeight] = useState("165");
  const [userWeight, setUserWeight] = useState("55");
  const [userGender, setUserGender] = useState("female");
  const [userGoal, setUserGoal] = useState("maintain");
  const [userDiet, setUserDiet] = useState("meat"); // 新增：素食/葷食

  const recognitionRef = useRef(null);
  const textareaRef = useRef(null);

  // ✅ 修改：現在會回傳「圖片網址陣列 (Array)」，而不是單一字串
  const fetchGoogleImage = async (query) => {
    if (!GOOGLE_SEARCH_API_KEY || !GOOGLE_SEARCH_ENGINE_ID) return [];
    try {
      // ✅ 參數調整：
      // num=5: 一次抓 5 張
      // imgType=photo: 只要照片 (排除 clipart 或 lineart)
      const url = `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(query)}&cx=${GOOGLE_SEARCH_ENGINE_ID}&key=${GOOGLE_SEARCH_API_KEY}&searchType=image&num=5&imgType=photo&safe=active`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.items && data.items.length > 0) {
        return data.items.map(item => item.link); // 回傳所有圖片連結的陣列
      }
    } catch (error) { console.error(error); }
    return [];
  };

  // ✅ 新增：計算 BMI 的函式
  const calculateBMI = (h, w) => {
    const heightInM = parseFloat(h) / 100;
    const weight = parseFloat(w);
    if (!heightInM || !weight) return null;

    const bmi = (weight / (heightInM * heightInM)).toFixed(1);
    let status = "";

    if (bmi < 18.5) status = "體重過輕";
    else if (bmi < 24) status = "正常範圍";
    else if (bmi < 27) status = "體重過重";
    else status = "輕度肥胖以上";

    return { value: bmi, status: status };
  };

  // Gemini API 呼叫邏輯
  const callGeminiApi = async (userText, modeKey) => {
    setIsLoading(true);

    let finalPrompt = `使用者需求：${userText}。`;
    let bmiData = null;

    // ✅ 修改：傳送完整數據給 AI，並計算 BMI
    if (modeKey === 'normal') {
      bmiData = calculateBMI(userHeight, userWeight);
      const genderText = userGender === 'male' ? '男性' : '女性';
      const goalMap = {
        lose: '減脂/減重',
        maintain: '維持/均衡',
        gain: '增肌/增重'
      };
      const dietText = userDiet === 'veg' ? '素食' : '葷食';

      finalPrompt += `\n【使用者身體數據與目標】\n性別：${genderText}\n飲食偏好：${dietText}\n身高：${userHeight}cm\n體重：${userWeight}kg\nBMI：${bmiData?.value} (${bmiData?.status})\n飲食目標：${goalMap[userGoal]}\n\n請注意：即使BMI顯示需要調整體重，仍須優先「尊重使用者的飲食目標」。例如：BMI過重但想增肌/增重，請推薦高蛋白食物；BMI過輕但想減脂，請溫柔提醒並推薦營養均衡的食物。`;
    }

    finalPrompt += `\n請搜尋真實餐廳並回傳嚴格的 JSON 格式，不要有任何 Markdown。`;

    console.log(`%c[Gemini Prompt]`, "color: cyan;", finalPrompt);

    if (!GEMINI_API_KEY) {
      setTimeout(async () => {
        const mockName = "測試餐廳-健康輕食";
        let realImage = null;
        if (GOOGLE_SEARCH_API_KEY) {
          realImage = await fetchGoogleImage(`${mockName} 美食`);
        }

        const mockData = {
          name: mockName,
          image: realImage || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=1000&auto=format&fit=crop",
          description: `(測試模式) 您的BMI為 ${bmiData?.value}，既然你想${userGoal}，這家店很適合你！(請設定 API Key 以啟用 AI)`,
          time: "11:00-20:00",
          phone: "02-1234-5678",
          address: "台北市信義區測試路101號",
          mapUrl: "https://www.google.com/maps",
          bmiInfo: bmiData, // 傳遞 BMI 資訊給結果視窗
        };
        setRestaurant(mockData);
        setShowResult(true);
        setIsLoading(false);
      }, 1000);
      return;
    }

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${GEMINI_API_KEY}`;
      const payload = {
        contents: [{ parts: [{ text: finalPrompt }] }],
        tools: [{ google_search: {} }],
        systemInstruction: { parts: [{ text: MODE_INSTRUCTIONS[modeKey] }] }
      };

      const response = await fetch(url, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("API Error Details:", errorData);
        if (response.status === 403) {
          throw new Error("API Key 被拒絕 (403)。請檢查 Google Console 的 Referer 限制是否正確包含此網址。");
        }
        throw new Error(errorData.error?.message || "API 連線失敗");
      }

      const data = await response.json();
      const candidates = data.candidates;
      if (candidates && candidates.length > 0) {
        let jsonText = candidates[0].content.parts[0].text;
        const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          const imageList = await fetchGoogleImage(`${parsed.name} 美食`);
          if (imageList && imageList.length > 0) {
            parsed.image = imageList[0];
            parsed.imageCandidates = imageList;
          } else {
            parsed.image = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=1000&auto=format&fit=crop";
            parsed.imageCandidates = [];
          }

          // 強制使用標準 Google Maps 搜尋連結格式
          const query = `${parsed.name} ${parsed.address}`;
          parsed.mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

          parsed.bmiInfo = bmiData;
          setRestaurant(parsed);
          setShowResult(true);
        }
      }
    } catch (e) {
      alert(`錯誤：${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const triggerAI = useCallback((text) => {
    if (!text.trim()) return;
    callGeminiApi(text, currentMode.key);
  }, [currentMode, userHeight, userWeight, userGender, userGoal, userDiet]);

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

  const handleImageError = (e) => {
    const currentSrc = e.target.src;
    const candidates = restaurant.imageCandidates || [];

    const idx = candidates.indexOf(currentSrc);

    if (idx !== -1 && idx < candidates.length - 1) {
      console.log(`圖片載入失敗，嘗試下一張候選圖 (${idx + 2}/${candidates.length})...`);
      e.target.src = candidates[idx + 1];

      setRestaurant(prev => ({
        ...prev,
        image: candidates[idx + 1]
      }));
    } else {
      console.log("所有候選圖片都失效，切換為預設圖。");
      e.target.src = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=1000&auto=format&fit=crop";
      e.target.onerror = null;
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
            <img src={logo} alt="logo" className="logo" />
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
        {currentMode.key === 'normal' ? (
          <div className="profile-card">

            {/* Step 1: 基本資料 */}
            <div className="step-section">
              <div className="step-header">
                <span className="step-tag">Step 1</span>
                <h3 className="step-title">基本資料</h3>
              </div>

              <div className="options-row">
                <button className={`gender-btn ${userGender === 'male' ? 'active' : ''}`} onClick={() => setUserGender('male')}>
                  <span className="icon-placeholder"><img src="https://api.iconify.design/ph:gender-male-bold.svg" alt="Male" /></span>
                  男性
                </button>
                <button className={`gender-btn ${userGender === 'female' ? 'active' : ''}`} onClick={() => setUserGender('female')}>
                  <span className="icon-placeholder"><img src="https://api.iconify.design/ph:gender-female-bold.svg" alt="Female" /></span>
                  女性
                </button>
              </div>

              <div className="options-row">
                <button className={`choice-btn ${userDiet === 'veg' ? 'active' : ''}`} onClick={() => setUserDiet('veg')}>
                  <span className="icon-placeholder"><img src={vegetarian} alt="Veg" /></span>
                  素食
                </button>
                <button className={`choice-btn ${userDiet === 'meat' ? 'active' : ''}`} onClick={() => setUserDiet('meat')}>
                  <span className="icon-placeholder"><img src={meat} alt="Meat" /></span>
                  葷食
                </button>
              </div>

              <div className="input-grid">
                <div className="data-input-wrapper">
                  <input type="number" className="data-input" value={userHeight} onChange={(e) => setUserHeight(e.target.value)} />
                  <span className="unit-label">cm</span>
                </div>
                <div className="data-input-wrapper">
                  <input type="number" className="data-input" value={userWeight} onChange={(e) => setUserWeight(e.target.value)} />
                  <span className="unit-label">kg</span>
                </div>
              </div>
            </div>

            {/* Step 2: 今日目標 & 麥克風 */}
            <div className="step-section">
              <div className="step-header">
                <span className="step-tag">Step 2</span>
                <h3 className="step-title">今日目標</h3>
              </div>

              <div className="step2-layout">
                <div className="step2-left">
                  <div className="options-row">
                    <button className={`choice-btn ${userGoal === 'lose' ? 'active' : ''}`} onClick={() => setUserGoal('lose')}>
                      <span className="icon-placeholder"><img src={fat} alt="Lose" /></span>
                      減脂
                    </button>
                    <button className={`choice-btn ${userGoal === 'maintain' ? 'active' : ''}`} onClick={() => setUserGoal('maintain')}>
                      <span className="icon-placeholder"><img src={balanced} alt="Maintain" /></span>
                      均衡
                    </button>
                    <button className={`choice-btn ${userGoal === 'gain' ? 'active' : ''}`} onClick={() => setUserGoal('gain')}>
                      <span className="icon-placeholder"><img src={muscle} alt="Gain" /></span>
                      增肌
                    </button>
                  </div>
                  <div className="card-prompt">
                    <p>{isLoading ? "..." : currentMode.startText}</p>
                    {/* ✅ 移入卡片內的麥克風 */}
                    <button
                      className={`card-mic-btn ${isListening ? "active" : ""}`}
                      onClick={handleMicClick}
                      disabled={isLoading}
                    >
                      <Mic color="#ffffff" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

          </div>
        ) : (
          /* ✅ 非一般模式：顯示原本的 Mic 與 Start Text */
          <div className="mic-container">
            <div className="prompt-text">{isLoading ? "..." : currentMode.startText}</div>
            <button className={`mic-button ${isListening ? "mic-button-active" : ""}`} onClick={handleMicClick} disabled={isLoading}>
              <Mic color="#ffffff" />
            </button>
          </div>
        )}

        <form className="input-area" onSubmit={handleSubmit}>
          <textarea ref={textareaRef} rows={1} placeholder={isListening ? "正在聆聽..." : "也可以打字跟我說喔... (Shift+Enter 換行)"} value={inputText} onChange={handleInput} onKeyDown={handleKeyDown} disabled={isLoading} />
          <button type="submit" className="send-btn" disabled={isLoading}><Send color="#ffffff" size={18} /></button>
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
              {/* ✅ 套用新的 Error Handler */}
              <img
                src={restaurant.image}
                alt={restaurant.name}
                className="result-image"
                onError={handleImageError}
              />
            </div>

            <div className="result-content">
              {/* ✅ 新增：在一般模式顯示 BMI 區塊 */}
              {currentMode.key === 'normal' && restaurant.bmiInfo && (
                <div className={`bmi-banner ${restaurant.bmiInfo.value >= 24 || restaurant.bmiInfo.value < 18.5 ? 'warning' : ''}`}>
                  <span>你的 BMI：<strong>{restaurant.bmiInfo.value}</strong></span>
                  <span>{restaurant.bmiInfo.status}</span>
                </div>
              )}

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