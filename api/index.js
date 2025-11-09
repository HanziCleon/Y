import 'dotenv/config';
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import { readFileSync } from "fs";
import { initDatabase, User } from "../models/index.js";
import { initEndpointDatabase, ApiEndpoint } from "../models/endpoint/index.js";
import authRoutes from "../routes/auth.js";
import adminRoutes from "../routes/admin.js";
import sseRoutes from "../routes/sse.js";
import endpointsRoutes from "../routes/endpoints.js";
import adminEndpointsRoutes from "../routes/admin-endpoints.js";
import endpointsFromRoutesRoutes from "../routes/endpoints-from-routes.js";
import { checkVIPAccess, optionalAuth } from "../middleware/auth.js";
import RouteManager from "../services/RouteManager.js";
import EndpointSyncService from "../services/EndpointSyncService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageJson = JSON.parse(readFileSync(path.join(__dirname, '..', 'package.json'), 'utf-8'));

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

app.use(express.static(path.join(__dirname, "..", "public")));
app.use('/asset', express.static(path.join(__dirname, "..", "asset")));

const routesPath = path.join(__dirname, "..", "routes");
const routeManager = new RouteManager(routesPath);
const endpointSyncService = new EndpointSyncService(routesPath);

app.use(optionalAuth);

let isInitialized = false;

async function initializeApp() {
  if (isInitialized) return;
  
  try {
    await initDatabase();
    await initEndpointDatabase();
    
    app.use(authRoutes);
    app.use(adminRoutes);
    app.use(sseRoutes);
    app.use(endpointsFromRoutesRoutes);
    app.use(endpointsRoutes);
    app.use(adminEndpointsRoutes);
    
    app.get("/health", (req, res) => {
      res.json({
        status: "ok",
        uptime: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
        total_endpoints: routeManager.getAllEndpoints().length,
        environment: process.env.VERCEL ? "vercel" : "local"
      });
    });

    app.get("/api/version", (req, res) => {
      res.json({
        version: packageJson.version,
        name: packageJson.name,
        description: packageJson.description
      });
    });

    app.get("/", (req, res) => {
      res.sendFile(path.join(__dirname, "..", "public", "index.html"));
    });

    app.get("/api", (req, res) => {
      const allEndpoints = routeManager.getAllEndpoints();
      res.json({
        name: "Dongtube API Server",
        version: packageJson.version,
        total_endpoints: allEndpoints.length,
        endpoints: allEndpoints.map(e => ({
          name: e.name,
          path: e.path,
          method: e.method
        }))
      });
    });

    app.get("/api/docs", async (req, res) => {
      let hasPremiumAccess = false;
      try {
        const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];
        if (token) {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          const user = await User.findByPk(decoded.id, {
            attributes: ['id', 'email', 'role']
          });
          if (user && (user.role === 'vip' || user.role === 'admin')) {
            hasPremiumAccess = true;
          }
        }
      } catch (authError) {
      }
      
      try {
        const dbEndpoints = await ApiEndpoint.findAll({
          where: { isActive: true },
          order: [['priority', 'DESC'], ['createdAt', 'ASC']],
          attributes: [
            'id', 'path', 'method', 'name', 'description', 'category',
            'status', 'parameters', 'examples', 'responseType', 'responseBinary',
            'priority', 'tags'
          ]
        });

        res.setHeader('Cache-Control', 'public, max-age=300');
        res.setHeader('ETag', `"endpoints-${dbEndpoints.length}"`);
        
        const endpointsWithVIPStatus = dbEndpoints.map(dbEp => {
          const isVIPEndpoint = dbEp.status === 'vip' || dbEp.status === 'premium';
          
          if (isVIPEndpoint && !hasPremiumAccess) {
            return {
              path: dbEp.path,
              method: dbEp.method,
              name: dbEp.name,
              description: 'Premium endpoint - VIP access required',
              category: dbEp.category,
              requiresVIP: true,
              params: [],
              parameters: [],
              examples: undefined,
              placeholder: undefined,
              responseBinary: false
            };
          }
          
          return {
            path: dbEp.path,
            method: dbEp.method,
            name: dbEp.name,
            description: dbEp.description,
            category: dbEp.category,
            requiresVIP: isVIPEndpoint,
            params: dbEp.parameters || [],
            parameters: dbEp.parameters || [],
            examples: dbEp.examples,
            responseBinary: dbEp.responseBinary || false,
            tags: dbEp.tags || []
          };
        });
        
        res.json({
          success: true,
          total: endpointsWithVIPStatus.length,
          endpoints: endpointsWithVIPStatus
        });
      } catch (error) {
        const allEndpoints = routeManager.getAllEndpoints();
        
        const sanitizedEndpoints = allEndpoints.map(ep => ({
          path: ep.path,
          method: ep.method,
          name: ep.name,
          description: ep.description || ep.name,
          category: ep.category,
          requiresVIP: false,
          params: hasPremiumAccess ? (ep.params || ep.parameters || []) : [],
          parameters: hasPremiumAccess ? (ep.parameters || ep.params || []) : [],
          examples: hasPremiumAccess ? ep.examples : undefined,
          responseBinary: ep.responseBinary || false
        }));
        
        res.json({
          success: true,
          total: sanitizedEndpoints.length,
          endpoints: sanitizedEndpoints,
          fallback: true
        });
      }
    });

    app.get("/debug/routes", (req, res) => {
      const routes = [];
      
      app._router.stack.forEach(middleware => {
        if (middleware.route) {
          routes.push({
            path: middleware.route.path,
            methods: Object.keys(middleware.route.methods)
          });
        } else if (middleware.name === 'router') {
          middleware.handle.stack.forEach(handler => {
            if (handler.route) {
              routes.push({
                path: handler.route.path,
                methods: Object.keys(handler.route.methods)
              });
            }
          });
        }
      });
      
      res.json({
        total: routes.length,
        routes: routes
      });
    });
    
    app.use(checkVIPAccess);
    
    app.use((req, res, next) => {
      const activeRouter = routeManager.getActiveRouter();
      if (activeRouter) {
        activeRouter(req, res, next);
      } else {
        next();
      }
    });
    
    app.use((req, res) => {
      res.status(404).json({
        success: false,
        error: "Endpoint not found",
        path: req.path,
        method: req.method,
        hint: "Visit /api/docs to see all endpoints"
      });
    });

    app.use((err, req, res, next) => {
      console.error("Error:", err.message);
      res.status(500).json({
        success: false,
        error: "Internal server error",
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    });
    
    await routeManager.reload();
    
    isInitialized = true;
  } catch (err) {
    console.error(`Initialization error: ${err.message}`);
    throw err;
  }
}

export default async function handler(req, res) {
  try {
    if (!isInitialized) {
      await initializeApp();
    }
    app(req, res);
  } catch (error) {
    console.error('Handler error:', error);
    res.status(500).json({
      success: false,
      error: 'Server initialization failed',
      details: error.message
    });
  }
}
