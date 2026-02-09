package handlers

import (
	"backend-api/database"
	"net/http"
	"sync"

	"github.com/gin-gonic/gin"
)

// ใช้ sync.Map เป็น key => value
// key = capchaId, value
var captchaStore sync.Map

// Struct สำหรับ รับ ข้อมูลจาก Frontend ตอนตรวจคำตอบ
type VerifyRequest struct {
	CaptchaID   string `json:"captchaId"`
	CaptchaType string `json:"captchaType"`
	Answer      string `json:"answer"` //base 64
	TimeTaken   int64  `json:"timeTaken`
}

func VerifyCaptcha(c *gin.Context) {
	var req VerifyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "Invalid request"})
		return
	}
	sessionID, _ := c.Get("research_session_id")

	// บันทึกลง Database True and false
	isCorrect := Store.Verify(req.CaptchaID, req.Answer, true)
	database.DB.Create(&database.ResearchLog{
		SessionID:   sessionID.(string), // <--- บันทึกลง DB ตรงนี้
		CaptchaID:   req.CaptchaID,
		CaptchaType: req.CaptchaType,
		UserInput:   req.Answer,
		IsCorrect:   isCorrect,
		TimeTaken:   req.TimeTaken,
	})

	if !isCorrect {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "Incorrect!"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Correct!"})
}
