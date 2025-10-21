import fs from "fs";
import path from "path";

const filePath = path.join(process.cwd(), "endpoints.json");

// Pastikan endpoints.json ada
if (!fs.existsSync(filePath)) {
  fs.writeFileSync(
    filePath,
    JSON.stringify([
      {
        name: "Random Blue Archive",
        method: "GET",
        path: "/api/bluearchive"
      }
    ], null, 2)
  );
}

// Handler Blue Archive
async function blueArchiveHandler(req, res) {
  const urls = [
    "https://raw.githubusercontent.com/rynxzyy/blue-archive-r-img/main/links.json"
  ];
  const randomUrl = urls[Math.floor(Math.random() * urls.length)];
  res.status(200).json({ url: randomUrl });
}

// Utility untuk handle gambar
async function fetchImage(url, res) {
  try {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    res.setHeader("Content-Type", "image/png");
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export default async function handler(req, res) {
  // FRONTEND
  if (req.method === "GET" && req.headers.accept?.includes("text/html")) {
    const endpoints = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    res.setHeader("Content-Type", "text/html");
    res.end(`
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>API Tester</title>
<style>
body { font-family:sans-serif; background:#0a0a0a; color:#fff; }
.sidebar { position:fixed; left:0; top:0; width:280px; height:100vh; background:#111; padding:20px; overflow:auto; }
.endpoint-item { padding:10px; border-left:3px solid transparent; cursor:pointer; margin-bottom:4px; }
.endpoint-item.active { border-left:3px solid #0f0; background:#1a1a1a; }
.main { margin-left:280px; padding:20px; }
textarea,input{width:100%;background:#0a0a0a;color:#fff;padding:8px;border:1px solid #333;border-radius:6px;margin-bottom:8px;}
.btn{padding:10px 16px;background:#0f0;color:#000;border:none;border-radius:6px;cursor:pointer;margin-bottom:12px;}
.response-body{background:#000;padding:12px;border-radius:6px;max-height:400px;overflow:auto;}
.response-body img{max-width:100%; border-radius:6px;}
</style>
</head>
<body>
<div class="sidebar">
  <h2>API TESTER</h2>
  <ul id="endpoint-list"></ul>
</div>
<div class="main">
  <div id="endpoint-detail"></div>
  <div class="form-group">
    <h3>Add New Endpoint</h3>
    <input id="new-name" placeholder="Name" />
    <input id="new-method" placeholder="Method (GET/POST)" />
    <input id="new-path" placeholder="Path (/api/example)" />
    <button class="btn" onclick="addEndpoint()">Add Endpoint</button>
    <div id="add-response" class="response-body"></div>
  </div>
</div>
<script>
let endpoints = ${JSON.stringify(endpoints)};

function renderList() {
  const list = document.getElementById('endpoint-list');
  list.innerHTML = '';
  endpoints.forEach((ep,i)=>{
    const li = document.createElement('li');
    li.className='endpoint-item';
    li.innerHTML = ep.name+' ('+ep.method+')';
    li.onclick = ()=>selectEndpoint(i);
    list.appendChild(li);
  });
}

function selectEndpoint(i){
  document.getElementById('endpoint-detail').innerHTML = '';
  document.querySelectorAll('.endpoint-item').forEach(e=>e.classList.remove('active'));
  document.querySelectorAll('.endpoint-item')[i].classList.add('active');

  const ep = endpoints[i];
  const html = \`
    <h3>\${ep.name}</h3>
    \${ep.method==='POST'?'<label>JSON Body</label><textarea id="input"></textarea>':'<label>Query Params</label><input id="input" placeholder="?param=value">'}
    <button class="btn" onclick="testEndpoint(\${i})">Send</button>
    <div class="response-body" id="response"></div>
  \`;
  document.getElementById('endpoint-detail').innerHTML = html;
}

async function testEndpoint(i){
  const ep = endpoints[i];
  const input = document.getElementById('input').value;
  const response = document.getElementById('response');

  const url = ep.path + (ep.method==='GET'?input:'');
  const options = { method: ep.method };
  if(ep.method==='POST' && input){
    try { options.body=JSON.stringify(JSON.parse(input)); options.headers={'Content-Type':'application/json'} }
    catch(e){ response.innerHTML='Invalid JSON: '+e.message; return; }
  }

  response.innerHTML='Loading...';
  try {
    const res = await fetch(url, options);
    const contentType = res.headers.get('content-type') || '';
    let bodyContent = '';
    if(contentType.includes('image')){
      const blob = await res.blob();
      const imgUrl = URL.createObjectURL(blob);
      bodyContent = '<img src="'+imgUrl+'" />';
    } else {
      const text = await res.text();
      try{ bodyContent = '<pre>'+JSON.stringify(JSON.parse(text),null,2)+'</pre>'; }
      catch{ bodyContent = '<pre>'+text+'</pre>'; }
    }
    response.innerHTML = bodyContent;
  } catch(e){
    response.innerHTML = 'Error: '+e.message;
  }
}

function addEndpoint(){
  const name = document.getElementById('new-name').value;
  const method = document.getElementById('new-method').value.toUpperCase();
  const path = document.getElementById('new-path').value;
  const respDiv = document.getElementById('add-response');

  fetch('/api', {
    method: 'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({name,method,path})
  }).then(r=>r.json()).then(data=>{
    if(data.error) respDiv.innerHTML = 'Error: '+data.error;
    else {
      endpoints = data.endpoints;
      renderList();
      respDiv.innerHTML = 'Endpoint added!';
    }
  }).catch(e=>respDiv.innerHTML='Error: '+e.message);
}

renderList();
</script>
</body>
</html>
`);
    return;
  }

  // API GET Blue Archive
  if (req.method === "GET" && req.url?.startsWith("/api/bluearchive")) {
    return blueArchiveHandler(req, res);
  }

  // API GET semua endpoint
  if (req.method === "GET") {
    const endpoints = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    res.status(200).json(endpoints);
    return;
  }

  // API POST untuk tambah endpoint
  if (req.method === "POST") {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { name, method, path: epPath } = JSON.parse(body);
        if (!name || !method || !epPath) return res.status(400).json({ error: 'name, method, path required' });
        const endpoints = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        endpoints.push({ name, method, path: epPath });
        fs.writeFileSync(filePath, JSON.stringify(endpoints, null, 2), 'utf-8');
        res.status(200).json({ message: 'Endpoint added', endpoints });
      } catch (e) {
        res.status(400).json({ error: e.message });
      }
    });
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}

// Vercel Node.js runtime
export const config = { runtime: 'nodejs' };