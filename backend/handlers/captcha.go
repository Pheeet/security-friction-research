package handlers

import (
	"backend-api/database"
	"image/color"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/mojocn/base64Captcha"
)

// ใช้ Store เก็บคำตอบใน Memory
var Store = base64Captcha.DefaultMemStore

// ใช้ sync.Map เป็น key => value
// key = capchaId, value

// --- Structs ---

type VerifyRequest struct {
	CaptchaID   string `json:"captchaId"`
	CaptchaType string `json:"captchaType"`
	Answer      string `json:"answer"` //base 64
	TimeTaken   int64  `json:"timeTaken"`
}

func GenerateCaptcha(c *gin.Context) {
	// รับค่า type จาก URL (default = text)
	captchaType := c.DefaultQuery("type", "text")

	var driver base64Captcha.Driver

	if captchaType == "math" {
		// --- แบบ Math (สมการเลข) ---
		driver = base64Captcha.NewDriverMath(
			60,
			240,
			0,
			base64Captcha.OptionShowHollowLine,
			&color.RGBA{0, 0, 0, 0},
			nil,
			nil,
		)
	} else {
		// --- แบบ Text (ตัวอักษร) ---
		driver = base64Captcha.NewDriverString(
			60,
			240,
			0,
			base64Captcha.OptionShowHollowLine,
			4,
			"1234567890abcdefghjkmn",
			&color.RGBA{0, 0, 0, 0},
			nil,
			nil,
		)
	}

	// สร้าง Captcha
	cpt := base64Captcha.NewCaptcha(driver, Store)
	id, b64s, _, err := cpt.Generate()

	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to generate captcha"})
		return
	}

	// ส่งกลับ Frontend
	c.JSON(http.StatusOK, gin.H{
		"captchaId": id,
		"image":     b64s,
		"type":      captchaType,
	})
}

func VerifyCaptcha(c *gin.Context) {
	var req VerifyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "Invalid request"})
		return
	}
	sessionID, exists := c.Get("research_session_id")
	sessIDStr := "Unknown"
	if exists {
		sessIDStr = sessionID.(string)
	}

	// บันทึกลง Database True and false
	isCorrect := Store.Verify(req.CaptchaID, req.Answer, true)
	database.DB.Create(&database.ResearchLog{
		SessionID:   sessIDStr, // <--- บันทึกลง DB ตรงนี้
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
