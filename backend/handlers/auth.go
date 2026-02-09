package handlers

import (
	"backend-api/database"
	"net/http"
	"sync"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
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

	// 3. เช็คว่ามี User อยู่แล้วหรือไม่ (เช็คทั้ง Username และ Email)
	var existingUser database.User
	result := database.DB.Where("username = ? OR email = ?", req.Username, req.Email).First(&existingUser)

	if result.RowsAffected > 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ชื่อผู้ใช้หรืออีเมลนี้ถูกใช้งานแล้ว"})
		return
	}

	// 4. เข้ารหัสรหัสผ่าน (Hashing) **สำคัญมาก**
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "เกิดข้อผิดพลาดในการเข้ารหัสรหัสผ่าน"})
		return
	}

	// 5. สร้าง User struct เพื่อบันทึก
	newUser := database.User{
		Username: req.Username,
		Password: string(hashedPassword), // เก็บ Hash แทนรหัสจริง
		FullName: req.FullName,
		Email:    req.Email,
		Provider: "local", // ระบุว่าสมัครเอง ไม่ได้ผ่าน Google
	}

	// 6. บันทึกลง Database
	if err := database.DB.Create(&newUser).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ไม่สามารถบันทึกข้อมูลได้"})
		return
	}

	// 7. สำเร็จ
	c.JSON(http.StatusOK, gin.H{
		"message": "สมัครสมาชิกสำเร็จ! (Registration successful)",
	})
}

// LoginHandler
func LoginHandler(c *gin.Context) {
	var creds LoginRequest

	// 1. รับค่า JSON
	if err := c.ShouldBindJSON(&creds); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload"})
		return
	}

	// 2. ค้นหา User ใน Database
	var user database.User
	if err := database.DB.Where("username = ?", creds.Username).First(&user).Error; err != nil {
		// ถ้าไม่เจอ User
		c.JSON(http.StatusUnauthorized, gin.H{"error": "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง"})
		return
	}

	// 3. ตรวจสอบรหัสผ่าน (เอาที่กรอกมา เทียบกับ Hash ใน DB)
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(creds.Password)); err != nil {
		// ถ้ารหัสผิด
		c.JSON(http.StatusUnauthorized, gin.H{"error": "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง"})
		return
	}

	// 4. Login สำเร็จ
	// (ในอนาคตควรส่ง JWT Token ตรงนี้ แทนการส่งชื่อ User กลับไปเฉยๆ)
	c.JSON(http.StatusOK, gin.H{
		"message":  "Login successful",
		"user":     user.Username,
		"fullname": user.FullName,
	})
}
