package handlers

import (
	"backend-api/database"
	"sync"

	"github.com/gin-gonic/gin"
)

// ใช้ sync.Map เป็น key => value
// key = capchaId, value
var captchaStore sync.Map

// Struct สำหรับ รับ ข้อมูลจาก Frontend ตอนตรวจคำตอบ
type VerifyRequest struct {
	CaptchaID string `json:"captchaId"`
	CaptchaType string `json:"captchaType"`
	Answer  string `json:"answer"` //base 64
	TimeTaken int64 `json:"timeTaken`
}


func VerifyCaptcha(c *gin.Context){
	var req VerifyRequest
	if err := c.ShouldBindJSON(&req); err != nil{
		c.JSON(400, gin.H{"error": "Invalid request"})
		return
	}

	if !Store.Verify(req.CaptchaID, req.Answer, true) {
		
		// บันทึกว่าผิด
		database.DB.Create(&database.ResearchLog{
			CaptchaID:   req.CaptchaID,
			CaptchaType: req.CaptchaType,
			UserInput:   req.Answer,
			IsCorrect:   false,
			TimeTaken:   req.TimeTaken,
		})

		c.JSON(200, gin.H{"success": false, "message": "Incorrect!"})
		return
	}

	// บันทึกว่าถูก
	database.DB.Create(&database.ResearchLog{
		CaptchaID:   req.CaptchaID,
		CaptchaType: req.CaptchaType,
		UserInput:   req.Answer,
		IsCorrect:   true,
		TimeTaken:   req.TimeTaken,
	})

	c.JSON(200, gin.H{"success": true, "message": "Correct!"})
}