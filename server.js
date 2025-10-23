// server.js
import express from "express";
import axios from "axios";
import * as cheerio from "cheerio";
import chalk from "chalk";
import qs from "qs";

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3000;
const ENV = process.env.NODE_ENV || 'development';
const IS_VERCEL = !!process.env.VERCEL;

// =========================
// LOGGING UTILITY
const log = {
  info: (msg) => console.log(IS_VERCEL ? `[INFO] ${msg}` : chalk.cyan(`ℹ️ [INFO] ${new Date().toISOString()} - ${msg}`)),
  success: (msg) => console.log(IS_VERCEL ? `[SUCCESS] ${msg}` : chalk.green(`✅ [SUCCESS] ${new Date().toISOString()} - ${msg}`)),
  warn: (msg) => console.log(IS_VERCEL ? `[WARN] ${msg}` : chalk.yellow(`⚠️ [WARN] ${new Date().toISOString()} - ${msg}`)),
  error: (msg) => console.log(IS_VERCEL ? `[ERROR] ${msg}` : chalk.red(`❌ [ERROR] ${new Date().toISOString()} - ${msg}`)),
};

// =========================
// REQUEST LOGGER
app.use((req, res, next) => { log.info(`📡 ${req.method} ${req.url}`); next(); });

// =========================
// CSS untuk mobile panel
const css = `
body { font-family:'Inter',sans-serif; background:#0d1117;color:#e6edf3; margin:0;padding:16px; max-width:600px;margin-inline:auto; }
h1{color:#58a6ff;text-align:center;font-size:22px;margin-bottom:10px;}
h2{color:#79c0ff;font-size:16px;margin:10px 0;}
.endpoint{background:#161b22;border:1px solid #30363d;border-radius:12px;padding:16px;margin-bottom:16px;}
.method{font-weight:bold;padding:2px 6px;border-radius:6px;margin-right:6px;}
.GET{background:#238636;color:#fff;}
.POST{background:#d29922;color:#000;}
p.desc{color:#8b949e;margin:8px 0 10px;font-size:14px;}
input,textarea,select{width:100%;background:#0d1117;color:#e6edf3;border:1px solid #30363d;border-radius:8px;padding:8px;font-size:14px;margin-bottom:8px;box-sizing:border-box;}
button{width:100%;background:#238636;color:#fff;border:none;border-radius:8px;padding:10px;font-size:15px;font-weight:bold;cursor:pointer;margin-bottom:5px;}
button:hover{background:#2ea043;}
button.secondary{background:#30363d;color:#e6edf3;}
button.secondary:hover{background:#3d444d;}
pre{background:#0d1117;border:1px solid #30363d;border-radius:8px;padding:10px;white-space:pre-wrap;color:#e6edf3;overflow-x:auto;max-height:300px;font-size:12px;}
img.preview,video.preview{display:block;width:100%;border-radius:10px;margin-top:10px;border:1px solid #30363d;}
.category-btn{display:inline-block;width:auto;padding:8px 12px;margin:5px 5px 5px 0;background:#30363d;color:#e6edf3;border:1px solid #58a6ff;border-radius:6px;cursor:pointer;font-size:13px;}
.category-btn.active{background:#238636;color:#fff;border-color:#58a6ff;}
.loading{text-align:center;color:#8b949e;}
.badge{display:inline-block;padding:4px 8px;background:#1f6feb;color:#fff;border-radius:4px;font-size:11px;margin-left:10px;}
`;

