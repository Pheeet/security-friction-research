package middleware

import (


	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

const SessionCookieName = "research_session_id"

func SessionMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
        sessionID, err := c.Cookie(SessionCookieName)
        if err != nil || sessionID == "" {
            sessionID = uuid.New().String() // อัปเดตค่าลงตัวแปรเดิมเลย
            c.SetCookie(SessionCookieName, sessionID, 3600*24, "/", "localhost", false, true) 
        }

        c.Set(SessionCookieName, sessionID) //ทีนี้ค่าที่ส่งเข้า Context จะมี ID เสมอแล้วครับ
        c.Next()
    }
}	