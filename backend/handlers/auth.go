//handlers/auth.go
package handlers

import (
	"backend-api/database"
	"fmt"
	"net/http"
	"os"
	"strconv"
	"time"
	"unicode"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"gopkg.in/gomail.v2"
)

// ฟังก์ชันตรวจสอบความแข็งแกร่งรหัสผ่าน
func isPasswordStrong(pass string) bool {
	var (
		hasMinLen = false
		hasUpper  = false
		hasLower  = false
		hasNumber = false
	)
	if len(pass) >= 8 {
		hasMinLen = true
	}
	for _, char := range pass {
		switch {
		case unicode.IsUpper(char):
			hasUpper = true
		case unicode.IsLower(char):
			hasLower = true
		case unicode.IsNumber(char):
			hasNumber = true
		}
	}
	return hasMinLen && hasUpper && hasLower && hasNumber
}

// ฟังก์ชันช่วยส่งอีเมล
func sendEmailOTP(to string, otp string, refCode string) error {

	host := os.Getenv("SMTP_HOST")
	portStr := os.Getenv("SMTP_PORT")
	user := os.Getenv("SMTP_USER")
	pass := os.Getenv("SMTP_PASSWORD")

	port, _ := strconv.Atoi(portStr)

	m := gomail.NewMessage()
	m.SetHeader("From", user)
	m.SetHeader("To", to)
	m.SetHeader("Subject", fmt.Sprintf("Security Code: %s - Ref: %s", otp, refCode))

	body := fmt.Sprintf(`
		<h2>Your OTP Code</h2>
		<h1>%s</h1>
		<p>Reference Code: %s</p>
	`, otp, refCode)

	m.SetBody("text/html", body)

	d := gomail.NewDialer(host, port, user, pass)

	return d.DialAndSend(m)
}

// 1. สำหรับ Login (ใช้แค่ User/Pass)
type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
	TimeLogin int64  `json:"time_login"`
}

// 2. สำหรับ Register (ต้องรับข้อมูลเยอะกว่า)
type RegisterRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
	FullName string `json:"fullname"` // เพิ่มเข้ามา
	Email    string `json:"email"`    // เพิ่มเข้ามา
}

type TwoFAResponse struct {
	Message    string `json:"message"`
	Require2FA bool   `json:"require_2fa"`
	UserID     uint   `json:"user_id"`
	Method     string `json:"method"`   // email, push
	SessionID  string `json:"session_id"`
}

// RegisterHandler
func RegisterHandler(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ข้อมูลไม่ถูกต้อง"})
		return
	}

	if req.Username == "" || req.Password == "" || req.FullName == "" || req.Email == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "กรุณากรอกข้อมูลให้ครบทุกช่อง"})
		return
	}

	var existingUser database.User
	result := database.DB.Where("username = ? OR email = ?", req.Username, req.Email).First(&existingUser)
	if result.RowsAffected > 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ชื่อผู้ใช้หรืออีเมลนี้ถูกใช้งานแล้ว"})
		return
	}

	// --- Password check ---
	if !isPasswordStrong(req.Password) {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Password too weak",                                                                     // Error code สำหรับ Dev
			"message": "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร และประกอบด้วยตัวพิมพ์ใหญ่, ตัวพิมพ์เล็ก, และตัวเลข", // ข้อความสำหรับ User
		})
		return
	}

	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)

	newUser := database.User{
		Username: req.Username,
		Password: string(hashedPassword),
		FullName: req.FullName,
		Email:    req.Email,
		Provider: "local",
	}

	if err := database.DB.Create(&newUser).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ไม่สามารถบันทึกข้อมูลได้"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "สมัครสมาชิกสำเร็จ!"})
}

