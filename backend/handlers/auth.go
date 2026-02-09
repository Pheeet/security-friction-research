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
	TimeTaken   int64  `json:"timeTaken"`
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

// 1. สำหรับ Login (ใช้แค่ User/Pass)
type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

// 2. สำหรับ Register (ต้องรับข้อมูลเยอะกว่า)
type RegisterRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
	FullName string `json:"fullname"` // เพิ่มเข้ามา
	Email    string `json:"email"`    // เพิ่มเข้ามา
}

// --- Handlers (ฟังก์ชันทำงาน) ---

// LoginHandler
func LoginHandler(c *gin.Context) {
	var creds LoginRequest

	// รับค่า JSON
	if err := c.ShouldBindJSON(&creds); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload"})
		return
	}

	// TODO: เชื่อมต่อ Database เพื่อตรวจสpheeet@Pheeet-Ubuntu:~/Codework/Research/security-friction-research$ git pull
	// ตัวอย่าง: if creds.Username == "admin" && creds.Password == "1234" { ... }

	c.JSON(http.StatusOK, gin.H{
		"message": "Login successful",
		"user":    creds.Username,
	})
}

// RegisterHandler
func RegisterHandler(c *gin.Context) {
	var req RegisterRequest

	// 1. รับค่า JSON
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ข้อมูลไม่ถูกต้อง (Invalid payload)"})
		return
	}

	// 2. Validation: ตรวจสอบข้อมูลเบื้องต้น
	if req.Username == "" || req.Password == "" || req.FullName == "" || req.Email == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "กรุณากรอกข้อมูลให้ครบทุกช่อง"})
		return
	}

	// 3. Validation: ตรวจสอบ Username ซ้ำ (Mockup Logic)
	// TODO: เขียน Query เช็คใน DB จริง
	if req.Username == "admin" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ชื่อผู้ใช้นี้ถูกใช้งานแล้ว (Username already exists)"})
		return
	}

	// 4. บันทึกลง Database
	// TODO: เขียน Query Insert ลง DB จริง

	// 5. ส่ง Response กลับเมื่อสำเร็จ
	c.JSON(http.StatusOK, gin.H{
		"message": "สมัครสมาชิกสำเร็จ! (Registration successful)",
	})
}
