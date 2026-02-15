package handlers

import (
	"backend-api/database"
	"fmt"
	"math/rand"
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"gopkg.in/gomail.v2"
)

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
	RefCode    string `json:"ref_code"` // AB12
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

	// --- 2FA Logic ---
	method := "email"
	if user.Provider == "google" {
		method = "push"
	}

	refCode := fmt.Sprintf("%04d", rand.Intn(10000))

	if method == "email" {
		otp := fmt.Sprintf("%06d", rand.Intn(1000000))
		user.TwoFACode = otp
		user.TwoFARef = refCode
		user.TwoFAExpiry = time.Now().Add(5 * time.Minute)

		// --- จุดที่เปลี่ยน: ส่งเมลจริงๆ ---
		fmt.Printf("Sending Email to %s...\n", user.Email) // Log บอกเฉยๆ

		// เรียกฟังก์ชันส่งเมล (ทำงานแบบ Go Routine เพื่อไม่ให้หน้าเว็บค้างนาน)
		go func(targetEmail, targetOTP, targetRef string) {
			err := sendEmailOTP(targetEmail, targetOTP, targetRef)
			if err != nil {
				fmt.Printf("Error sending email: %v\n", err)
			} else {
				fmt.Printf("Email sent successfully to %s\n", targetEmail)
			}
		}(user.Email, otp, refCode)
		// -----------------------------

	} else if method == "push" {
		user.IsPushApproved = false
		user.TwoFARef = refCode
		link := fmt.Sprintf("http://localhost:8080/api/2fa/simulate-push-approve?user_id=%d", user.ID)
		fmt.Printf("\n--- [PUSH NOTI MOCK] ---\nApprove Link: %s\n----------------------\n", link)
	}

	database.DB.Save(&user)

	c.JSON(http.StatusOK, TwoFAResponse{
		Message:    "Please verify 2FA",
		Require2FA: true,
		UserID:     user.ID,
		Method:     method,
		RefCode:    refCode,
	})
}

// --- เพิ่ม Handler ใหม่สำหรับตรวจ 2FA ---

type Verify2FARequest struct {
	UserID uint   `json:"user_id"`
	OTP    string `json:"otp"` // ใช้เฉพาะ Email OTP
}

// รวม VerifyEmailOTP และ Verify2FAHandler เป็นอันเดียว
func Verify2FAHandler(c *gin.Context) {
	var req struct {
		UserID uint   `json:"user_id"`
		OTP    string `json:"otp"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	var user database.User
	if err := database.DB.First(&user, req.UserID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// ตรวจสอบ OTP
	if user.TwoFACode == req.OTP && time.Now().Before(user.TwoFAExpiry) {
		// ผ่าน! ล้าง OTP ทิ้ง
		user.TwoFACode = ""
		database.DB.Save(&user)

		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": "Login Success!",
			"user":    user.Username, // ส่งกลับไปเผื่อ Frontend ใช้แสดงผล
		})
	} else {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid OTP"})
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
