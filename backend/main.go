// main.go
package main

import (
	"log"
	"runtime/debug"
	"strings"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"golang.org/x/time/rate"

	"backend-api/database"
	"backend-api/handlers"
	"backend-api/middleware"
)

func main() {
	// Free-Tier survival: Tune GC to be more aggressive to save RAM
	debug.SetGCPercent(50)

	// 1. โหลด .env ก่อน
	err := godotenv.Load()
	if err != nil {
		log.Println("Warning: .env file not found. Using system environment variables.")
	}

	database.ConnectDB()

	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		log.Fatal("❌ FATAL: JWT_SECRET environment variable is NOT set. Stopping server for security.")
	}

	handlers.InitGoogleAuth() // อ่าน os.Getenv

	r := gin.Default()

	frontendURL := database.GetEnv("FRONTEND_URL", "http://localhost:3000")
	frontendURL = strings.TrimSuffix(frontendURL, "/")
	env := database.GetEnv("ENV", "development")

	// 2. แก้ปัญหา CORS (ให้ Frontend ยิงเข้ามาได้)
	config := cors.DefaultConfig()
	if env == "production" || env == "release" {
		config.AllowOrigins = []string{frontendURL} // Production ยอมรับแค่ URL จริง
	} else {
		config.AllowOrigins = []string{frontendURL, "http://localhost:3000", "http://127.0.0.1:3000"} // Dev อนุญาต Localhost ได้
	}
	config.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
	config.AllowHeaders = []string{"Origin", "Content-Type", "Authorization", "Accept", "Cookie"}
	config.ExposeHeaders = []string{"Content-Length", "Set-Cookie"}
	config.AllowCredentials = true
	config.MaxAge = 12 * time.Hour
	r.Use(cors.New(config))

	// ใช้ Session Middleware
	r.Use(middleware.SessionMiddleware())

	api := r.Group("/api")
	{
		api.Use(middleware.CSRFProtection())
		
		api.GET("/ping", func(c *gin.Context) {
			c.JSON(200, gin.H{"message: ": "pong"})
		})

		// --- 🟢 Public Routes (ไม่ต้องใช้ JWT) ---
		// Strict rate limit for authentication (5 requests per minute, burst 10)
		authLimit := middleware.RateLimitMiddleware(rate.Every(time.Minute/5), 10)

		api.POST("/login", authLimit, handlers.LoginHandler)
		api.POST("/logout", handlers.LogoutHandler)
		api.POST("/register", authLimit, handlers.RegisterHandler)
		api.GET("/check-availability", handlers.CheckAvailabilityHandler)

		// 🔥 เพิ่มบรรทัดนี้ลงไปตรงนี้ครับ เพื่อให้หน้า 2FA ดึงอีเมลได้
		api.GET("/user/:id", handlers.GetUserHandler)

		// Captcha ด่านต่างๆ (ใช้ userID จาก Body/Query)
		api.GET("/captcha", handlers.GenerateCaptcha)
		api.POST("/verify", handlers.VerifyCaptcha)
		api.GET("/slider", handlers.GenerateSliderCaptcha)
		api.POST("/slider/verify", handlers.VerifySlider)
		api.POST("/turnstile/verify", handlers.VerifyTurnstile)

		// 2FA & Google SSO
		api.GET("/auth/google/login", handlers.GoogleLogin)
		api.GET("/auth/google/callback", handlers.GoogleCallback)
		api.GET("/auth/token-sync", handlers.SyncTokenHandler)
		api.POST("/2fa/request", authLimit, handlers.RequestOTPHandler)
		api.POST("/2fa/verify", authLimit, handlers.Verify2FAHandler) // ตัวนี้เป็นคนแจก JWT
		api.GET("/2fa/check-push", handlers.CheckPushStatus)
		api.GET("/2fa/simulate-push-approve", handlers.SimulatePushApprove)
		

		// --- Protected Routes (ต้องผ่าน 2FA และมี JWT แล้วเท่านั้น) ---
		protected := api.Group("/research")
		protected.Use(middleware.AuthMiddleware()) // ใช้ Middleware กั้นตรงนี้
		{
			// API สุดท้ายที่จะรวบรวม Data ทั้งหมด
			protected.POST("/survey", handlers.SubmitSurveyHandler)
		}
	}

	// รัน Server ที่ Port ตาม Env (Render requirement)
	port := database.GetEnv("PORT", "8080")
	r.Run(":" + port)
}
