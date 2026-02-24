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
	config.AllowOrigins = []string{"http://localhost:3000", "http://127.0.0.1:3000"}
	config.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
	config.AllowHeaders = []string{"Origin", "Content-Type", "Authorization"}
	config.ExposeHeaders = []string{"Content-Length"}
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

		api.GET("/captcha", handlers.GenerateCaptcha)
		api.POST("/verify", handlers.VerifyCaptcha)

		//slider
		api.GET("/slider", handlers.GenerateSliderCaptcha)
		api.POST("/slider/verify", handlers.VerifySlider)

		//cloudflare turnstile
		api.POST("/turnstile/verify", handlers.VerifyTurnstile)

		// --- login route --
		api.POST("/login", handlers.LoginHandler)
		api.POST("/register", handlers.RegisterHandler)

		api.GET("/check-availability", handlers.CheckAvailabilityHandler)

		// --- Route Google Auth ---
		api.GET("/auth/google/login", handlers.GoogleLogin)       // ปุ่มกด Login
		api.GET("/auth/google/callback", handlers.GoogleCallback) // Google ส่งกลับมาที่นี่
		api.POST("/2fa/request", handlers.RequestOTPHandler)

		// --- 2FA Route ---
		api.POST("/2fa/verify", handlers.Verify2FAHandler)
		api.GET("/2fa/check-push", handlers.CheckPushStatus)
		api.GET("/2fa/simulate-push-approve", handlers.SimulatePushApprove)
	}

	// รัน Server ที่ Port 8080
	r.Run(":8080")
}
