import { Router } from "express";
import axios from "axios";
import { asyncHandler } from "../utils/validation.js";

const router = Router();

// Random Blue Archive
router.get("/random/ba", asyncHandler(async (req, res) => {
  const { data } = await axios.get("https://raw.githubusercontent.com/rynxzyy/blue-archive-r-img/refs/heads/main/links.json", {
    timeout: 10000
  });
  const imgUrl = data[Math.floor(Math.random() * data.length)];
  const imgRes = await axios.get(imgUrl, { 
    responseType: "arraybuffer",
    timeout: 15000
  });
  
  res.setHeader("Content-Type", "image/jpeg");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.end(Buffer.from(imgRes.data));
}));

// Random China
router.get("/random/china", asyncHandler(async (req, res) => {
  const { data } = await axios.get("https://github.com/ArifzynXD/database/raw/master/asupan/china.json", {
    timeout: 10000
  });
  const rand = data[Math.floor(Math.random() * data.length)];
  const imgRes = await axios.get(rand.url, { 
    responseType: "arraybuffer",
    timeout: 15000
  });
  
  res.setHeader("Content-Type", "image/jpeg");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.end(Buffer.from(imgRes.data));
}));

export const metadata = [
  {
    name: "Random Blue Archive",
    path: "/random/ba",
    method: "GET",
    description: "Get random Blue Archive character images",
    responseBinary: true,
    params: []
  },
  {
    name: "Random China",
    path: "/random/china",
    method: "GET",
    description: "Get random China images",
    responseBinary: true,
    params: []
  }
];

export default router;
