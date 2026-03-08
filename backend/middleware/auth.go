// middleware/auth.go
package middleware

import (
	"backend-api/utils"
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

// AuthMiddleware validates JWT token from Header or Cookie
func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		var tokenString string

		// 🟢 1. ลองดึงจาก Header 'Authorization' ก่อน (สำหรับ Frontend ที่อยู่คนละโดเมน Vercel -> Render)
		authHeader := c.GetHeader("Authorization")
		if authHeader != "" && strings.HasPrefix(authHeader, "Bearer ") {
			// ตัดคำว่า "Bearer " ออก เหลือแค่ตัว Token ล้วนๆ
			tokenString = strings.TrimPrefix(authHeader, "Bearer ")
		}

		// 🟢 2. ถ้าใน Header ไม่มี ลองหาใน Cookie (เผื่อใช้ตอนเทสใน Localhost หรือโดเมนเดียวกัน)
		if tokenString == "" {
			cookieToken, err := c.Cookie("auth_token")
			if err == nil && cookieToken != "" {
				tokenString = cookieToken
			}
		}

		// ถ้าหาไม่เจอทั้ง 2 ทาง ค่อยเตะกลับ
		if tokenString == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized: No token provided"})
			c.Abort()
			return
		}

		// 2. ดึง Secret Key จากไฟล์ .env (Production Standard)
		secret := os.Getenv("JWT_SECRET")

		// 3. ตรวจสอบความถูกต้องและวันหมดอายุของ Token
		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, jwt.ErrSignatureInvalid
			}
			return []byte(secret), nil
		})

		if err != nil || !token.Valid {
			// ถ้า Token หมดอายุ หรือถูกปลอมแปลง ให้ล้างคุกกี้ทิ้งซะ
			utils.SetSecureCookie(c, "auth_token", "", -1)
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