// =========================
// Anh.moe Plugin
class Anhmoe {
  #baseURL="https://anh.moe";
  #headers={"Origin":"https://anh.moe","Referer":"https://anh.moe/","User-Agent":"Zanixon/1.0.0"};
  #api;
  #validCategories=["sfw","nsfw","video-gore","video-nsfw","moe","ai-picture","hentai"];
  constructor(){this.#api=axios.create({baseURL:this.#baseURL,timeout:120000,headers:this.#headers});}
  async getCategory(category,page=null){
    if(!this.#validCategories.includes(category))throw new Error(`Invalid category: ${category}`);
    const url = page||`/category/${category}`;
    const raw = page?await axios.get(url,{headers:this.#headers}):await this.#api(url);
    const $ = cheerio.load(raw.data);
    const $listItems = $(".list-item");
    const items = [];
    $listItems.each((_,el)=>{
      const $el=$(el);
      let data={};
      const rawData=$el.attr("data-object");
      if(rawData){ try{data=JSON.parse(decodeURIComponent(rawData));}catch{} }
      const title=$el.find(".list-item-desc-title a").attr("title")||data.title;
      const viewLink=new URL($el.find(".list-item-image a").attr("href"),this.#baseURL).href;
      const uploadBy=$el.find(".list-item-desc-title div").text();
      items.push({
        type:data.type,
        title,
        viewLink,
        [data.type]:{...data.image,sizeFormatted:data.size_formatted,width:data.width,height:data.height,uploaded:data.how_long_ago},
        uploadBy
      });
    });
    return items;
  }
  getCategories(){return this.#validCategories;}
}
const anh=new Anhmoe();

// =========================
// IMAGE OCR
async function processImageOcr(imageUrl) {
  if (!imageUrl) throw new Error("URL gambar tidak valid atau tidak disediakan.");
  try {
    const imgResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(imgResponse.data);
    const contentType = imgResponse.headers['content-type'] || 'image/jpeg';
    const mimeType = contentType.split(';')[0];
    const imageBase64 = buffer.toString("base64");
    const url = "https://staging-ai-image-ocr-266i.frontend.encr.app/api/ocr/process";
    const payload = { imageBase64, mimeType: mimeType.startsWith('image/') ? mimeType : 'image/jpeg' };
    const res = await axios.post(url, payload, {headers: { "content-type": "application/json" }});
    const { extractedText } = res.data;
    if (!extractedText) throw new Error("API OCR gagal mengekstrak teks.");
    return extractedText;
  } catch (error) {
    console.error("Image OCR Error:", error.message);
    if (error.response) {
      throw new Error(`OCR API error: ${error.response.status} - ${error.response.data?.message || "Gagal memproses gambar."}`);
    } else {
      throw new Error(`Ekstraksi teks gagal: ${error.message}`);
    }
  }
}

class ImageOcr {
  async extract({ url }) {
    if (!url) return {status: false, code: 400, result: { message: "URL parameter is required" }};
    try {
      const extractedText = await processImageOcr(url);
      return {status: true, code: 200, result: {original_url: url, extracted_text: extractedText}};
    } catch (err) {
      return {status: false, code: err.message.includes("tidak valid") ? 400 : 500, result: { message: err.message || "Internal Server Error" }};
    }
  }
}
const imageOcr = new ImageOcr();

// =========================
// DOUYIN DOWNLOADER
class DouyinDownloader {
  constructor() {
    this.endpoint = "https://savetik.co/api/ajaxSearch"
  }
  async download({ url }) {
    if (!url) return {status: false, code: 400, result: { message: "Parameter 'url' Douyin diperlukan." }};
    try {
      const postData = qs.stringify({q: url, lang: "id", cftoken: ""});
      const headers = {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "Accept": "*/*",
        "X-Requested-With": "XMLHttpRequest",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36",
        "Referer": "https://savetik.co/id/douyin-downloader"
      };
      const res = await axios.post(this.endpoint, postData, { headers });
      const $ = cheerio.load(res.data.data);
      const caption = $("h3").text().trim();
      const thumbnail = $("img").attr("src") || "";
      const video = $('a:contains("Unduh MP4")').attr("href") || "";
      const video_hd = $('a:contains("Unduh MP4 HD")').attr("href") || "";
      const audio = $('a:contains("Unduh MP3")').attr("href") || "";
      const media = [];
      if (video) media.push({ type: "video", quality: "SD", url: video, thumbnail });
      if (video_hd) media.push({ type: "video", quality: "HD", url: video_hd, thumbnail });
      if (audio) media.push({ type: "audio", quality: "MP3", url: audio });
      return {status: true, code: 200, result: {caption, thumbnail, original_url: url, media}};
    } catch (err) {
      return {status: false, code: 500, result: { message: err.message || "Gagal memproses Douyin downloader." }};
    }
  }
}
const douyin = new DouyinDownloader();

// =========================
// XIAOHONGSHU DOWNLOADER
class Xiaohongshu {
  constructor() {
    this.api = {base: "https://rednote-downloader.io", endpoint: "/api/download"};
    this.client = axios.create({
      baseURL: this.api.base,
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36",
        Referer: "https://rednote-downloader.io/?ref=api",
      },
    });
  }
  isUrl(str) {
    try {
      new URL(str);
      return true;
    } catch (_) {
      return false;
    }
  }
  async download({ url }) {
    if (!url || !this.isUrl(url)) return {status: false, code: 400, result: { message: "Invalid Xiaohongshu URL" }};
    try {
      const { data } = await this.client.post(this.api.endpoint, { url });
      if (!data) return {status: false, code: 404, result: { message: "No media found in this Xiaohongshu post" }};
      return {status: true, code: 200, result: data};
    } catch (error) {
      return {status: false, code: error.response?.status || 500, result: {message: error.response?.data?.message || error.message || "Server error"}};
    }
  }
}
const xhs = new Xiaohongshu();

// =========================
// BRAT MAKER
async function generateBratImage(text, background = null, color = null) {
  try {
    const params = new URLSearchParams();
    params.append("text", text);
    if (background) params.append("background", background);
    if (color) params.append("color", color);
    const response = await axios.get(`https://raolbyte-brat.hf.space/maker/brat?${params.toString()}`, {
      timeout: 30000,
      headers: {"User-Agent": "Raol-APIs/2.0.0"},
    });
    if (response.data && response.data.image_url) {
      const imageResponse = await axios.get(response.data.image_url, {
        responseType: "arraybuffer",
        timeout: 30000,
        headers: {"User-Agent": "Raol-APIs/2.0.0"},
      });
      return Buffer.from(imageResponse.data);
    } else {
      throw new Error("Invalid response from BRAT API");
    }
  } catch (error) {
    console.error("Error generating BRAT image:", error);
    if (error.code === "ECONNABORTED") {
      throw new Error("Request timeout - BRAT API took too long to respond");
    } else if (error.response) {
      throw new Error(`BRAT API error: ${error.response.status} - ${error.response.statusText}`);
    } else if (error.request) {
      throw new Error("Network error - Could not reach BRAT API");
    } else {
      throw new Error(`BRAT generation failed: ${error.message}`);
    }
  }
}

async function generateBratVideo(text, background = null, color = null) {
  try {
    const params = new URLSearchParams();
    params.append("text", text);
    if (background) params.append("background", background);
    if (color) params.append("color", color);
    const response = await axios.get(`https://raolbyte-brat.hf.space/maker/bratvid?${params.toString()}`, {
      timeout: 60000,
      headers: {"User-Agent": "Raol-APIs/2.0.0"},
    });
    if (response.data && response.data.video_url) {
      const videoResponse = await axios.get(response.data.video_url, {
        responseType: "arraybuffer",
        timeout: 60000,
        headers: {"User-Agent": "Raol-APIs/2.0.0"},
      });
      return Buffer.from(videoResponse.data);
    } else {
      throw new Error("Invalid response from BRATVID API");
    }
  } catch (error) {
    console.error("Error generating BRAT video:", error);
    if (error.code === "ECONNABORTED") {
      throw new Error("Request timeout - BRATVID API took too long to respond");
    } else if (error.response) {
      throw new Error(`BRATVID API error: ${error.response.status} - ${error.response.statusText}`);
    } else if (error.request) {
      throw new Error("Network error - Could not reach BRATVID API");
    } else {
      throw new Error(`BRATVID generation failed: ${error.message}`);
    }
  }
}

// =========================
// ROUTES

// Gemini AI
app.get("/ai/gemini", async (req,res)=>{
  const q=req.query.q||req.query.question;
  if(!q) return res.status(400).json({error:"Parameter 'question' wajib diisi."});
  try{
    const {data}=await axios.get(`https://hercai.onrender.com/gemini/hercai?question=${encodeURIComponent(q)}`);
    res.type("text/plain").send(data.reply||"Tidak ada jawaban dari Gemini.");
  }catch(err){res.status(500).json({error:err.message});}
});

// Random Blue Archive
app.get("/random/ba", async (req,res)=>{
  try{
    const {data}=await axios.get("https://raw.githubusercontent.com/rynxzyy/blue-archive-r-img/refs/heads/main/links.json");
    const imgUrl=data[Math.floor(Math.random()*data.length)];
    const imgRes=await axios.get(imgUrl,{responseType:"arraybuffer"});
    res.writeHead(200,{"Content-Type":"image/jpeg"}); res.end(Buffer.from(imgRes.data));
  }catch(err){res.status(500).json({error:err.message});}
});

// Random China
app.get("/random/china", async (req,res)=>{
  try{
    const {data}=await axios.get("https://github.com/ArifzynXD/database/raw/master/asupan/china.json");
    const rand=data[Math.floor(Math.random()*data.length)];
    const imgRes=await axios.get(rand.url,{responseType:"arraybuffer"});
    res.writeHead(200,{"Content-Type":"image/jpeg"}); res.end(Buffer.from(imgRes.data));
  }catch(err){res.status(500).json({error:err.message});}
});

// TikTok Downloader
class TikTok{
  constructor(){this.base="https://www.tikwm.com/api/";this.client=axios.create({baseURL:this.base});}
  async download({url}){if(!url)return {status:false,code:400};const {data}=await this.client.get(`?url=${encodeURIComponent(url)}`);return {status:true,code:200,result:data?.data||{}};}
}
const tiktok=new TikTok();
app.get("/api/d/tiktok", async (req,res)=>{const result=await tiktok.download({url:req.query.url}); res.status(result.code).json(result);});

// Anh.moe Random
app.get("/random/anhmoe", async (req,res)=>{
  try{
    const categories=anh.getCategories();
    let allItems=[];
    for(const c of categories){ const items=await anh.getCategory(c); allItems.push(...items);}
    const item=allItems[Math.floor(Math.random()*allItems.length)];
    if(item.type==="video") res.send(`<video class="preview" controls src="${item.video.url}"></video>`);
    else res.send(`<img class="preview" src="${item.image.url}"/>`);
  }catch(err){res.status(500).json({error:err.message});}
});

app.get("/random/anhmoe/:category", async (req,res)=>{
  try{
    const category=req.params.category;
    const items=await anh.getCategory(category);
    if(!items.length) return res.status(404).json({error:"Tidak ada data"});
    const item=items[Math.floor(Math.random()*items.length)];
    if(item.type==="video") res.send(`<video class="preview" controls src="${item.video.url}"></video>`);
    else res.send(`<img class="preview" src="${item.image.url}"/>`);
  }catch(err){res.status(500).json({error:err.message});}
});

// Image OCR
app.get("/api/ocr/image", async (req,res)=>{
  const {url}=req.query;
  const result=await imageOcr.extract({url});
  res.status(result.code).json(result);
});

// Douyin
app.get("/api/d/douyin", async (req,res)=>{
  const {url}=req.query;
  const result=await douyin.download({url});
  res.status(result.code).json(result);
});

app.post("/api/d/douyin", async (req,res)=>{
  const {url}=req.body;
  const result=await douyin.download({url});
  res.status(result.code).json(result);
});

// Xiaohongshu
app.get("/downloader/xiaohongshu", async (req,res)=>{
  const {url}=req.query;
  if(!url) return res.status(400).json({status:false,error:"URL parameter is required"});
  const result=await xhs.download({url:url.trim()});
  if(!result.status) return res.status(result.code).json({status:false,error:result.result.message});
  res.status(200).json({status:true,data:result.result,timestamp:new Date().toISOString()});
});

app.post("/downloader/xiaohongshu", async (req,res)=>{
  const {url}=req.body;
  if(!url) return res.status(400).json({status:false,error:"URL parameter is required"});
  const result=await xhs.download({url:url.trim()});
  if(!result.status) return res.status(result.code).json({status:false,error:result.result.message});
  res.status(200).json({status:true,data:result.result,timestamp:new Date().toISOString()});
});

// BRAT Maker
app.get("/maker/brat", async (req,res)=>{
  try{
    const {text,background,color}=req.query;
    if(!text) return res.status(400).json({status:false,error:"Missing required parameter",message:"The 'text' parameter is required"});
    if(text.length>500) return res.status(400).json({status:false,error:"Text too long",message:"Text must be 500 characters or less"});
    if(background && !/^#[0-9A-Fa-f]{6}$/.test(background)) return res.status(400).json({status:false,error:"Invalid background color",message:"Background color must be in hex format (e.g., #000000)"});
    if(color && !/^#[0-9A-Fa-f]{6}$/.test(color)) return res.status(400).json({status:false,error:"Invalid text color",message:"Text color must be in hex format (e.g., #FFFFFF)"});
    const imageBuffer=await generateBratImage(text,background,color);
    res.setHeader("Content-Type","image/png");
    res.setHeader("Content-Length",imageBuffer.length);
    res.setHeader("Cache-Control","public, max-age=3600");
    res.setHeader("Content-Disposition",`inline; filename="brat_${Date.now()}.png"`);
    res.end(imageBuffer);
  }catch(error){
    console.error("BRAT API Error:",error);
    res.status(500).json({status:false,error:"Image generation failed",message:error.message||"Failed to generate BRAT image"});
  }
});

app.get("/maker/bratvid", async (req,res)=>{
  try{
    const {text,background,color}=req.query;
    if(!text) return res.status(400).json({status:false,error:"Missing required parameter",message:"The 'text' parameter is required"});
    if(text.length>500) return res.status(400).json({status:false,error:"Text too long",message:"Text must be 500 characters or less"});
    if(background && !/^#[0-9A-Fa-f]{6}$/.test(background)) return res.status(400).json({status:false,error:"Invalid background color",message:"Background color must be in hex format (e.g., #000000)"});
    if(color && !/^#[0-9A-Fa-f]{6}$/.test(color)) return res.status(400).json({status:false,error:"Invalid text color",message:"Text color must be in hex format (e.g., #FFFFFF)"});
    const videoBuffer=await generateBratVideo(text,background,color);
    res.setHeader("Content-Type","video/mp4");
    res.setHeader("Content-Length",videoBuffer.length);
    res.setHeader("Cache-Control","public, max-age=3600");
    res.setHeader("Content-Disposition",`inline; filename="bratvid_${Date.now()}.mp4"`);
    res.setHeader("Accept-Ranges","bytes");
    if(req.method==="HEAD") return res.end();
    const range=req.headers.range;
    if(range){
      const parts=range.replace(/bytes=/,"").split("-");
      const start=Number.parseInt(parts[0],10);
      const end=parts[1]?Number.parseInt(parts[1],10):videoBuffer.length-1;
      const chunksize=end-start+1;
      const chunk=videoBuffer.slice(start,end+1);
      res.status(206);
      res.setHeader("Content-Range",`bytes ${start}-${end}/${videoBuffer.length}`);
      res.setHeader("Content-Length",chunksize);
      res.end(chunk);
    }else{
      res.end(videoBuffer);
    }
  }catch(error){
    console.error("BRATVID API Error:",error);
    res.status(500).json({status:false,error:"Video generation failed",message:error.message||"Failed to generate BRAT video"});
  }
});

// Health Check
app.get("/health", (req,res)=>{
  res.json({status:"ok",env:ENV,platform:IS_VERCEL?"vercel":"termux"});
});

// Homepage
app.get("/", (req,res)=>{
  const categories = anh.getCategories();
  const categoryButtons = categories.map(cat => `<button class="category-btn" onclick="selectCategory('${cat}')">${cat.toUpperCase()}</button>`).join('');
  const envBadge = IS_VERCEL ? `<span class="badge">⚡ VERCEL</span>` : `<span class="badge">📱 TERMUX</span>`;
  
  res.send(`
<html>
<head><meta name="viewport" content="width=device-width, initial-scale=1.0"/><title>API PANEL</title><style>${css}</style></head>
<body>
<h1>🚀 API PANEL ${envBadge}</h1>

<div class="endpoint">
<h2><span class="method GET">GET</span> /ai/gemini</h2>
<p class="desc">Dapatkan jawaban AI Gemini</p>
<input id="q" placeholder="Tulis pertanyaan..." />
<button onclick="callGemini()">Kirim</button>
<pre id="geminiResult" style="display:none;"></pre></div>

<div class="endpoint">
<h2><span class="method GET">GET</span> /random/ba</h2>
<p class="desc">Random Blue Archive Image</p>
<button onclick="loadImage('/random/ba','baResult')">Kirim</button>
<div id="baResult"></div>
</div>

<div class="endpoint">
<h2><span class="method GET">GET</span> /random/china</h2>
<p class="desc">Random China Image</p>
<button onclick="loadImage('/random/china','chinaResult')">Kirim</button>
<div id="chinaResult"></div>
</div>

<div class="endpoint">
<h2><span class="method GET">GET</span> /api/d/tiktok</h2>
<p class="desc">Download TikTok</p>
<input id="ttUrl2" placeholder="Masukkan URL TikTok..." />
<button onclick="loadTikTok2()">Download</button>
<div id="ttResult2"></div>
</div>

<div class="endpoint">
<h2><span class="method GET">GET</span> /api/ocr/image</h2>
<p class="desc">Extract Text dari Gambar (OCR)</p>
<input id="ocrUrl" placeholder="Masukkan URL gambar..." />
<button onclick="loadOCR()">Extract</button>
<div id="ocrResult"></div>
</div>

<div class="endpoint">
<h2><span class="method GET">GET</span> /api/d/douyin</h2>
<p class="desc">Download Douyin</p>
<input id="douyinUrl" placeholder="Masukkan URL Douyin..." />
<button onclick="loadDouyin()">Download</button>
<div id="douyinResult"></div>
</div>

<div class="endpoint">
<h2><span class="method GET">GET</span> /downloader/xiaohongshu</h2>
<p class="desc">Download Xiaohongshu</p>
<input id="xhsUrl" placeholder="Masukkan URL Xiaohongshu..." />
<button onclick="loadXHS()">Download</button>
<div id="xhsResult"></div>
</div>

<div class="endpoint">
<h2><span class="method GET">GET</span> /maker/brat</h2>
<p class="desc">Generate BRAT Image</p>
<input id="bratText" placeholder="Masukkan teks..." />
<input id="bratBg" placeholder="Background (#000000)" />
<input id="bratColor" placeholder="Text Color (#FFFFFF)" />
<button onclick="loadBrat()">Generate</button>
<div id="bratResult"></div>
</div>

<div class="endpoint">
<h2><span class="method GET">GET</span> /maker/bratvid</h2>
<p class="desc">Generate BRAT Video</p>
<input id="bratvidText" placeholder="Masukkan teks..." />
<input id="bratvidBg" placeholder="Background (#000000)" />
<input id="bratvidColor" placeholder="Text Color (#FFFFFF)" />
<button onclick="loadBratVid()">Generate</button>
<div id="bratvidResult"></div>
</div>

<div class="endpoint">
<h2><span class="method GET">GET</span> /random/anhmoe</h2>
<p class="desc">Random Anh.moe (Pilih Kategori)</p>
<div style="margin-bottom:10px;">
${categoryButtons}
</div>
<button onclick="loadAnhByCategory()">🎲 Random</button>
<div id="anhResult"></div>
</div>

<script>
let selectedCategory = null;

function selectCategory(category) {
  selectedCategory = category;
  const buttons = document.querySelectorAll('.category-btn');
  buttons.forEach(btn => btn.classList.remove('active'));
  event.target.classList.add('active');
}

async function loadAnhByCategory(){
  const container=document.getElementById("anhResult");
  if(!selectedCategory) { 
    container.innerHTML="<pre>⚠️ Pilih kategori terlebih dahulu</pre>"; 
    return; 
  }
  container.innerHTML="<div class='loading'>⏳ Mengambil konten...</div>";
  try{
    const res=await fetch("/random/anhmoe/"+encodeURIComponent(selectedCategory));
    if(!res.ok) throw new Error("Gagal ambil konten");
    const html=await res.text();
    container.innerHTML=html;
  }catch(err){ container.innerHTML="<pre>Error: "+err+"</pre>"; }
}

async function callGemini(){
  const q=document.getElementById("q").value.trim();
  const result=document.getElementById("geminiResult");
  result.style.display="block";
  result.textContent="⏳ Memproses...";
  try{
    const res=await fetch("/ai/gemini?q="+encodeURIComponent(q));
    result.textContent=await res.text();
  }catch(err){ result.textContent="Error: "+err; }
}

async function loadImage(endpoint,targetId){
  const container=document.getElementById(targetId);
  container.innerHTML="<div class='loading'>⏳ Mengambil...</div>";
  try{
    const res=await fetch(endpoint);
    if(!res.ok) throw new Error("Gagal ambil gambar");
    const blob=await res.blob();
    const url=URL.createObjectURL(blob);
    container.innerHTML="<img class='preview' src='"+url+"' />";
  }catch(err){ container.innerHTML="<pre>Error: "+err+"</pre>"; }
}

async function loadTikTok2(){
  const container=document.getElementById("ttResult2");
  const url=document.getElementById("ttUrl2").value.trim();
  if(!url){ container.innerHTML="<pre>URL wajib diisi</pre>"; return; }
  container.innerHTML="<div class='loading'>⏳ Mengambil info...</div>";
  try{
    const res=await fetch("/api/d/tiktok?url="+encodeURIComponent(url));
    const data=await res.json();
    container.innerHTML="<pre>"+JSON.stringify(data,null,2)+"</pre>";
  }catch(err){ container.innerHTML="<pre>Error: "+err+"</pre>"; }
}

async function loadOCR(){
  const container=document.getElementById("ocrResult");
  const url=document.getElementById("ocrUrl").value.trim();
  if(!url){ container.innerHTML="<pre>URL wajib diisi</pre>"; return; }
  container.innerHTML="<div class='loading'>⏳ Ekstrak teks...</div>";
  try{
    const res=await fetch("/api/ocr/image?url="+encodeURIComponent(url));
    const data=await res.json();
    if(data.status) {
      container.innerHTML="<pre>"+data.result.extracted_text+"</pre>";
    } else {
      container.innerHTML="<pre>Error: "+data.result.message+"</pre>";
    }
  }catch(err){ container.innerHTML="<pre>Error: "+err+"</pre>"; }
}

async function loadDouyin(){
  const container=document.getElementById("douyinResult");
  const url=document.getElementById("douyinUrl").value.trim();
  if(!url){ container.innerHTML="<pre>URL wajib diisi</pre>"; return; }
  container.innerHTML="<div class='loading'>⏳ Mengambil info...</div>";
  try{
    const res=await fetch("/api/d/douyin?url="+encodeURIComponent(url));
    const data=await res.json();
    if(data.status) {
      let html="<div>";
      if(data.result.thumbnail) html+="<img class='preview' src='"+data.result.thumbnail+"' />";
      html+="<p><strong>Caption:</strong> "+data.result.caption+"</p>";
      html+="<p><strong>Media:</strong></p>";
      data.result.media.forEach(m => {
        html+="<p>• "+m.type+" ("+m.quality+"): <a href='"+m.url+"' target='_blank'>Download</a></p>";
      });
      html+="</div>";
      container.innerHTML=html;
    } else {
      container.innerHTML="<pre>Error: "+data.result.message+"</pre>";
    }
  }catch(err){ container.innerHTML="<pre>Error: "+err+"</pre>"; }
}

async function loadXHS(){
  const container=document.getElementById("xhsResult");
  const url=document.getElementById("xhsUrl").value.trim();
  if(!url){ container.innerHTML="<pre>URL wajib diisi</pre>"; return; }
  container.innerHTML="<div class='loading'>⏳ Mengambil info...</div>";
  try{
    const res=await fetch("/downloader/xiaohongshu?url="+encodeURIComponent(url));
    const data=await res.json();
    if(data.status) {
      container.innerHTML="<pre>"+JSON.stringify(data.data,null,2)+"</pre>";
    } else {
      container.innerHTML="<pre>Error: "+data.error+"</pre>";
    }
  }catch(err){ container.innerHTML="<pre>Error: "+err+"</pre>"; }
}

async function loadBrat(){
  const container=document.getElementById("bratResult");
  const text=document.getElementById("bratText").value.trim();
  const bg=document.getElementById("bratBg").value.trim();
  const color=document.getElementById("bratColor").value.trim();
  if(!text){ container.innerHTML="<pre>Teks wajib diisi</pre>"; return; }
  container.innerHTML="<div class='loading'>⏳ Generate gambar...</div>";
  try{
    let url="/maker/brat?text="+encodeURIComponent(text);
    if(bg) url+="&background="+encodeURIComponent(bg);
    if(color) url+="&color="+encodeURIComponent(color);
    const res=await fetch(url);
    if(!res.ok) throw new Error("Gagal generate");
    const blob=await res.blob();
    const imgUrl=URL.createObjectURL(blob);
    container.innerHTML="<img class='preview' src='"+imgUrl+"' />";
  }catch(err){ container.innerHTML="<pre>Error: "+err+"</pre>"; }
}

async function loadBratVid(){
  const container=document.getElementById("bratvidResult");
  const text=document.getElementById("bratvidText").value.trim();
  const bg=document.getElementById("bratvidBg").value.trim();
  const color=document.getElementById("bratvidColor").value.trim();
  if(!text){ container.innerHTML="<pre>Teks wajib diisi</pre>"; return; }
  container.innerHTML="<div class='loading'>⏳ Generate video...</div>";
  try{
    let url="/maker/bratvid?text="+encodeURIComponent(text);
    if(bg) url+="&background="+encodeURIComponent(bg);
    if(color) url+="&color="+encodeURIComponent(color);
    const res=await fetch(url);
    if(!res.ok) throw new Error("Gagal generate");
    const blob=await res.blob();
    const vidUrl=URL.createObjectURL(blob);
    container.innerHTML="<video class='preview' controls src='"+vidUrl+"'></video>";
  }catch(err){ container.innerHTML="<pre>Error: "+err+"</pre>"; }
}
</script>

</body>
</html>
`);
});

// Vercel Serverless Function Handler
export default app;

// Conditional listen for Termux
if (!IS_VERCEL) {
  app.listen(PORT,"0.0.0.0",()=>log.success(`Server running di Termux: http://localhost:${PORT}`));
           }
