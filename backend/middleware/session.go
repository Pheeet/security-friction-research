package middleware

import (


	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

const SessionCookieName = "research_session_id"

func SessionMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// ตรวจสอบว่ามี Cookie ชื่อ research_session_id หรือไม่
		sessionID, err := c.Cookie(SessionCookieName)
		if err != nil || sessionID == "" {
			// ถ้าไม่มี ให้สร้าง Session ID ใหม่
			newSessionID := uuid.New().String()
			// ตั้งค่า Cookie ใน Response
			c.SetCookie(SessionCookieName, newSessionID, 3600*24, "/", "localhost", false, true) 
		}

		c.Set(SessionCookieName, sessionID)

		c.Next()
	}
}	