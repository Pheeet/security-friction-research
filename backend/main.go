package main

import (
	"log"

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

	r := gin.Default()
	handlers.InitGoogleAuth() // อ่าน os.Getenv

	// ตั้งค่า CORS ให้ Frontend Port 3000 ยิงเข้ามาได้
	config := cors.DefaultConfig()
	config.AllowOrigins = []string{"http://localhost:3000","http://127.0.0.1:3000"}
	config.AllowMethods = []string{"GET", "POST", "OPTIONS"}
	config.AllowHeaders = []string{"Origin", "Content-Type"}
	config.AllowCredentials = true
	config.AddAllowHeaders("Content-Type")
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

		// --- Google SSO Route --
		auth := api.Group("/auth")
		{
			auth.GET("/google/login", handlers.GoogleLogin)
			auth.GET("/google/callback", handlers.GoogleCallback)
		}
	}

	// รัน Server ที่ Port 8080
	r.Run(":8080")
}
