// middleware/csrf.go
package middleware

import (
	"fmt"
	"net/http"
	"net/url"
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
		
		env := database.GetEnv("ENV", "development")
		frontendURL := database.GetEnv("FRONTEND_URL", "http://localhost:3000")
		frontendURL = strings.TrimSuffix(frontendURL, "/")

		// สร้างรายการ Allowed Origins (ต้องตรงกับ CORS ใน main.go)
		allowedOrigins := []string{frontendURL}
		if env != "production" && env != "release" {
			allowedOrigins = append(allowedOrigins, "http://localhost:3000", "http://127.0.0.1:3000")
		}

		isAllowed := func(target string) bool {
			target = strings.TrimSuffix(target, "/")
			for _, allowed := range allowedOrigins {
				if target == allowed {
					return true
				}
			}
			return false
		}

		// 3. ถ้าไม่มีทั้ง Origin และ Referer เลย (บล็อกเพื่อความปลอดภัย)
		// หมายเหตุ: Brave/Chrome จะส่ง Origin เสมอใน POST request ข้ามโดเมน
		if origin == "" && referer == "" {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "CSRF Blocked: Missing Origin/Referer headers"})
			return
		}

		// 4. ตรวจสอบ Origin (ถ้ามี)
		if origin != "" && !isAllowed(origin) {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "CSRF Blocked: Invalid Origin"})
			return
		}

		// 5. ตรวจสอบ Referer (ถ้ามี) - Brave อาจจะตัด Referer เหลือแค่ Origin
		if referer != "" {
			refURL, err := url.Parse(referer)
			if err != nil {
				c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "CSRF Blocked: Malformed Referer"})
				return
			}
			refOrigin := fmt.Sprintf("%s://%s", refURL.Scheme, refURL.Host)
			if !isAllowed(refOrigin) {
				c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "CSRF Blocked: Invalid Referer"})
				return
			}
		}

		// ผ่านฉลุย ให้ทำงานต่อได้
		c.Next()
	}
}