// LoginHandler (แก้ไข: เรียกใช้ sendEmailOTP)
func LoginHandler(c *gin.Context) {
	var creds LoginRequest
	if err := c.ShouldBindJSON(&creds); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid payload"})
		return
	}

	var user database.User
	if err := database.DB.Where("username = ?", creds.Username).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง"})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(creds.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง"})
		return
	}

	
	// [RESEARCH LOGIC] สร้าง SessionID และเริ่มบันทึก Journey
	sessionID := uuid.New().String()
	journey := database.ResearchJourney{
		UserID:       user.ID,
		SessionID:    sessionID,
		TimeLogin:    creds.TimeLogin, // บันทึกเวลาที่ใช้ในหน้า Login
		CurrentStage: "login_success",
	}
	database.DB.Create(&journey)

	// --- 2FA Logic ---
	method := "email"
	if user.Provider == "google" {
		method = "push"
	}
	user.TwoFACode = ""
	user.TwoFARef = ""
	user.IsPushApproved = false
	user.TwoFAExpiry = time.Time{}
	database.DB.Save(&user)

	c.JSON(http.StatusOK, TwoFAResponse{
		Message:    "Please complete security check",
		Require2FA: true,
		UserID:     user.ID,
		Method:     method,
		SessionID:  sessionID,
		// ไม่ต้องส่ง RefCode กลับไปตอนนี้ก็ได้ เพราะเดี๋ยว RequestOTPHandler จะสร้างให้ใหม่
	})
}

// --- เพิ่ม Handler ใหม่สำหรับตรวจ 2FA ---

type Verify2FARequest struct {
	UserID uint   `json:"user_id"`
	OTP    string `json:"otp"` // ใช้เฉพาะ Email OTP
	TimeTaken int64  `json:"time_taken"`
}

// รวม VerifyEmailOTP และ Verify2FAHandler เป็นอันเดียว
func Verify2FAHandler(c *gin.Context) {
	var req Verify2FARequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	var user database.User
	if err := database.DB.First(&user, req.UserID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	if req.OTP == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "กรุณากรอกรหัส OTP"})
		return
	}

	// ตรวจสอบ OTP
	if user.TwoFACode == req.OTP && time.Now().Before(user.TwoFAExpiry) {

		var journey database.ResearchJourney
		database.DB.Where("user_id = ? AND current_stage != ?", user.ID, "survey_completed").
			Order("created_at desc").First(&journey)

		if journey.ID != 0 {
			journey.Time2FA = req.TimeTaken
			journey.CurrentStage = "2fa_success"
			database.DB.Save(&journey)
		}
		
		// ผ่าน! ล้าง OTP ทิ้ง
		user.TwoFACode = ""
		user.TwoFAExpiry = time.Time{}
		database.DB.Save(&user)

		// 1. เตรียม Secret Key
		secret := os.Getenv("JWT_SECRET")
		if secret == "" {
			secret = "fallback-secret-for-dev"
		}

		// 2. สร้าง JWT Token อายุ 24 ชั่วโมง
		token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
			"user_id": user.ID,
			"exp":     time.Now().Add(time.Hour * 24).Unix(),
		})
		
		tokenString, err := token.SignedString([]byte(secret))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not generate token"})
			return
		}

		// 3. ตั้งค่า HttpOnly Cookie ระดับ Production
		// พารามิเตอร์: name, value, maxAge(วินาที), path, domain, secure(HTTPS), httpOnly
		// หมายเหตุ: secure ให้เป็น false ไปก่อนตอนทำบน localhost ถ้าขึ้นของจริงค่อยเปลี่ยนเป็น true
		c.SetCookie("auth_token", tokenString, 3600*24, "/", "localhost", false, true)

		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": "Login Success!",
			"user":    user.Username, 
		})
	} else {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "OTP ไม่ถูกต้องหรือหมดอายุแล้ว"})
	}
}

func CheckPushStatus(c *gin.Context) {
	userID := c.Query("user_id")
	var user database.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"status": "error", "message": "User not found"})
		return
	}

	if user.IsPushApproved {
		c.JSON(http.StatusOK, gin.H{"status": "approved", "success": true})
	} else {
		c.JSON(http.StatusOK, gin.H{"status": "pending"})
	}
}

func SimulatePushApprove(c *gin.Context) {
	userID := c.Query("user_id")
	var user database.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		c.String(404, "User not found")
		return
	}

	user.IsPushApproved = true
	database.DB.Save(&user)

	c.String(200, "Approved! You can close this window and check your main app.")
}
