# ScaleMax API — Complete Model Catalog, Key Scope & Pricing Reference

This reference documents both your **Active API Key Authorized Models** and the **Full ScaleMax Platform Catalog** (69 models including DeepSeek, Claude, Gemini, Grok, and Qwen).

---

## 🔑 1. Active Models Authorized for Your New API Key (`sm_live_318b9d...`)

Your new key is scoped to **DeepSeek V4 Flash**:

| Model ID | Display Name | Provider Scope | Context Window | Input Rate (USD / 1M) | Output Rate (USD / 1M) | Reasoning Enabled | Status |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| `deepseek-v4-flash` | DeepSeek V4 Flash | ScaleMax / Local | 1,000,000 | **$0.19** | **$0.51** | ✅ **Yes** | **Authorized** (`402 Quota / Top-Up Required`) |

### 🧠 Text & Reasoning Models

| Model ID | Display Name | Provider Scope | Context Window | Max Output Tokens | Input Rate (USD / 1M) | Output Rate (USD / 1M) | Dedicated Reasoning (`reasoning: true`) | Measured Response Cost (Live Test) |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| `claude-sonnet-4-6[1m]` | Sonnet 4.6 | Local / ScaleMax | 1,000,000 | 384,000 | **$0.44** | **$1.32** | ✅ **Yes** (`effort: low`) | **$0.000493 / turn** (200 OK) |
| `gpt-5.4-mini` | GPT-5.4 mini | ScaleMax | 1,050,000 | 128,000 | **$0.522** | **$3.132** | ❌ No | **$0.000900 / turn** (200 OK) |
| `gpt-5.5` | GPT-5.5 | ScaleMax | 1,050,000 | 128,000 | **$0.522** | **$3.132** | ❌ No | **$0.000877 / turn** (200 OK) |
| `gpt-5.6-luna` | GPT-5.6 Luna | ScaleMax | 1,050,000 | 128,000 | **$0.522** | **$3.132** | ❌ No | Standard |
| `gpt-5.6-terra` | GPT-5.6 Terra | ScaleMax | 1,050,000 | 128,000 | **$2.00** | **$12.00** | ❌ No | Standard (Cache Threshold: 272k) |
| `gpt-5.4` | GPT-5.4 | ScaleMax | Standard | 65,536 | **$2.50** | **$15.00** | ❌ No | Standard |
| `gpt-6-astra` | GPT-6 astra | ScaleMax | Unlimited | Unlimited | **$15.00** | **$60.00** | ❌ No | Heavyweight Flagship |

### 🎨 Image Generation Models

| Model ID | Display Name | Supported Sizes | Token Units per Image | USD Cost per Image |
| :--- | :--- | :--- | :---: | :---: |
| `gpt-image-2` | ScaleMax Image 2 | `1024x1024`, `1536x864`, `864x1536` | **2,400 – 84,400** | **$0.006 – $0.211** |
| `gpt-image-1.5` | ScaleMax Image 1.5 | `1024x1024`, `1536x1024`, `1024x1536` | **3,600 – 53,200** | **$0.009 – $0.133** |
| `flux-2-pro` | ScaleMax Image Flux | `1024x1024`, `1536x864`, `864x1536` | **12,292** | **$0.030729** |
| `flux-2-flex` | ScaleMax Image Flex | `1024x1024` | **20,000** | **$0.05** |
| `qwen-image-2.0` | Qwen Image 2.0 | Up to `1664x928` | **80,000** | **$0.20** |
| `wan2.7-image-pro` | Wan 2.7 Image Pro | Up to `1664x928` | **200,000** | **$0.50** |

---

## 🌐 2. Full ScaleMax Platform Catalog (69 Routed Models)

The ScaleMax platform hosts **69 routed models** across 5 provider families on [dashboard.scalemax.pro/models](https://dashboard.scalemax.pro/models).

To unlock non-OpenAI models (such as DeepSeek or Gemini) on ScaleMax, update your API Key Scopes in your [ScaleMax Dashboard](https://dashboard.scalemax.pro/settings):

### 🐉 DeepSeek Models (Platform Roster)
* **`deepseek-v4-flash`** — **Input: $0.19 / 1M** | **Output: $0.51 / 1M** | ✅ `reasoning: true` | `context: 1,000,000`
* **`deepseek-v4-pro`** — High-precision DeepSeek reasoning
* **`deepseek-v3.2`** — Standard DeepSeek chat

### 🔮 Other Platform Reasoning Models
* **`claude-opus-5`** — **Input: $5.00 / 1M** | **Output: $25.00 / 1M** | ✅ `reasoning: true`, `vision: true`
* **`gemini-3.6-flash`**, **`gemini-3.7-flash`**, **`gemini-3.8-flash`**
* **`grok-4.5`**, **`grok-4.6`**
* **`qwen3.8-max`**, **`glm-5.3-flash`**, **`kimi-k3`**

---

## 🛠️ How to Enable DeepSeek Models in ScaleMax:

1. Go to your [ScaleMax API Keys Settings](https://dashboard.scalemax.pro/settings).
2. Edit your API key permissions to check **"All Providers"** (or explicitly enable **DeepSeek / Local** provider scope).
3. Update `SCALEMAX_REASONING_MODEL=deepseek-v4-flash` in [middleware/.env](file:///d:/MobileApps/AI%20astro/mockup%201.0/middleware/.env).
