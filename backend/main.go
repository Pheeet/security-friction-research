package main

import (
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"

	"backend-api/database"
	"backend-api/handlers"
	"backend-api/middleware"
)

func main() {

	database.ConnectDB()

	r := gin.Default()

	// ตั้งค่า CORS ให้ Frontend Port 3000 ยิงเข้ามาได้
	config := cors.DefaultConfig()
	config.AllowOrigins = []string{"http://localhost:3000"}
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
	}

	// รัน Server ที่ Port 8080
	r.Run(":8080")
}
