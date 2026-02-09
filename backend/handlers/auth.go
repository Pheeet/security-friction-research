package handlers

import (
	"backend-api/database"
	"bytes"
	"encoding/base64"
	"net/http"
	"sync"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/steambap/captcha"
)

// ใช้ sync.Map เป็น key => value
// key = capchaId, value
var captchaStore sync.Map

// Struct สำหรับ รับ ข้อมูลจาก Frontend ตอนตรวจคำตอบ
type VerifyRequest struct {
	CaptchaID string `json:"captchaId"`
	Answer    string `json:"answer"` //base 64
	TimeTaken int64  `json:"timeTaken`
}

func GenerateCaptcha(c *gin.Context) {
	// รูปภาพขนาด กว้าง150px สูง 50px
	data, err := captcha.New(150, 50)
	if err != nil {
		c.JSON(500, gin.H{"error": "สร้าง Captch ไม่สำเร็จ"})
		return
	}

	//สร้าง ID ประจำตัว TOken
	realID := uuid.New().String()

	//เก็บลงเซฟ
	captchaStore.Store(realID, data.Text)

	var buf bytes.Buffer
	//เขียนรูปภาพลงใน buffer
	if err := data.WriteImage(&buf); err != nil {
		c.JSON(500, gin.H{"error": "แปลงรูปภาพไม่สำเร็จ"})
		return
	}

	//เก็บคำตอบลงใน memory map base 64
	imgBase64Str := base64.StdEncoding.EncodeToString(buf.Bytes())
	finalImageURL := "data:image/png;base64," + imgBase64Str

	//ส่ง JSON กลับไปหา frontend
	c.JSON(http.StatusOK, gin.H{
		"captchaId": realID,
		"image":     finalImageURL, //ส่ง test เฉยๆเดี๋ยวลบ
	})
}

func VerifyCaptcha(c *gin.Context) {
	var req VerifyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "Invalid request"})
		return
	}

	actualAnswer, ok := captchaStore.Load(req.CaptchaID)

	if !ok {
		c.JSON(400, gin.H{"success": false, "message": "ID ไม่ถูกต้องหรือหมดอายุ"})
	}

	isCorrect := (req.Answer == actualAnswer.(string))
	logEntry := database.ResearchLog{
		CaptchaID: req.CaptchaID,
		UserInput: req.Answer,
		IsCorrect: isCorrect,
		TimeTaken: req.TimeTaken,
	}
	database.DB.Create(&logEntry)

	if isCorrect {
		captchaStore.Delete(req.CaptchaID)
		c.JSON(200, gin.H{"success": true, "message": "Correct!"})
	} else {
		c.JSON(200, gin.H{"success": false, "message": "Incorrect!"})
	}
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

	// TODO: เชื่อมต่อ Database เพื่อตรวจสอบ Username/Password ตรงนี้
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
