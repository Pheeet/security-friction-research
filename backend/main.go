// main.go
package main

import (
	"log"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"

	"backend-api/database"
	"backend-api/handlers"
	"backend-api/middleware"
)

func main() {
	// 1. โหลด .env ก่อน
	err := godotenv.Load()
	if err != nil {
		log.Println("Warning: .env file not found. Using system environment variables.")
	}

	database.ConnectDB()

	handlers.InitGoogleAuth() // อ่าน os.Getenv

	r := gin.Default()

	// 2. แก้ปัญหา CORS (ให้ Frontend ยิงเข้ามาได้)
	config := cors.DefaultConfig()
	config.AllowAllOrigins = true
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
		api.GET("/ping", func(c *gin.Context) {
			c.JSON(200, gin.H{"message: ": "pong"})
		})

		// --- 🟢 Public Routes (ไม่ต้องใช้ JWT) ---
		api.POST("/login", handlers.LoginHandler)
		api.POST("/register", handlers.RegisterHandler)
		api.GET("/check-availability", handlers.CheckAvailabilityHandler)

		// Captcha ด่านต่างๆ (ใช้ userID จาก Body/Query)
		api.GET("/captcha", handlers.GenerateCaptcha)
		api.POST("/verify", handlers.VerifyCaptcha)
		api.GET("/slider", handlers.GenerateSliderCaptcha)
		api.POST("/slider/verify", handlers.VerifySlider)
		api.POST("/turnstile/verify", handlers.VerifyTurnstile)

		// 2FA & Google SSO
		api.GET("/auth/google/login", handlers.GoogleLogin)
		api.GET("/auth/google/callback", handlers.GoogleCallback)
		api.POST("/2fa/request", handlers.RequestOTPHandler)
		api.POST("/2fa/verify", handlers.Verify2FAHandler) // ตัวนี้เป็นคนแจก JWT

		// --- Protected Routes (ต้องผ่าน 2FA และมี JWT แล้วเท่านั้น) ---
		protected := api.Group("/research")
		protected.Use(middleware.AuthMiddleware()) // ใช้ Middleware กั้นตรงนี้
		{
			// API สุดท้ายที่จะรวบรวม Data ทั้งหมด
			//protected.POST("/survey", handlers.SubmitSurveyHandler)
		}
	}

	// รัน Server ที่ Port 8080
	r.Run(":8080")
}
