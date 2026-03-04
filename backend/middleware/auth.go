// middleware/auth.go
package middleware

import (
	"backend-api/database"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

// AuthMiddleware validates HttpOnly JWT token
func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 1. ดึง Token จาก Cookie ที่ชื่อ "auth_token" (ปลอดภัยกว่า Header)
		tokenString, err := c.Cookie("auth_token")
		if err != nil || tokenString == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized: No token provided"})
			c.Abort()
			return
		}

		// 2. ดึง Secret Key จากไฟล์ .env (Production Standard)
		secret := database.GetEnv("JWT_SECRET", "dev-secret-key")

		// 3. ตรวจสอบความถูกต้องและวันหมดอายุของ Token
		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, jwt.ErrSignatureInvalid
			}
			return []byte(secret), nil
		})

		if err != nil || !token.Valid {
			// ถ้า Token หมดอายุ หรือถูกปลอมแปลง ให้ล้างคุกกี้ทิ้งซะ
			c.SetCookie("auth_token", "", -1, "/", database.GetEnv("COOKIE_DOMAIN", ""), database.GetEnv("ENV", "development") == "production", true)
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized: Invalid or expired token"})
			c.Abort()
			return
		}

		// 🟢 4. แกะข้อมูล UserID ออกมาเก็บไว้ใน Context เพื่อให้ API อื่นๆ เอาไปใช้งานต่อได้
		if claims, ok := token.Claims.(jwt.MapClaims); ok {
			c.Set("user_id", claims["user_id"])
		}

		c.Next()
	}
}
