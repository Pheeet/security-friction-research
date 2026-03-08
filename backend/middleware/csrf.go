// middleware/csrf.go
package middleware

import (
	"net/http"
	"strings"

	"backend-api/database"

	"github.com/gin-gonic/gin"
)

// CSRFProtection ป้องกันการยิง Request ข้ามโดเมนจากเว็บประสงค์ร้าย
func CSRFProtection() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 1. ปล่อยผ่าน GET, HEAD, OPTIONS เพราะ HTTP Method เหล่านี้ไม่ควรมีการแก้ไขข้อมูล (Safe Methods)
		if c.Request.Method == "GET" || c.Request.Method == "HEAD" || c.Request.Method == "OPTIONS" {
			c.Next()
			return
		}

		// 2. ดึงค่า Origin และ Referer จาก Header
		origin := c.GetHeader("Origin")
		referer := c.GetHeader("Referer")
		allowedOrigin := database.GetEnv("FRONTEND_URL", "http://localhost:3000")

		// ลบ trailing slash ออกเพื่อความชัวร์เวลาเทียบ String
		allowedOrigin = strings.TrimSuffix(allowedOrigin, "/")

		// 3. ถ้าไม่มีทั้ง Origin และ Referer เลย (บล็อกเพื่อความปลอดภัย)
		if origin == "" && referer == "" {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "CSRF Blocked: Missing Origin/Referer headers"})
			return
		}

		// 4. ตรวจสอบว่า Origin ตรงกับเว็บของเราหรือไม่
		if origin != "" && !strings.HasPrefix(origin, allowedOrigin) {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "CSRF Blocked: Invalid Origin"})
			return
		}

		// 5. กรณีเบราว์เซอร์ไม่ส่ง Origin (บางกรณี) ให้เช็กจาก Referer แทน
		if referer != "" && !strings.HasPrefix(referer, allowedOrigin) {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "CSRF Blocked: Invalid Referer"})
			return
		}

		// ผ่านฉลุย ให้ทำงานต่อได้
		c.Next()
	}
}